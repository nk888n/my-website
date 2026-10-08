import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {sendMail} from "../../../../lib/mailer";
import {business} from "../../../../lib/services";

export const dynamic = "force-dynamic";

const db=()=>createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {auth:{persistSession:false}}
);

function nextAnnualDate(dateValue, today){
  if(!dateValue)return null;
  const parsed=DateTime.fromISO(String(dateValue),{zone:business.timezone});
  if(!parsed.isValid)return null;
  let d=DateTime.fromObject({year:today.year,month:parsed.month,day:parsed.day},{zone:business.timezone});
  if(!d.isValid){
    // Handles Feb 29 in non-leap years by using Feb 28.
    d=DateTime.fromObject({year:today.year,month:parsed.month,day:Math.min(parsed.day,28)},{zone:business.timezone});
  }
  if(d<today.startOf("day"))d=d.plus({years:1});
  return d.startOf("day");
}

export async function GET(req){
  const auth=req.headers.get("authorization");
  const cronSecret=process.env.CRON_SECRET;
  if(!cronSecret || auth!==`Bearer ${cronSecret}`){
    return NextResponse.json({error:"Unauthorized"},{status:401});
  }

  try{
    const c=db();
    const today=DateTime.now().setZone(business.timezone).startOf("day");
    const horizon=today.plus({days:7});
    const {data:people,error}=await c
      .from("customer_profiles")
      .select("id,name,email,birthday,birthday_last_reminded_year,personal_event_name,personal_event_date,personal_event_last_reminded_year")
      .not("email","is",null)
      .order("name");
    if(error)throw error;

    const reminders=[];
    for(const p of people||[]){
      const birthday=nextAnnualDate(p.birthday,today);
      if(birthday && birthday>=today && birthday<=horizon && Number(p.birthday_last_reminded_year||0)!==birthday.year){
        reminders.push({
          customerId:p.id,
          name:p.name,
          email:p.email,
          type:"Birthday",
          label:"Birthday",
          date:birthday,
          year:birthday.year
        });
      }

      const event=nextAnnualDate(p.personal_event_date,today);
      if(p.personal_event_name && event && event>=today && event<=horizon && Number(p.personal_event_last_reminded_year||0)!==event.year){
        reminders.push({
          customerId:p.id,
          name:p.name,
          email:p.email,
          type:"Personal occasion",
          label:p.personal_event_name,
          date:event,
          year:event.year
        });
      }
    }

    if(!reminders.length){
      return NextResponse.json({sent:false,count:0,message:"No upcoming customer occasions."});
    }

    const rows=reminders.map(r=>{
      const days=Math.max(0,Math.round(r.date.diff(today,"days").days));
      return `<li style="margin:0 0 12px"><b>${escapeHtml(r.name)}</b> — ${escapeHtml(r.label)} on <b>${r.date.toFormat("MMMM d")}</b> (${days===0?"today":days===1?"tomorrow":`in ${days} days`}).<br/><span>Don’t forget to consider a special offer for her. ✨</span></li>`;
    }).join("");

    const subject=reminders.length===1
      ? `VALE BEAUTY — Upcoming Customer Occasion: ${reminders[0].name} ✨`
      : `VALE BEAUTY — ${reminders.length} Upcoming Customer Occasions ✨`;

    await sendMail({
      to:business.email,
      subject,
      html:`<div style="font-family:Arial,sans-serif;line-height:1.6"><h2>Upcoming Customer Occasions ✨</h2><p>These customer occasions are coming up within the next 7 days:</p><ul>${rows}</ul><p>Consider preparing a birthday/occasion offer for them. 🤍</p><p>VALE BEAUTY VK</p></div>`
    });

    for(const r of reminders){
      const field=r.type==="Birthday"?"birthday_last_reminded_year":"personal_event_last_reminded_year";
      const {error:updateError}=await c.from("customer_profiles").update({[field]:r.year,updated_at:new Date().toISOString()}).eq("id",r.customerId);
      if(updateError)console.error("OCCASION REMINDER MARK FAILED",r.customerId,updateError);
    }

    return NextResponse.json({sent:true,count:reminders.length});
  }catch(e){
    console.error("CUSTOMER OCCASION CRON FAILED",e);
    return NextResponse.json({error:"Could not send customer occasion reminders."},{status:500});
  }
}

function escapeHtml(v=""){
  return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
