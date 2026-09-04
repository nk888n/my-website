import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {DateTime} from "luxon";
import {sendMail} from "../../../lib/mailer";
import {business} from "../../../lib/services";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ok=req=>req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
const safe=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function audit(c,action,entity_type,entity_id,email,details={}){await c.from("admin_audit_log").insert({action,entity_type,entity_id:String(entity_id||""),email:email||null,details});}
function customersFrom(profiles,bookings,fees,discounts){
 const m=new Map();
 for(const p of profiles||[]) m.set(p.id,{id:p.id,name:p.name,email:p.email,phone:p.phone||"",address:p.address||"",internal_notes:p.internal_notes||"",bookings:0,attended:0,noShows:0,lateCancels:0,totalSpent:0,outstanding:0,fees:[],discounts:[],history:[]});
 for(const b of bookings){
  const key=b.customer_id||`legacy:${b.email}:${b.name}`; const x=m.get(key)||{id:null,name:b.name,email:b.email,phone:"",address:"",internal_notes:"",bookings:0,attended:0,noShows:0,lateCancels:0,totalSpent:0,outstanding:0,fees:[],discounts:[],history:[]};
  x.bookings++; if(b.status==="attended")x.attended++; if(b.status==="no_show")x.noShows++; if(b.status==="late_cancel")x.lateCancels++; if(["confirmed","attended"].includes(b.status))x.totalSpent+=Number(b.total_price||0); x.history.push(b); m.set(key,x);
 }
 for(const f of fees){const key=f.customer_id||`legacy:${f.email}`;const x=m.get(key)||{id:f.customer_id||null,name:f.email,email:f.email,phone:"",address:"",internal_notes:"",bookings:0,attended:0,noShows:0,lateCancels:0,totalSpent:0,outstanding:0,fees:[],discounts:[],history:[]};x.fees.push(f);if(f.status==="outstanding")x.outstanding+=Number(f.amount||0);m.set(key,x)}
 for(const d of discounts){const key=d.customer_id||`legacy:${d.email}`;const x=m.get(key)||{id:d.customer_id||null,name:d.email,email:d.email,phone:"",address:"",internal_notes:"",bookings:0,attended:0,noShows:0,lateCancels:0,totalSpent:0,outstanding:0,fees:[],discounts:[],history:[]};x.discounts.push(d);if(!x.discount||d.active)x.discount=d;m.set(key,x)}
 return [...m.values()].sort((a,b)=>b.bookings-a.bookings||a.name.localeCompare(b.name));
}
export async function GET(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{const c=db();
  const [pr,br,fr,cr,dr,er,wr,mr,ar]=await Promise.all([
   c.from("customer_profiles").select("id,name,email,phone,address,internal_notes,created_at,updated_at").order("name",{ascending:true}),
   c.from("bookings").select("id,customer_id,date,start_minutes,name,email,notes,duration_minutes,total_price,subtotal_price,discount_amount,status,created_at,updated_at,items,start_at,blocked_end_at").order("date",{ascending:true}).order("start_minutes",{ascending:true}),
   c.from("fees").select("id,email,booking_id,amount,reason,status,created_at"),
   c.from("customer_fees").select("id,customer_id,email,booking_id,amount,reason,status,admin_note,created_at,resolved_at"),
   c.from("customer_discounts").select("id,customer_id,email,kind,value,starts_at,expires_at,max_uses,uses,active,note,created_at").order("created_at",{ascending:false}),
   c.from("availability_exceptions").select("id,start_at,end_at,kind,reason,created_at").order("start_at",{ascending:true}),
   c.from("waitlist").select("id,name,email,date,preferred_start_minutes,duration_minutes,notes,status,created_at").order("date",{ascending:true}),
   c.from("message_log").select("id,subject,sent_count,created_at").order("created_at",{ascending:false}).limit(30),
   c.from("admin_audit_log").select("id,action,entity_type,entity_id,email,details,created_at").order("created_at",{ascending:false}).limit(100)
  ]);
  const err=[pr,br,fr,cr,dr,er,wr,mr,ar].find(x=>x.error&&x.error.code!=="42P01");if(err)throw err.error;
  const profiles=pr.data||[],bookings=br.data||[],fees=[...(fr.data||[]),...(cr.data||[])],discounts=dr.data||[];
  const today=DateTime.now().setZone(business.timezone).toISODate(),todayBookings=bookings.filter(b=>b.date===today),customers=customersFrom(profiles,bookings,fees,discounts);
  const stats={today:todayBookings.filter(b=>b.status==="confirmed").length,upcoming:bookings.filter(b=>b.status==="confirmed"&&b.date>=today).length,attended:bookings.filter(b=>b.status==="attended").length,noShows:bookings.filter(b=>b.status==="no_show").length,outstanding:fees.filter(f=>f.status==="outstanding").reduce((s,f)=>s+Number(f.amount),0),customers:customers.filter(c=>c.id).length};
  for(const b of bookings){b.has_fee=fees.some(f=>f.booking_id===b.id);}
  return NextResponse.json({bookings,fees,discounts,exceptions:er.data||[],waitlist:wr.data||[],messages:mr.data||[],audit:ar.data||[],customers,stats});
 }catch(e){console.error(e);return NextResponse.json({error:"Database error. Run the admin Supabase migration first."},{status:500})}
}
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{const body=await req.json();const action=String(body.action||"");const c=db();
  if(action==="profile_update"){
   const id=String(body.customerId||"").trim();if(!id)return NextResponse.json({error:"Customer profile not found."},{status:400});
   const updates={};for(const k of ["name","email","phone","address","internal_notes"]){if(body[k]!==undefined)updates[k]=String(body[k]??"").trim();}if(updates.email)updates.email=updates.email.toLowerCase();updates.updated_at=new Date().toISOString();
   const {data:p,error}=await c.from("customer_profiles").update(updates).eq("id",id).select().single();if(error)throw error;
   if(updates.name||updates.email){await c.from("bookings").update({name:updates.name||p.name,email:updates.email||p.email}).eq("customer_id",id);await c.from("customer_fees").update({email:updates.email||p.email}).eq("customer_id",id);await c.from("customer_discounts").update({email:updates.email||p.email}).eq("customer_id",id)}
   await audit(c,"update_customer_profile","customer",id,p.email,updates);return NextResponse.json({message:"Customer profile updated."});
  }
  if(action==="profile_delete"){
   const id=String(body.customerId||"").trim();const {data:p,error}=await c.from("customer_profiles").select("*").eq("id",id).maybeSingle();if(error)throw error;if(!p)return NextResponse.json({error:"Customer profile not found."},{status:404});
   const {error:de}=await c.from("customer_profiles").delete().eq("id",id);if(de)throw de;await audit(c,"delete_customer_profile","customer",id,p.email,{name:p.name});return NextResponse.json({message:`Customer profile ${p.name} was deleted. Historical bookings were preserved.`});
  }
  if(action==="attended"||action==="no_show"||action==="late_cancel"||action==="cancel"){
   const id=String(body.id||"");const {data:b,error}=await c.from("bookings").select("*").eq("id",id).maybeSingle();if(error)throw error;if(!b)return NextResponse.json({error:"Booking not found."},{status:404});
   if(action==="attended"){await c.from("bookings").update({status:"attended",updated_at:new Date().toISOString()}).eq("id",id);await audit(c,"mark_attended","booking",id,b.email,{});return NextResponse.json({message:"Appointment marked as attended."});}
   if(action==="cancel"){await c.from("bookings").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",id);await audit(c,"cancel_booking","booking",id,b.email,{reason:body.reason||"Admin cancellation"});if(body.notify!==false){await sendMail({to:b.email,subject:`Appointment Cancelled — ${business.name}`,html:`<h2>Your Appointment Has Been Cancelled</h2><p>Hi ${safe(b.name)},</p><p>Your appointment on <b>${safe(b.date)}</b> at <b>${safe(body.startLabel||String(b.start_minutes))}</b> has been cancelled by the studio.</p><p>${safe(body.reason||"Please contact the studio if you have questions.")}</p><p>${business.email}<br>${business.phone}</p>`});}return NextResponse.json({message:"Appointment cancelled."});}
   const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Enter a valid fee amount."},{status:400});const status=action==="no_show"?"no_show":"late_cancel",reason=action==="no_show"?"No-show":"Late cancellation";
   await c.from("bookings").update({status,updated_at:new Date().toISOString()}).eq("id",id);
   const {error:fe}=await c.from("customer_fees").insert({customer_id:b.customer_id||null,email:b.email,booking_id:id,amount,reason,admin_note:body.note||null,status:"outstanding"});if(fe)throw fe;await audit(c,action,"booking",id,b.email,{amount,reason,note:body.note||null});return NextResponse.json({message:`${reason} recorded and $${amount.toFixed(2)} fee added.`});
  }
  if(action==="fee"){
   const email=String(body.email||"").trim().toLowerCase(),customerId=String(body.customerId||"").trim()||null,amount=Number(body.amount),reason=String(body.reason||"Admin fee");if(!customerId||!email||!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Choose a customer and enter a valid fee."},{status:400});
   const {error}=await c.from("customer_fees").insert({customer_id:customerId,email,booking_id:body.bookingId||null,amount,reason,admin_note:body.note||null,status:"outstanding"});if(error)throw error;await audit(c,"add_fee","customer",customerId,email,{amount,reason,notify:body.notify===true});
   if(body.notify===true)await sendMail({to:email,subject:`Account Fee Notice — ${business.name}`,html:`<h2>Account Fee Notice</h2><p>Hi ${safe(body.customerName||"there")},</p><p>A fee of <b>$${amount.toFixed(2)}</b> has been added to your account.</p><p><b>Reason:</b> ${safe(reason)}</p><p>Please contact ${business.name} if you have questions.</p><p>${business.email}<br>${business.phone}</p>`});
   return NextResponse.json({message:body.notify===true?"Fee added and customer notified.":"Fee added."});
  }
  if(action==="mark_paid"||action==="waive_fee"){
   const id=String(body.feeId||"");const status=action==="mark_paid"?"paid":"waived";const {data:f,error}=await c.from("customer_fees").select("*").eq("id",id).maybeSingle();if(error)throw error;if(!f)return NextResponse.json({error:"Fee not found."},{status:404});
   await c.from("customer_fees").update({status,resolved_at:new Date().toISOString(),admin_note:body.note||f.admin_note}).eq("id",id);await audit(c,action,"fee",id,f.email,{amount:f.amount,note:body.note||null});return NextResponse.json({message:status==="waived"?"Fee waived and recorded in the history.":"Fee marked as paid."});
  }
  if(action==="discount"){
   const email=String(body.email||"").trim().toLowerCase(),customerId=String(body.customerId||"").trim()||null,kind=body.kind==="fixed"?"fixed":"percent",value=Number(body.value);if(!customerId||!email||!Number.isFinite(value)||value<=0)return NextResponse.json({error:"Choose a customer and enter discount value."},{status:400});
   const row={customer_id:customerId,email,kind,value,starts_at:body.startsAt?new Date(body.startsAt).toISOString():new Date().toISOString(),expires_at:body.expiresAt?new Date(body.expiresAt).toISOString():null,max_uses:body.maxUses?Number(body.maxUses):null,note:body.note||null,active:true};const {data:d,error}=await c.from("customer_discounts").insert(row).select().single();if(error)throw error;
   await audit(c,"add_discount","customer_discount",d.id,email,row);if(body.notify!==false){const valueText=kind==="percent"?`${value}%`:`$${value.toFixed(2)}`;await sendMail({to:email,subject:`A Special Offer From ${business.name} ✨`,html:`<h2>You Have a Special Offer ✨</h2><p>Hi ${safe(body.customerName||"there")},</p><p><b>${safe(valueText)} off</b> is now available for your next appointment at ${business.name}.</p><p>Your discount will be applied automatically when you book using this email address.</p>${row.expires_at?`<p>Valid until ${safe(new Date(row.expires_at).toLocaleDateString())}.`:""}<p>When you book, your confirmation will show the price before and after your discount.</p>`});}
   return NextResponse.json({message:"Discount activated and customer notified."});
  }
  if(action==="discount_toggle"){const id=String(body.id||"");const {data:d}=await c.from("customer_discounts").select("*").eq("id",id).maybeSingle();if(!d)return NextResponse.json({error:"Discount not found."},{status:404});await c.from("customer_discounts").update({active:!d.active}).eq("id",id);await audit(c,"toggle_discount","customer_discount",id,d.email,{active:!d.active});return NextResponse.json({message:!d.active?"Discount activated.":"Discount deactivated."});}
  if(action==="block"){const start=DateTime.fromISO(String(body.start),{zone:business.timezone}),end=DateTime.fromISO(String(body.end),{zone:business.timezone});if(!start.isValid||!end.isValid||end<=start)return NextResponse.json({error:"Choose a valid start and end time."},{status:400});const {data:overlap}=await c.from("bookings").select("id,name,email,date,start_minutes,duration_minutes,status").eq("status","confirmed").lt("start_at",end.toUTC().toISO()).gt("blocked_end_at",start.toUTC().toISO());if(overlap?.length)return NextResponse.json({error:`This block overlaps ${overlap.length} existing confirmed appointment(s). Reschedule/cancel them first.`},{status:409});const {data:x,error}=await c.from("availability_exceptions").insert({start_at:start.toUTC().toISO(),end_at:end.toUTC().toISO(),kind:body.kind||"custom",reason:body.reason||null}).select().single();if(error)throw error;await audit(c,"block_availability","exception",x.id,null,{start:x.start_at,end:x.end_at,kind:x.kind,reason:x.reason});return NextResponse.json({message:"Availability blocked.",exception:x});}
  if(action==="unblock"){const id=String(body.id||"");await c.from("availability_exceptions").delete().eq("id",id);await audit(c,"unblock_availability","exception",id,null,{});return NextResponse.json({message:"Availability block removed."});}
  if(action==="message"){const recipients=Array.isArray(body.recipients)?body.recipients.map(x=>String(x).trim().toLowerCase()).filter(Boolean):[];const subject=String(body.subject||"").trim(),text=String(body.message||"").trim();if(!recipients.length||!subject||!text)return NextResponse.json({error:"Choose recipients and enter a subject and message."},{status:400});let sent=0;for(const email of recipients){try{await sendMail({to:email,subject,html:`<div style="font-family:Arial,sans-serif"><h2>${safe(subject)}</h2><p>${safe(text).replace(/\n/g,"<br>")}</p><p>${business.name}<br>${business.email}<br>${business.phone}</p></div>`});sent++;}catch(e){console.error(e)}}const {data:m,error}=await c.from("message_log").insert({subject,body:text,recipients,sent_count:sent}).select().single();if(error)throw error;await audit(c,"send_message","message",m.id,null,{sentCount:sent,recipients});return NextResponse.json({message:`Message sent to ${sent} of ${recipients.length} selected customers.`});}
  return NextResponse.json({error:"Unsupported action."},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:"Admin action failed. Check that the admin Supabase migration has been run."},{status:500})}
}
