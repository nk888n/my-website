import nodemailer from "nodemailer";
import {createClient} from "@supabase/supabase-js";
import {business,allServices} from "./services";

export function mailer(){
  if(!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error("Gmail SMTP is not configured.");
  return nodemailer.createTransport({
    host:"smtp.gmail.com",
    port:465,
    secure:true,
    auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}
  });
}

const siteUrl=()=>String(process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/+$/g,"");
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const esc=v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function addContactFooter(html){
  const base=siteUrl(),parts=[];
  if(!String(html).includes(business.name))parts.push(`<b>${esc(business.name)}</b>`);
  if(!String(html).includes(business.address))parts.push(esc(business.address));
  if(!String(html).includes(business.phone))parts.push(esc(business.phone));
  if(!String(html).includes(business.email))parts.push(`<a href="mailto:${esc(business.email)}">${esc(business.email)}</a>`);
  if(!String(html).includes(base))parts.push(`<a href="${esc(base)}">Visit our website</a>`);
  if(!parts.length)return html;
  return `${html}<hr><p>${parts.join("<br>")}</p>`;
}

function dateTimeLabel(value){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:business.timezone,
    year:"numeric",
    month:"long",
    day:"numeric",
    hour:"numeric",
    minute:"2-digit",
    hour12:true
  }).format(d);
}

function dateLabel(value){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:business.timezone,
    year:"numeric",
    month:"long",
    day:"numeric"
  }).format(d);
}

function timeLabel(value){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:business.timezone,
    hour:"numeric",
    minute:"2-digit",
    hour12:true
  }).format(d);
}

function discountWindow(row){
  const start=row?.starts_at,end=row?.expires_at;
  if(!start&&!end)return "";
  if(start&&end){
    const sd=dateLabel(start),ed=dateLabel(end),st=timeLabel(start),et=timeLabel(end);
    if(sd===ed)return `<p><b>Valid:</b> ${esc(sd)} from ${esc(st)} to ${esc(et)}.</p>`;
    return `<p><b>Valid:</b> ${esc(sd)} at ${esc(st)} through ${esc(ed)} at ${esc(et)}.</p>`;
  }
  if(start)return `<p><b>Starts:</b> ${esc(dateTimeLabel(start))}.</p>`;
  return `<p><b>Ends:</b> ${esc(dateTimeLabel(end))}.</p>`;
}

async function addDiscountDetails(to,html){
  try{
    const c=db();
    const {data,error}=await c.from("customer_discounts")
      .select("id,kind,value,starts_at,expires_at,max_uses,uses,service_ids,active,created_at")
      .eq("scope","customer")
      .eq("active",true)
      .ilike("email",String(to||"").trim().toLowerCase())
      .order("created_at",{ascending:false})
      .limit(1);
    if(error||!data?.length)return html;
    const row=data[0];
    const serviceIds=Array.isArray(row.service_ids)?row.service_ids:[];
    const services=serviceIds.map(id=>allServices.find(s=>s.id===id)).filter(Boolean);
    if(!services.length)return html;
    const names=services.map(s=>`<li>${esc(s.name)}</li>`).join("");
    const value=row.kind==="percent"?`${Number(row.value)}% off`:`$${Number(row.value).toFixed(2)} off`;
    const usage=row.max_uses?`<p><b>Uses:</b> You can use this discount up to ${Number(row.max_uses)} ${Number(row.max_uses)===1?"time":"times"}.</p>`:`<p><b>Uses:</b> No usage limit.</p>`;
    return `${html}<hr><h3>Your Discount Is Available On ✨</h3><p>Your <b>${esc(value)}</b> discount can be used only on:</p><ul>${names}</ul>${discountWindow(row)}${usage}<p><a href="${esc(baseMenu())}" style="display:inline-block;background:#ad6f7c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px">Click Here to Choose Your Service & Book</a></p><p>Choose one of the eligible services from our menu and book using this same email address so your discount can be applied automatically.</p>`;
  }catch(e){
    console.error("DISCOUNT EMAIL DETAILS FAILED:",e);
    return html;
  }
}

function baseMenu(){return `${siteUrl()}/services`}

export async function sendMail({to,subject,html}){
  const transporter=mailer();
  let customerHtml = subject.startsWith("Appointment Confirmed")
    ? html.replace(/<br><b>30 min cleanup buffer<\/b>[^<]*\s*system blocks[^<]*→[^<]*<\/p>/i, "</p>")
    : html;
  if(subject.startsWith("A Special Offer From")) customerHtml=await addDiscountDetails(to,customerHtml);
  customerHtml=addContactFooter(customerHtml);
  try{
    return await transporter.sendMail({
      from:`"VALE BEAUTY VK" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html:customerHtml
    });
  }catch(error){
    if(subject.startsWith("Account Fee Notice")){
      console.error("FEE EMAIL FAILED:",error);
      return {accepted:[],rejected:[to],error};
    }
    throw error;
  }
}
