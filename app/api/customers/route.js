import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const clean=v=>String(v||"").trim();
export async function GET(req){
 try{
  const p=new URL(req.url).searchParams;
  const email=clean(p.get("email")).toLowerCase();
  const name=clean(p.get("name"));
  const q=clean(p.get("q"));
  if(!email&&!name&&!q)return NextResponse.json({customers:[]});
  const c=db();
  let query=c.from("customer_profiles").select("id,name,email").order("name",{ascending:true}).limit(30);
  if(email)query=query.ilike("email",email);
  else if(name)query=query.ilike("name",`${name}%`);
  else {const term=q.replace(/[,()]/g,"");query=query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);}
  const {data,error}=await query;
  if(error){if(error.code==="42P01")return NextResponse.json({customers:[]});throw error}
  return NextResponse.json({customers:data||[]});
 }catch(e){console.error(e);return NextResponse.json({error:"Customer lookup failed."},{status:500})}
}
