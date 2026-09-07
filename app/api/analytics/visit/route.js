import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});

export async function POST(req){
  try{
    const existing=req.cookies.get("vale_visitor_id")?.value;
    const visitorId=existing||crypto.randomUUID();
    const c=db();
    const {error}=await c.from("site_visitors").upsert({visitor_id:visitorId,last_seen:new Date().toISOString()},{onConflict:"visitor_id",ignoreDuplicates:false});
    if(error)throw error;
    const res=NextResponse.json({ok:true});
    if(!existing)res.cookies.set("vale_visitor_id",visitorId,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*365});
    return res;
  }catch(e){
    console.error("VISITOR TRACKING FAILED",e);
    return NextResponse.json({ok:false},{status:500});
  }
}
