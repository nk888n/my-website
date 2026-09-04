import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const clean=v=>String(v||"").trim();
export async function GET(req){
 try{const url=new URL(req.url),email=clean(url.searchParams.get("email")).toLowerCase(),name=clean(url.searchParams.get("name")).toLowerCase();if(!email&&!name)return NextResponse.json({customers:[]});let q=db().from("customer_profiles").select("id,name,email").order("name",{ascending:true}).limit(20);q=email?q.ilike("email",email):q.ilike("name",`${name}%`);const {data,error}=await q;if(error){if(error.code==="42P01")return NextResponse.json({customers:[]});throw error}return NextResponse.json({customers:data||[]})}catch(e){console.error(e);return NextResponse.json({error:"Customer lookup failed."},{status:500})}
}
