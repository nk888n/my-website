import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const authorized=req=>!!process.env.ADMIN_PIN&&req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const {data,error}=await db().from("beauty_offer_rotation").select("*").eq("singleton",true).maybeSingle();
  if(error)throw error;
  return NextResponse.json({schedule:data||null});
 }catch(e){console.error("ADMIN OFFER ROTATION GET",e);return NextResponse.json({error:"Unable to load rotation schedule."},{status:500})}
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const body=await req.json();
  const starts=new Date(body.starts_at),ends=new Date(body.ends_at);
  if(!Number.isFinite(starts.getTime())||!Number.isFinite(ends.getTime())||ends<=starts)throw new Error("Choose a valid rotation start and end date/time.");
  if(!Array.isArray(body.slots)||!body.slots.length)throw new Error("Add at least one offer rotation period.");
  const slots=body.slots.map((slot,index)=>{
   const offer_id=String(slot.offer_id||"");
   const duration_minutes=Math.floor(Number(slot.duration_minutes));
   if(!offer_id)throw new Error(`Choose an offer for period ${index+1}.`);
   if(!Number.isInteger(duration_minutes)||duration_minutes<1||duration_minutes>10080)throw new Error(`Period ${index+1} must be between 1 minute and 7 days.`);
   return {offer_id,duration_minutes};
  });
  const ids=[...new Set(slots.map(s=>s.offer_id))];
  const {data:offers,error:offerError}=await db().from("beauty_offers").select("id").in("id",ids);
  if(offerError)throw offerError;
  const found=new Set((offers||[]).map(o=>o.id));
  if(ids.some(id=>!found.has(id)))throw new Error("One or more selected offers no longer exist. Refresh and choose again.");
  const value={singleton:true,starts_at:starts.toISOString(),ends_at:ends.toISOString(),slots,is_enabled:body.is_enabled===true,updated_at:new Date().toISOString()};
  const {data,error}=await db().from("beauty_offer_rotation").upsert(value,{onConflict:"singleton"}).select("*").single();
  if(error)throw error;
  return NextResponse.json({schedule:data,message:"Rotation schedule saved."});
 }catch(e){console.error("ADMIN OFFER ROTATION SAVE",e);return NextResponse.json({error:e.message||"Unable to save rotation schedule."},{status:400})}
}
