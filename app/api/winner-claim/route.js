import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {business,allServices} from "../../../lib/services";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function GET(req){try{const email=String(new URL(req.url).searchParams.get("email")||"").trim().toLowerCase();if(!email||!email.includes("@"))return NextResponse.json({customers:[]});const c=db(),{data:profiles,error}=await c.from("customer_profiles").select("id,name,email").ilike("email",email).order("name");if(error)throw error;const now=DateTime.now().setZone(business.timezone),out=[];for(const p of profiles||[]){const {data:winners,error:we}=await c.from("winners").select("id,service_id,service_ids,reward_service_ids,reward_type,reward_value,prize_type,prize_value,expires_at,max_uses,uses,active,starts_at").eq("customer_id",p.id).eq("active",true).lte("starts_at",now.toUTC().toISO());if(we)throw we;const rewards=(winners||[]).filter(w=>(!w.expires_at||DateTime.fromISO(w.expires_at)>now)&&(!w.max_uses||Number(w.uses||0)<Number(w.max_uses))).map(w=>{const type=w.prize_type||w.reward_type||"free_service";const ids=Array.isArray(w.reward_service_ids)&&w.reward_service_ids.length?w.reward_service_ids:Array.isArray(w.service_ids)?w.service_ids:[w.service_id];const names=ids.map(id=>allServices.find(s=>s.id===id)?.name).filter(Boolean);return{id:w.id,type,value:w.prize_value??w.reward_value,services:[...new Set(names)]}});if(rewards.length)out.push({id:p.id,name:p.name,email:p.email,rewards})}return NextResponse.json({customers:out})}catch(e){console.error(e);return NextResponse.json({error:"Winner profile lookup failed."},{status:500})}}


export async function POST(req){
 try{
  const body=await req.json();
  const customerId=String(body.customerId||"").trim(), email=String(body.email||"").trim().toLowerCase(), name=String(body.name||"").trim();
  if(!customerId||!email||!name)return NextResponse.json({error:"Winner profile details are required."},{status:400});
  const dbClient=db();
  const {data:profile,error:pe}=await dbClient.from("customer_profiles").select("id,name,email").eq("id",customerId).maybeSingle();
  if(pe)throw pe;
  if(!profile||String(profile.email||"").toLowerCase()!==email||String(profile.name||"").trim().toLowerCase()!==name.toLowerCase())return NextResponse.json({error:"Winner profile could not be verified."},{status:403});
  const now=DateTime.now().setZone(business.timezone);
  const {data:winners,error:we}=await dbClient.from("winners").select("id,service_id,prize_name,prize_type,reward_type,prize_value,reward_value,discount_id,expires_at,max_uses,uses,active,starts_at").eq("customer_id",customerId).eq("active",true).lte("starts_at",now.toUTC().toISO());
  if(we)throw we;
  const active=(winners||[]).filter(w=>(!w.expires_at||DateTime.fromISO(w.expires_at)>now)&&(!w.max_uses||Number(w.uses||0)<Number(w.max_uses)));
  if(!active.length)return NextResponse.json({error:"No active winner prize was found for this profile."},{status:404});
  await dbClient.from("admin_audit_log").insert({action:"winner_claimed",entity_type:"winner",entity_id:active[0].id,email,details:{customerId,name,winnerIds:active.map(w=>w.id),prizes:active.map(w=>({id:w.id,prizeName:w.prize_name,prizeType:w.prize_type||w.reward_type,serviceId:w.service_id,discountId:w.discount_id,value:w.prize_value??w.reward_value}))}});
  return NextResponse.json({ok:true,customer:{id:profile.id,name:profile.name,email:profile.email},winnerIds:active.map(w=>w.id)});
 }catch(e){console.error(e);return NextResponse.json({error:"Winner claim could not be recorded."},{status:500})}
}
