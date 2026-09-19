import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {business,allServices} from "../../../lib/services";

const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});

export async function GET(req){
  try{
    const p=new URL(req.url).searchParams;
    const customerId=String(p.get("customerId")||"").trim();
    const email=String(p.get("email")||"").trim().toLowerCase();
    if(!customerId||!email)return NextResponse.json({rewards:[]});
    const c=db();
    const {data:profile,error:pe}=await c.from("customer_profiles").select("id,name,email").eq("id",customerId).maybeSingle();
    if(pe)throw pe;
    if(!profile||String(profile.email||"").toLowerCase()!==email)return NextResponse.json({rewards:[]});
    const now=DateTime.now().setZone(business.timezone);
    const {data,error}=await c.from("winners").select("id,prize_name,service_id,prize_type,prize_value,reward_type,reward_value,starts_at,expires_at,max_uses,uses,active").eq("customer_id",customerId).eq("active",true).lte("starts_at",now.toUTC().toISO()).order("created_at",{ascending:false});
    if(error)throw error;
    const rewards=(data||[]).filter(w=>(!w.expires_at||DateTime.fromISO(w.expires_at)>now)&&(!w.max_uses||Number(w.uses||0)<Number(w.max_uses))).map(w=>({...w,service:allServices.find(s=>s.id===w.service_id)||null})).filter(w=>w.service);
    return NextResponse.json({customer:{id:profile.id,name:profile.name,email:profile.email},rewards});
  }catch(e){console.error(e);return NextResponse.json({rewards:[]})}
}
