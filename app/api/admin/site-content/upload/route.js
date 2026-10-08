import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import crypto from "crypto";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
const safe=v=>String(v||"file").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120)||"file";
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const form=await req.formData(),file=form.get("file");
  if(!file||typeof file.arrayBuffer!=="function")return NextResponse.json({error:"Choose a file."},{status:400});
  if(Number(file.size)>25*1024*1024)return NextResponse.json({error:"File must be 25 MB or smaller."},{status:400});
  const type=String(file.type||"");
  if(!type.startsWith("image/")&&!type.startsWith("video/"))return NextResponse.json({error:"Only image and video files are supported."},{status:400});
  const path=`editor/${crypto.randomUUID()}-${safe(file.name)}`;
  const {error}=await db().storage.from("site-assets").upload(path,Buffer.from(await file.arrayBuffer()),{contentType:type,upsert:false});
  if(error)throw error;
  const {data}=db().storage.from("site-assets").getPublicUrl(path);
  return NextResponse.json({url:data.publicUrl,name:file.name,type});
 }catch(e){
  console.error("SITE ASSET UPLOAD FAILED",e);
  return NextResponse.json({error:"Could not upload this file."},{status:500});
 }
}