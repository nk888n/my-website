import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {sendMail} from "../../../../lib/mailer";
import {business,allServices} from "../../../../lib/services";
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
  const customerIds=[...new Set(groups.flatMap(g=>g.customerIds))],c=db();
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
     for(const serviceId of r.serviceIds)rows.push({customer_id:person.id,email:person.email.toLowerCase(),kind:r.kind,value:r.value,starts_at:starts.toUTC().toISO(),expires_at:expires?expires.toUTC().toISO():null,max_uses:g.maxUses,uses:0,active:true,note:g.note||null,scope:"customer",service_ids:[serviceId],updated_at:new Date().toISOString()});
     rulesForEmail.push(r);
    }
    emailBlocks.push({starts,expires,rules:rulesForEmail});
   }
   const {error}=await c.from("customer_discounts").insert(rows);if(error)throw error;created+=rows.length;
   const blocks=emailBlocks.map(block=>{const dateText=`<p><b>Valid:</b> ${safe(block.starts.toFormat("MMM d, yyyy h:mm a"))} → ${block.expires?safe(block.expires.toFormat("MMM d, yyyy h:mm a")):"No end date"}</p>`;const rules=block.rules.map(r=>{const value=r.kind==="percent"?`${r.value}% off`:`$${r.value.toFixed(2)} off`;const names=r.serviceIds.map(id=>allServices.find(s=>s.id===id)?.name).filter(Boolean);return `<div style="margin:10px 0"><p><b>${safe(value)}</b> on:</p><ul>${names.map(name=>`<li>${safe(name)}</li>`).join("")}</ul></div>`}).join("");return `<div style="margin:16px 0;padding:10px 0;border-top:1px solid #eaded9">${rules}${dateText}${block.rules[0]&&block.rules[0].kind?`<p><b>Maximum uses:</b> ${groups.find(g=>g.rules.some(r=>r===block.rules[0]))?.maxUses||"No limit"}</p>`:""}</div>`}).join("");
   const site=String(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/+$/g,"");
   const html=`<h2>You Have Special Offers ✨</h2><p>Hi ${safe(person.name)},</p><p>We prepared these offers especially for you:</p>${blocks}<p>The correct discount is applied automatically when you book using this email address.</p><p><a href="${site}/services">Choose Your Service &amp; Book</a></p>`;
   if(body.notify!==false){try{await sendMail({to:person.email,subject:`Special Offers From ${business.name} ✨`,html});sent++}catch(error){failed++;console.error("GROUPED DISCOUNT EMAIL FAILED",person.email,error)}}
  }
  return NextResponse.json({message:`Discounts activated for ${people.length} customer${people.length===1?"":"s"}. ${created} discount${created===1?"":"s"} created. ${sent} email${sent===1?"":"s"} sent${failed?`; ${failed} email${failed===1?"":"s"} could not be sent`:""}.`});
 }catch(error){console.error(error);return NextResponse.json({error:"Could not activate grouped discounts."},{status:500})}
}
