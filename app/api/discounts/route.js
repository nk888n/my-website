import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {business} from "../../../lib/services";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
export async function GET(req){try{const c=db(),now=DateTime.now().setZone(business.timezone).toUTC().toISO();const {data,error}=await c.from("customer_discounts").select("id,kind,value,starts_at,expires_at,max_uses,uses,active,service_ids,scope").eq("scope","service").eq("active",true).lte("starts_at",now);if(error&&error.code!=="42P01")throw error;const rows=(data||[]).filter(d=>(!d.expires_at||DateTime.fromISO(d.expires_at)>DateTime.fromISO(now))&&(!d.max_uses||Number(d.uses||0)<Number(d.max_uses)));return NextResponse.json({discounts:rows})}catch(e){console.error(e);return NextResponse.json({discounts:[]})}}
