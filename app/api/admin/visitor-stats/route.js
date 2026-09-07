import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {business} from "../../../../lib/services";

const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;

export async function GET(req){
  if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
  try{
    const c=db(),startOfToday=DateTime.now().setZone(business.timezone).startOf("day").toUTC().toISO();
    const [{count,error},{count:today,error:todayError}]=await Promise.all([
      c.from("site_visitors").select("id",{count:"exact",head:true}),
      c.from("site_visitors").select("id",{count:"exact",head:true}).gte("first_seen",startOfToday)
    ]);
    if(error)throw error;
    if(todayError)throw todayError;
    return NextResponse.json({visitors:count||0,today:today||0});
  }catch(e){
    console.error("VISITOR STATS FAILED",e);
    return NextResponse.json({error:"Visitor statistics unavailable."},{status:500});
  }
}
