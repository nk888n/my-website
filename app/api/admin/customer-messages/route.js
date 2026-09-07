import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;

export async function GET(req){
  if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
  try{
    const {searchParams}=new URL(req.url),email=String(searchParams.get("email")||"").trim().toLowerCase();
    if(!email)return NextResponse.json({messages:[]});
    const c=db(),{data,error}=await c.from("message_log").select("id,subject,body,recipients,sent_count,created_at").order("created_at",{ascending:false}).limit(500);
    if(error)throw error;
    const messages=(data||[]).filter(m=>{
      const recipients=Array.isArray(m.recipients)?m.recipients:[];
      return recipients.some(r=>{
        if(typeof r==="string")return r.trim().toLowerCase()===email;
        return String(r?.email||r?.recipient||"").trim().toLowerCase()===email;
      });
    }).map(m=>({id:m.id,subject:m.subject,body:m.body,created_at:m.created_at,recipient:email,status:"sent",sent_count:m.sent_count}));
    return NextResponse.json({messages});
  }catch(e){
    console.error("CUSTOMER MESSAGE HISTORY FAILED",e);
    return NextResponse.json({error:"Could not load message history."},{status:500});
  }
}
