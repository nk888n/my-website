import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {sendMail} from "../../../../lib/mailer";
import {business,allServices} from "../../../../lib/services";
import {buildDiscountMessage} from "../../../../lib/discountMessages";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
const safe=value=>String(value??"").replace(/[&<>\"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]||char));
function parseGroup(group){
 const rules=Array.isArray(group.rules)?group.rules.map(r=>({serviceIds:[...new Set((Array.isArray(r?.serviceIds)?r.serviceIds:[]).map(String).filter(Boolean))],kind:r?.kind==="fixed"?"fixed":"percent",value:Number(r?.value)})).filter(r=>r.serviceIds.length):[];
 if(!rules.length&&Array.isArray(group.serviceIds)&&group.serviceIds.length)rules.push({serviceIds:[...new Set(group.serviceIds.map(String).filter(Boolean))],kind:group.kind==="fixed"?"fixed":"percent",value:Number(group.value)});
 return {customerIds:[...new Set((Array.isArray(group.customerIds)?group.customerIds:[]).map(String).filter(Boolean))],rules,startsAt:group.startsAt||null,expiresAt:group.expiresAt||null,maxUses:group.maxUses===""||group.maxUses==null?null:Number(group.maxUses),note:String(group.note||"").trim()};
}
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const body=await req.json();
  const groups=Array.isArray(body.discountGroups)?body.discountGroups.map(parseGroup):[];
  if(!groups.length)return NextResponse.json({error:"Add at least one discount group."},{status:400});
  for(const g of groups){
   if(!g.customerIds.length||!g.rules.length)return NextResponse.json({error:"Each discount group needs at least one customer and one discount rule."},{status:400});
   if(g.maxUses!==null&&(!Number.isInteger(g.maxUses)||g.maxUses<1))return NextResponse.json({error:"Maximum uses must be a positive whole number."},{status:400});
   for(const r of g.rules){
    if(!Number.isFinite(r.value)||r.value<=0||(r.kind==="percent"&&r.value>100))return NextResponse.json({error:"Each discount needs a valid value."},{status:400});
    for(const id of r.serviceIds)if(!allServices.find(s=>s.id===id))return NextResponse.json({error:"One selected service was not found."},{status:400});
   }
   const duplicateServices=new Set();
   for(const r of g.rules)for(const id of r.serviceIds){if(duplicateServices.has(id))return NextResponse.json({error:"A service can only appear once within the same discount group."},{status:400});duplicateServices.add(id)}
  }
  const customerIds=[...new Set(groups.flatMap(g=>g.customerIds))],c=db();\n  const attachments=Array.isArray(body.attachments)?body.attachments.filter(a=>a&&a.content).slice(0,5):[];\n  if(attachments.some(a=>String(a.content).length>7_500_000))return NextResponse.json({error:"Each email attachment must be 5 MB or smaller."},{status:400});
  const {data:people,error:peopleError}=await c.from("customer_profiles").select("id,name,email").in("id",customerIds);if(peopleError)throw peopleError;
  if((people||[]).length!==customerIds.length)return NextResponse.json({error:"One selected customer profile could not be found."},{status:400});
  const personMap=new Map(people.map(p=>[p.id,p]));
  const groupsForCustomer=new Map(people.map(p=>[p.id,[]]));
  for(const g of groups)for(const id of g.customerIds)groupsForCustomer.get(id).push(g);
  let sent=0,failed=0,created=0;
  for(const person of people){
   const ownGroups=groupsForCustomer.get(person.id)||[];
   const rows=[];
   const emailBlocks=[];
   for(const g of ownGroups){
    const starts=g.startsAt?DateTime.fromISO(String(g.startsAt),{zone:business.timezone}):DateTime.now().setZone(business.timezone);
    const expires=g.expiresAt?DateTime.fromISO(String(g.expiresAt),{zone:business.timezone}):null;
    if(!starts.isValid||(expires&&!expires.isValid)||(expires&&expires<=starts))return NextResponse.json({error:`Choose valid dates for ${person.name}.`},{status:400});
    const rulesForEmail=[];
    for(const r of g.rules){
     for(const serviceId of r.serviceIds)rows.push({customer_id:person.id,email:person.email.toLowerCase(),kind:r.kind,value:r.value,starts_at:starts.toUTC().toISO(),expires_at:expires?expires.toUTC().toISO():null,max_uses:g.maxUses,uses:0,active:true,note:(body.occasion?("Occasion: "+String(body.occasion).trim()+(g.note?" — "+g.note:"")):(g.note||null)),scope:"customer",service_ids:[serviceId],updated_at:new Date().toISOString()});
     rulesForEmail.push(r);
    }
    emailBlocks.push({starts,expires,rules:rulesForEmail});
   }
   const {error}=await c.from("customer_discounts").insert(rows);if(error)throw error;created+=rows.length;
   const ownRules=ownGroups.flatMap(g=>g.rules||[]);
   const occasion=String(body.occasion||"").trim();
   const message=buildDiscountMessage({name:person.name,occasion,groups:ownRules,allServices,businessName:business.name,audience:"personal"});
   const site=String(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/+$/g,"");
   const registerLink=site+"/register?customerId="+encodeURIComponent(person.id)+"&email="+encodeURIComponent(person.email)+"&name="+encodeURIComponent(person.name);
   const html=(body.customHtml?String(body.customHtml):message.html)+'<p><a href="'+registerLink+'" style="display:inline-block;background:#ad6f7c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px">Connect My Profile &amp; View My Offers</a></p>';\n   const subject=String(body.customSubject||message.subject).trim()||message.subject;
   await c.from("admin_audit_log").insert({action:"add_customer_discount",entity_type:"customer_discount",entity_id:person.id,email:person.email,details:{customerId:person.id,customerName:person.name,groups:ownGroups.map(g=>({customerIds:g.customerIds,rules:g.rules,startsAt:g.startsAt,expiresAt:g.expiresAt,maxUses:g.maxUses,note:g.note})),createdCount:rows.length,notify:body.notify===true,occasion:occasion||null,occasionType:message.occasionType,messageSubject:subject,messageHtml:html,customMessage:!!body.customHtml,attachmentCount:attachments.length}}).then(({error})=>{if(error)console.error("DISCOUNT AUDIT FAILED",error)});
   if(body.notify===true){try{await sendMail({to:person.email,subject,html,attachments});sent++}catch(error){failed++;console.error("GROUPED DISCOUNT EMAIL FAILED",person.email,error)}}
  }
  return NextResponse.json({message:`Discounts activated for ${people.length} customer${people.length===1?"":"s"}. ${created} discount${created===1?"":"s"} created. ${sent} email${sent===1?"":"s"} sent${failed?`; ${failed} email${failed===1?"":"s"} could not be sent`:""}.`});
 }catch(error){console.error(error);return NextResponse.json({error:"Could not activate grouped discounts."},{status:500})}
}
