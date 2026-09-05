import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import crypto from "crypto";
const BUCKET="customer-files";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
const safeName=(v="file")=>String(v).replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120)||"file";
export async function GET(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{const url=new URL(req.url),customerId=url.searchParams.get("customerId"),bookingId=url.searchParams.get("bookingId");if(!customerId)return NextResponse.json({error:"Customer is required."},{status:400});
  let q=db().from("customer_files").select("id,customer_id,booking_id,file_path,file_name,mime_type,size_bytes,note,created_at").eq("customer_id",customerId).order("created_at",{ascending:false});if(bookingId)q=q.eq("booking_id",bookingId);else q=q.is("booking_id",null);
  const {data,error}=await q;if(error)throw error;const rows=data||[];const withUrls=await Promise.all(rows.map(async f=>{if(!f.file_path)return {...f,url:null};const {data:u}=await db().storage.from(BUCKET).createSignedUrl(f.file_path,3600);return {...f,url:u?.signedUrl||null}}));return NextResponse.json({files:withUrls});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not load files."},{status:500})}
}
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 let path=null;
 try{const form=await req.formData(),customerId=String(form.get("customerId")||"").trim(),bookingId=String(form.get("bookingId")||"").trim()||null,note=String(form.get("note")||"").trim(),file=form.get("file");if(!customerId)return NextResponse.json({error:"Customer is required."},{status:400});if(!file&&!note)return NextResponse.json({error:"Add a file or a note."},{status:400});
  let meta={customer_id:customerId,booking_id:bookingId,note:note||null,file_path:null,file_name:null,mime_type:null,size_bytes:null};
  if(file&&typeof file.arrayBuffer==="function"&&Number(file.size)>0){if(Number(file.size)>10*1024*1024)return NextResponse.json({error:"File must be 10 MB or smaller."},{status:400});const name=safeName(file.name||"file"),pathPrefix=`customers/${customerId}/bookings/${bookingId||"general"}`,path=`${pathPrefix}/${crypto.randomUUID()}-${name}`;const bytes=Buffer.from(await file.arrayBuffer());const {error:up}=await db().storage.from(BUCKET).upload(path,bytes,{contentType:file.type||"application/octet-stream",upsert:false});if(up)throw up;meta={...meta,file_path:path,file_name:file.name||name,mime_type:file.type||"application/octet-stream",size_bytes:Number(file.size)};}
  const {data,rowError}=await db().from("customer_files").insert(meta).select("id,customer_id,booking_id,file_path,file_name,mime_type,size_bytes,note,created_at").single();if(rowError)throw rowError;return NextResponse.json({file:data,message:file?"File added.":"Note added."});
 }catch(e){if(path)await db().storage.from(BUCKET).remove([path]);console.error(e);return NextResponse.json({error:"Could not save the file or note."},{status:500})}
}
export async function DELETE(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{const body=await req.json(),id=String(body.id||"").trim();if(!id)return NextResponse.json({error:"File not found."},{status:400});const client=db(),{data:f,error}=await client.from("customer_files").select("id,file_path").eq("id",id).maybeSingle();if(error)throw error;if(!f)return NextResponse.json({error:"File not found."},{status:404});if(f.file_path){const {error:se}=await client.storage.from(BUCKET).remove([f.file_path]);if(se)throw se;}const {error:de}=await client.from("customer_files").delete().eq("id",id);if(de)throw de;return NextResponse.json({message:"File deleted."});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not delete the file."},{status:500})}
}
