import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

export const dynamic="force-dynamic";

export async function GET(){
  try{
    const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
    const {data,error}=await db.from("site_editor_content").select("content,updated_at").eq("id","global").maybeSingle();
    if(error)throw error;
    return NextResponse.json({content:data?.content||{},updatedAt:data?.updated_at||null});
  }catch(e){
    console.error("SITE CONTENT PUBLIC GET FAILED",e);
    return NextResponse.json({content:{},updatedAt:null},{status:200});
  }
}