import { NextResponse } from "next/server";
import crypto from "crypto";
import { DateTime } from "luxon";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { business, findService, findAddon } from "../../../lib/services";

const OPEN_MINUTES = 480;
const CLOSE_MINUTES = 1140;
const SLOT_MINUTES = 30;
const BUFFER_MINUTES = 30;

const db = () =>
  createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

function mins(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + m;
}

function slotAvailability(blocked, duration, date) {
  const now = DateTime.now().setZone(business.timezone);
  const out = [];

  for (
    let start = OPEN_MINUTES;
    start + duration + BUFFER_MINUTES <= CLOSE_MINUTES;
    start += SLOT_MINUTES
  ) {
    const startAt = DateTime.fromISO(
      `${date}T${String(Math.floor(start / 60)).padStart(2, "0")}:${String(
        start % 60
      ).padStart(2, "0")}`,
      { zone: business.timezone }
    );

    if (startAt <= now) continue;

    const endWithBuffer = start + duration + BUFFER_MINUTES;

    const conflict = blocked.some(
      (b) => start < b.end_minutes && endWithBuffer > b.start_minutes
    );

    if (!conflict) {
      out.push(
        `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(
          start % 60
        ).padStart(2, "0")}`
      );
    }
  }

  return out;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const duration = Number(searchParams.get("duration") || 0);

    if (!date || !duration) {
      return NextResponse.json(
        { error: "Date and duration are required." },
        { status: 400 }
      );
    }

    const client = db();

    const { data: bookings, error } = await client
      .from("bookings")
      .select("start_minutes,duration_minutes")
      .eq("date", date);

    if (error) throw error;

    const blocked = (bookings || []).map((b) => ({
      start_minutes: Number(b.start_minutes),
      end_minutes:
        Number(b.start_minutes) +
        Number(b.duration_minutes) +
        BUFFER_MINUTES,
    }));

    return NextResponse.json({
      date,
      duration,
      available: slotAvailability(blocked, duration, date),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not load availability." },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const b = await req.json();

    if (
      !b.name?.trim() ||
      !b.email?.trim() ||
      !b.date ||
      !b.start ||
      !b.duration ||
      (!b.facial && !b.body && !b.eyebrow)
    ) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 }
      );
    }

    const start = mins(b.start);

    const selectedIds = [
      b.facial,
      b.body,
      b.eyebrow ? "eyebrow-threading" : null,
    ].filter(Boolean);

    const services = selectedIds.map(findService).filter(Boolean);

    if (services.length !== selectedIds.length) {
      return NextResponse.json(
        { error: "One of the selected services is invalid." },
        { status: 400 }
      );
    }

    const duration = services.reduce((sum, s) => sum + s.duration, 0);

    const fa = (b.fa || [])
      .map(findAddon)
      .filter(Boolean)
      .filter((a) => facialAddonIds().includes(a.id));

    const ba = (b.ba || [])
      .map(findAddon)
      .filter(Boolean)
      .filter((a) => bodyAddonIds().includes(a.id));

    const total =
      services.reduce((sum, s) => sum + s.price, 0) +
      fa.reduce((sum, a) => sum + a.price, 0) +
      ba.reduce((sum, a) => sum + a.price, 0);

    if (
      start < OPEN_MINUTES ||
      start + duration + BUFFER_MINUTES > CLOSE_MINUTES ||
      start % SLOT_MINUTES !== 0
    ) {
      return NextResponse.json(
        { error: "Please choose one of the available appointment times." },
        { status: 400 }
      );
    }

    const local = DateTime.fromISO(`${b.date}T${b.start}`, {
      zone: business.timezone,
    });

    if (!local.isValid || local <= DateTime.now().setZone(business.timezone)) {
      return NextResponse.json(
        { error: "Please choose a future appointment time." },
        { status: 400 }
      );
    }

    const end = local.plus({ minutes: duration });
    const blocked = end.plus({ minutes: BUFFER_MINUTES });

    const client = db();

    const { data: fees } = await client
      .from("fees")
      .select("amount")
      .eq("status", "outstanding")
      .ilike("email", b.email.trim());

    if (fees?.length) {
      return NextResponse.json(
        {
          error: `There is an outstanding late-cancellation fee of $${fees
            .reduce((x, f) => x + Number(f.amount), 0)
            .toFixed(2)} on this email. Please contact the studio.`,
        },
        { status: 409 }
      );
    }

    const token = crypto.randomBytes(24).toString("hex");
    const hash = crypto.createHash("sha256").update(token).digest("hex");

    const items = [...services, ...fa, ...ba].map((s) => ({
      name: s.name,
      price: s.price,
      duration: s.duration || 0,
    }));

    const row = {
      name: b.name.trim(),
      email: b.email.trim().toLowerCase(),
      notes: b.notes?.trim() || null,
      items,
      service_ids: {
        facial: b.facial || null,
        facialAddons: fa.map((x) => x.id),
        body: b.body || null,
        bodyAddons: ba.map((x) => x.id),
        eyebrow: !!b.eyebrow,
      },
      date: b.date,
      start_minutes: start,
      duration_minutes: duration,
      total_price: Number(total.toFixed(2)),
      manage_token_hash: hash,
      start_at: local.toUTC().toISO(),
      blocked_end_at: blocked.toUTC().toISO(),
    };

    const { error } = await client.from("bookings").insert(row);

    if (error) {
      if (error.code === "23P01") {
        return NextResponse.json(
          {
            error:
              "That time was just booked by someone else. Please choose another time.",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    const manageUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    }/manage/${token}`;

    const html = `
      <h2>Your Appointment Is Confirmed ✨</h2>

      <p>Hi ${escapeHtml(b.name.trim())},</p>

      <p>
        <b>${business.name}</b><br>
        ${b.date}<br>
        ${b.start} – ${end.toFormat("hh:mm a")}<br>
        ${duration} minutes<br>
        Total: $${total.toFixed(2)}
      </p>

      <p>
        ${items
          .map(
            (i) =>
              `${escapeHtml(i.name)} — $${Number(i.price).toFixed(2)}`
          )
          .join("<br>")}
      </p>

      ${
        b.notes?.trim()
          ? `<p>Notes: ${escapeHtml(b.notes.trim())}</p>`
          : ""
      }

      <hr>

      <h3>Cancellation / Appointment Change Policy</h3>

      <p>
        You must notify us at least 24 hours before your appointment
        to cancel or change it without a late-notice fee.
      </p>

      <p>
        <a href="${manageUrl}" style="color:#2879c7">
          Cancellation / Appointment Change
        </a>
      </p>

      <p>
        ${business.email}<br>
        ${business.phone}<br>
        ${business.address}
      </p>
    `;

    const owner = `
      <h2>New Appointment — ${business.name}</h2>

      <p>
        Customer: ${escapeHtml(b.name.trim())}<br>
        Email: ${escapeHtml(b.email.trim())}<br>
        Date: ${b.date}<br>
        Time: ${b.start}<br>
        Duration: ${duration} min<br>
        Total: $${total.toFixed(2)}
      </p>

      <p>
        ${items
          .map(
            (i) =>
              `${escapeHtml(i.name)} — $${Number(i.price).toFixed(2)}`
          )
          .join("<br>")}
      </p>

      <p>
        Notes: ${escapeHtml(b.notes?.trim() || "")}
      </p>
    `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await Promise.all([
      transporter.sendMail({
        from: `"VALE BEAUTY VK" <${process.env.GMAIL_USER}>`,
        to: b.email.trim().toLowerCase(),
        subject: `Appointment Confirmed — ${business.name}`,
        html,
      }),

      transporter.sendMail({
        from: `"VALE BEAUTY VK" <${process.env.GMAIL_USER}>`,
        to: process.env.GMAIL_USER,
        subject: `New Appointment — ${business.name}`,
        html: owner,
      }),
    ]);

    return NextResponse.json({
      message:
        "Please check your email for your appointment confirmation and booking details.",
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        error:
          "Your booking was saved, but we couldn't send the confirmation email. Please contact the studio.",
      },
      { status: 502 }
    );
  }
}

function facialAddonIds() {
  return [
    "dermaplaning-addon",
    "led-therapy",
    "high-frequency-full",
    "ice-globe-massage",
    "hot-stone-facial-massage",
    "ultrasonic-deep-infusion",
    "extended-face-neck-massage",
  ];
}

function bodyAddonIds() {
  return [
    "hot-stone-enhancement",
    "scalp-massage",
    "dry-brushing",
    "exfoliation-boost",
    "aromatherapy",
    "moisture-boost",
  ];
}

function escapeHtml(v) {
  return String(v).replace(
    /[&<>\"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}
