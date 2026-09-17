import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { sendMail } from "../../../../lib/mailer";
import { business, allServices } from "../../../../lib/services";

const db = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = req => req.headers.get("x-admin-pin") === process.env.ADMIN_PIN;
const safe = value => String(value ?? "").replace(/[&<>\"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char] || char));

export async function POST(req) {
  if (!ok(req)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const body = await req.json();
    const customerIds = [...new Set((Array.isArray(body.customerIds) ? body.customerIds : []).map(String).filter(Boolean))];
    const groups = Array.isArray(body.discountGroups) ? body.discountGroups : [];
    if (!customerIds.length || !groups.length) return NextResponse.json({ error: "Choose at least one customer and at least one discount." }, { status: 400 });

    const seen = new Set();
    const cleanGroups = groups.map(group => ({
      serviceIds: [...new Set((Array.isArray(group.serviceIds) ? group.serviceIds : []).map(String).filter(Boolean))],
      kind: group.kind === "fixed" ? "fixed" : "percent",
      value: Number(group.value)
    })).filter(group => group.serviceIds.length);

    for (const group of cleanGroups) {
      if (!Number.isFinite(group.value) || group.value <= 0 || (group.kind === "percent" && group.value > 100)) {
        return NextResponse.json({ error: "Each discount needs a valid value." }, { status: 400 });
      }
      for (const serviceId of group.serviceIds) {
        if (seen.has(serviceId)) return NextResponse.json({ error: "A service can only appear in one discount rule." }, { status: 400 });
        seen.add(serviceId);
        if (!allServices.find(service => service.id === serviceId)) return NextResponse.json({ error: "One selected service was not found." }, { status: 400 });
      }
    }
    if (!cleanGroups.length) return NextResponse.json({ error: "Add at least one service discount." }, { status: 400 });

    const c = db();
    const { data: people, error: peopleError } = await c.from("customer_profiles").select("id,name,email").in("id", customerIds);
    if (peopleError) throw peopleError;
    if ((people || []).length !== customerIds.length) return NextResponse.json({ error: "One selected customer profile could not be found." }, { status: 400 });

    const starts = body.startsAt ? DateTime.fromISO(String(body.startsAt), { zone: business.timezone }) : DateTime.now().setZone(business.timezone);
    const expires = body.expiresAt ? DateTime.fromISO(String(body.expiresAt), { zone: business.timezone }) : null;
    if (!starts.isValid || (expires && !expires.isValid) || (expires && expires <= starts)) return NextResponse.json({ error: "Choose valid discount dates." }, { status: 400 });

    const maxUses = body.maxUses ? Number(body.maxUses) : null;
    if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) return NextResponse.json({ error: "Maximum uses must be a positive whole number." }, { status: 400 });

    let sent = 0;
    let failed = 0;
    for (const person of people) {
      const rows = cleanGroups.map(group => ({
        customer_id: person.id,
        email: person.email.toLowerCase(),
        kind: group.kind,
        value: group.value,
        starts_at: starts.toUTC().toISO(),
        expires_at: expires ? expires.toUTC().toISO() : null,
        max_uses: maxUses,
        uses: 0,
        active: true,
        note: body.note || null,
        scope: "customer",
        service_ids: group.serviceIds,
        updated_at: new Date().toISOString()
      }));
      const { error } = await c.from("customer_discounts").insert(rows);
      if (error) throw error;

      const blocks = cleanGroups.map(group => {
        const names = group.serviceIds.map(id => allServices.find(service => service.id === id)?.name).filter(Boolean);
        const value = group.kind === "percent" ? `${group.value}% off` : `$${group.value.toFixed(2)} off`;
        return `<div style="margin:12px 0"><p><b>${safe(value)}</b> on:</p><ul>${names.map(name => `<li>${safe(name)}</li>`).join("")}</ul></div>`;
      }).join("");

      const site = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/g, "");
      const html = `<h2>You Have Special Offers ✨</h2><p>Hi ${safe(person.name)},</p><p>We prepared these offers especially for you:</p>${blocks}<p>The correct discount is applied automatically when you book using this email address.</p><p><a href="${site}/services">Choose Your Service &amp; Book</a></p>`;

      if (body.notify !== false) {
        try {
          await sendMail({ to: person.email, subject: `Special Offers From ${business.name} ✨`, html });
          sent++;
        } catch (error) {
          failed++;
          console.error("GROUPED DISCOUNT EMAIL FAILED", person.email, error);
        }
      }
    }

    return NextResponse.json({ message: `Discounts activated for ${people.length} customer${people.length === 1 ? "" : "s"}. ${sent} email${sent === 1 ? "" : "s"} sent${failed ? `; ${failed} email${failed === 1 ? "" : "s"} could not be sent` : ""}.` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not activate grouped discounts." }, { status: 500 });
  }
}
