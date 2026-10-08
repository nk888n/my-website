import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";

const db=()=>createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {auth:{persistSession:false}}
);

export async function GET(){
  try{
    const {data,error}=await db().from("site_editor_content").select("content,updated_at").eq("id","global").maybeSingle();
    if(error)throw error;
    return NextResponse.json({content:data?.content||{},updatedAt:data?.updated_at||null});
  }catch(e){
    console.error("SITE CONTENT GET FAILED",e);
    return NextResponse.json({content:{},updatedAt:null});
  }
}

export async function POST(req){
  if(req.headers.get("x-admin-pin")!==process.env.ADMIN_PIN)
    return NextResponse.json({error:"Access denied"},{status:403});
  try{
    const body=await req.json();
    const content=body?.content;
    if(!content||typeof content!=="object"||Array.isArray(content))
      return NextResponse.json({error:"Invalid site content."},{status:400});
    const {error}=await db().from("site_editor_content").upsert({
      id:"global",
      content,
      updated_at:new Date().toISOString()
    },{onConflict:"id"});
    if(error)throw error;
    return NextResponse.json({message:"Website changes saved.",content});
  }catch(e){
    console.error("SITE CONTENT SAVE FAILED",e);
    return NextResponse.json({error:"Unable to save website changes."},{status:500});
  }
}