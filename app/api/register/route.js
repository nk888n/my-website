import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {sendMail} from "../../../lib/mailer";
import {business} from "../../../lib/services";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const clean=v=>String(v||"").trim();
const siteUrl=()=>String(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/+$/g,"");
const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function POST(req){
  try{
    const b=await req.json(),name=clean(b.name),email=clean(b.email).toLowerCase(),customerId=clean(b.customerId);
    if(name.length<2||!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Please enter your full name and a valid email."},{status:400});
    const c=db();
    if(customerId){
      const {data:invited,error:ie}=await c.from("customer_profiles").select("id,name,email,phone,address,internal_notes").eq("id",customerId).maybeSingle();
      if(ie)throw ie;
      if(!invited||String(invited.email||"").trim().toLowerCase()!==email||String(invited.name||"").trim().toLowerCase()!==name.toLowerCase())
        return NextResponse.json({error:"This offer link does not match the customer profile."},{status:400});
      return NextResponse.json({ok:true,customer:invited,message:"Your VALE BEAUTY profile is connected to your special offers."});
    }
    const {data:matches,error:me}=await c.from("customer_profiles").select("id,name,email,phone,address,internal_notes").ilike("email",email).order("name");
    if(me)throw me;
    const exact=(matches||[]).find(p=>p.name.trim().toLowerCase()===name.toLowerCase());
    if(exact)return NextResponse.json({ok:true,customer:exact,message:"Your VALE BEAUTY profile is ready."});
    const {data:customer,error}=await c.from("customer_profiles").insert({name,email}).select("id,name,email,phone,address,internal_notes").single();
    if(error)throw error;
    const base=siteUrl();
    const welcomeHtml=`<h2>Welcome to VALE BEAUTY VK, ${esc(customer.name)} ✨</h2><p>We’re so happy to have you with us.</p><p>Your profile is now connected to your email, so any offers, gifts or winner rewards we assign to you can be used when you book.</p><p><a href="${base}/services" style="display:inline-block;background:#ad6f7c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px">Explore Our Services</a></p><p><a href="${base}/booking" style="display:inline-block;background:#f3e7e2;color:#6d4650;text-decoration:none;padding:10px 18px;border-radius:4px">Book an Appointment</a></p><hr><p><b>VALE BEAUTY VK</b><br>${esc(business.address)}<br>${esc(business.phone)}<br><a href="mailto:${esc(business.email)}">${esc(business.email)}</a><br><a href="${base}">Visit our website</a></p>`;
    try{await sendMail({to:customer.email,subject:"Welcome to VALE BEAUTY VK ✨",html:welcomeHtml});}
    catch(mailError){console.error("WELCOME EMAIL FAILED:",mailError);}
    return NextResponse.json({ok:true,customer,message:"Welcome to VALE BEAUTY ✨"});
  }catch(e){console.error(e);return NextResponse.json({error:"We couldn't create your profile right now. Please try again."},{status:500})}
}
