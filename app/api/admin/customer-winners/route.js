import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {allServices} from "../../../../lib/services";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
export async function GET(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const customerId=String(new URL(req.url).searchParams.get("customerId")||"").trim();
  if(!customerId)return NextResponse.json({winners:[]});
  const c=db();
  const {data,error}=await c.from("winners").select("id,customer_id,service_id,starts_at,expires_at,max_uses,uses,active,created_at,updated_at,prize_name").eq("customer_id",customerId).order("created_at",{ascending:false});
  if(error)throw error;
  const winners=(data||[]).map(w=>({...w,service:allServices.find(s=>s.id===w.service_id)||null}));
  return NextResponse.json({winners});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not load customer winner history."},{status:500})}
}
