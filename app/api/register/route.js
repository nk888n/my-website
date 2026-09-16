import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const clean=v=>String(v||"").trim();
export async function POST(req){
  try{
    const b=await req.json(),name=clean(b.name),email=clean(b.email).toLowerCase();
    if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Please enter your full name and a valid email."},{status:400});
    const c=db();
    const {data:matches,error:me}=await c.from("customer_profiles").select("id,name,email,phone,address,internal_notes").ilike("email",email).order("name");
    if(me)throw me;
    const exact=(matches||[]).find(p=>p.name.trim().toLowerCase()===name.toLowerCase());
    if(exact)return NextResponse.json({ok:true,customer:exact,message:"Your VALE BEAUTY profile is ready."});
    const {data:customer,error}=await c.from("customer_profiles").insert({name,email}).select("id,name,email,phone,address,internal_notes").single();
    if(error)throw error;
    return NextResponse.json({ok:true,customer,message:"Your VALE BEAUTY profile is ready."});
  }catch(e){console.error(e);return NextResponse.json({error:"We couldn't create your profile right now. Please try again."},{status:500})}
}
