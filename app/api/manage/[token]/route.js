import {NextResponse} from "next/server";
import crypto from "crypto";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {Resend} from "resend";
import {business,findService,findAddon} from "../../../../lib/services";
const OPEN=480, CLOSE=1140, BUFFER=30;
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const hashToken=t=>crypto.createHash("sha256").update(t).digest("hex");
function available(blocked,duration,date,ignoreId){const out=[];const now=DateTime.now().setZone(business.timezone);for(let start=OPEN;start+duration+BUFFER<=CLOSE;start+=30){const startAt=DateTime.fromISO(`${date}T${String(Math.floor(start/60)).padStart(2,"0")}:${String(start%60).padStart(2,"0")}`,{zone:business.timezone});if(startAt<=now)continue;const end=start+duration+BUFFER;if(!blocked.filter(b=>b.id!==ignoreId).every(b=>start>=Number(b.start_minutes)+Number(b.duration_minutes)+BUFFER || start+duration+BUFFER<=Number(b.start_minutes)))continue;out.push(`${String(Math.floor(start/60)).padStart(2,"0")}:${String(start%60).padStart(2,"0")}`)}return out}
function details(b){const ids=b.service_ids||{};const services=[ids.facial,ids.body,ids.eyebrow?"eyebrow-threading":null].filter(Boolean).map(findService).filter(Boolean);const addons=[...(ids.facialAddons||[]),...(ids.bodyAddons||[])].map(findAddon).filter(Boolean);return [...services,...addons].map(s=>({name:s.name,price:s.price,duration:s.duration||0}))}
export async function POST(req,{params}){
 try{
  const {token}=await params;const body=await req.json();const email=String(body.email||"").trim().toLowerCase();
  const c=db();const {data:b,error}=await c.from("bookings").select("*").eq("manage_token_hash",hashToken(token)).ilike("email",email).maybeSingle();
  if(error)throw error;if(!b)return NextResponse.json({error:"We could not verify this booking."},{status:403});
  const start=DateTime.fromISO(b.start_at).setZone(business.timezone);const hoursLeft=start.diffNow("hours").hours;
  if(body.action==="verify")return NextResponse.json({booking:{id:b.id,name:b.name,email:b.email,date:b.date,start:`${String(Math.floor(b.start_minutes/60)).padStart(2,"0")}:${String(b.start_minutes%60).padStart(2,"0")}`,duration:b.duration_minutes,total:b.total_price,items:details(b)},canChange:hoursLeft>=24});
  if(hoursLeft<24)return NextResponse.json({error:"The 24-hour change/cancellation window has passed. A late-notice fee may apply."},{status:409});
  if(body.action==="cancel"){
    const {error:e}=await c.from("bookings").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",b.id);if(e)throw e;
    return NextResponse.json({message:"Your appointment has been cancelled."});
  }
  if(body.action==="reschedule"){
    const date=String(body.date||"");const newStart=String(body.start||"");const m=/^(\d{2}):(\d{2})$/.exec(newStart);const startMinutes=m?Number(m[1])*60+Number(m[2]):-1;
    if(!date||startMinutes<OPEN||startMinutes%30!==0||startMinutes+Number(b.duration_minutes)+BUFFER>CLOSE)return NextResponse.json({error:"Please choose an available date and time."},{status:400});
    const local=DateTime.fromISO(`${date}T${newStart}`,{zone:business.timezone});if(!local.isValid||local<=DateTime.now().setZone(business.timezone))return NextResponse.json({error:"Please choose a future appointment time."},{status:400});
    const {data:others,error:oe}=await c.from("bookings").select("id,start_minutes,duration_minutes").eq("date",date).eq("status","confirmed");if(oe)throw oe;
    const conflict=(others||[]).filter(x=>x.id!==b.id).some(x=>startMinutes<Number(x.start_minutes)+Number(x.duration_minutes)+BUFFER && startMinutes+Number(b.duration_minutes)+BUFFER>Number(x.start_minutes));
    if(conflict)return NextResponse.json({error:"That time is no longer available. Please choose another time."},{status:409});
    const newEnd=local.plus({minutes:Number(b.duration_minutes)});const blockedEnd=newEnd.plus({minutes:BUFFER});
    const {error:ue}=await c.from("bookings").update({date,start_minutes:startMinutes,start_at:local.toUTC().toISO(),blocked_end_at:blockedEnd.toUTC().toISO(),status:"confirmed",updated_at:new Date().toISOString()}).eq("id",b.id);if(ue)throw ue;
    const manageUrl=`${process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000"}/manage/${token}`;const resend=new Resend(process.env.RESEND_API_KEY);const html=`<h2>Your Appointment Has Been Updated ✨</h2><p>Hi ${b.name},</p><p><b>${business.name}</b><br>${date}<br>${newStart} – ${newEnd.toFormat("hh:mm a")}<br>${b.duration_minutes} minutes<br>Total: $${Number(b.total_price).toFixed(2)}</p><p><a href="${manageUrl}" style="color:#2879c7">Cancellation / Appointment Change</a></p><p>${business.email}<br>${business.phone}</p>`;await resend.emails.send({from:process.env.RESEND_FROM_EMAIL||"onboarding@resend.dev",to:b.email,subject:`Appointment Updated — ${business.name}`,html});return NextResponse.json({message:"Your appointment has been changed and the updated details were sent to your email."});
  }
  return NextResponse.json({error:"Unsupported action."},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:"Unable to manage this appointment right now."},{status:500})}
}
