import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const b=await req.json(),id=String(b.customerId||"").trim(),email=String(b.email||"").trim().toLowerCase(),name=String(b.name||"").trim();
  if(!email||!name)return NextResponse.json({error:"Name and email are required."},{status:400});
  const c=db();let p=null;
  if(id){const r=await c.from("customer_profiles").select("*").eq("id",id).maybeSingle();if(r.error)throw r.error;p=r.data}
  if(!p){const r=await c.from("customer_profiles").select("*").eq("email",email).limit(1).maybeSingle();if(r.error)throw r.error;p=r.data}
  const values={name,email,phone:String(b.phone||"").trim()||null,address:String(b.address||"").trim()||null,internal_notes:String(b.internal_notes||"").trim()||null,updated_at:new Date().toISOString()};
  if(p){const r=await c.from("customer_profiles").update(values).eq("id",p.id).select().single();if(r.error)throw r.error;p=r.data}
  else{const r=await c.from("customer_profiles").insert(values).select().single();if(r.error)throw r.error;p=r.data}
  await c.from("bookings").update({name:p.name,email:p.email}).eq("customer_id",p.id);
  await c.from("customer_fees").update({email:p.email}).eq("customer_id",p.id);
  await c.from("customer_discounts").update({email:p.email}).eq("customer_id",p.id);
  await c.from("admin_audit_log").insert({action:"save_customer_profile",entity_type:"customer",entity_id:p.id,email:p.email,details:{name:p.name}});
  return NextResponse.json({profile:p,message:"Profile saved."});
 }catch(e){console.error(e);return NextResponse.json({error:"Could not save customer profile."},{status:500})}
}
