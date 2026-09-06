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

async function addDiscountDetails(to,html){
  try{
    const c=db();
    const {data,error}=await c.from("customer_discounts")
      .select("kind,value,starts_at,expires_at,service_ids,active")
      .eq("scope","customer")
      .eq("active",true)
      .ilike("email",String(to||"").trim().toLowerCase())
      .order("created_at",{ascending:false});
    if(error||!data?.length)return html;
    const rows=data;
    const serviceIds=[...new Set(rows.flatMap(x=>Array.isArray(x.service_ids)?x.service_ids:[]))];
    const services=serviceIds.map(id=>allServices.find(s=>s.id===id)).filter(Boolean);
    if(!services.length)return html;
    const names=services.map(s=>`<li>${esc(s.name)}</li>`).join("");
    const first=rows[0];
    const value=first.kind==="percent"?`${Number(first.value)}% off`:`$${Number(first.value).toFixed(2)} off`;
    const expires=first.expires_at?`<p>This offer is valid until <b>${esc(new Date(first.expires_at).toLocaleDateString("en-CA",{timeZone:business.timezone}))}</b>.</p>`:"";
    return `${html}<hr><h3>Your Discount Is Available On ✨</h3><p>Your <b>${esc(value)}</b> discount can be used on:</p><ul>${names}</ul>${expires}<p><a href="${esc(baseMenu())}" style="display:inline-block;background:#ad6f7c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px">Click Here to Choose Your Service & Book</a></p><p>Choose your service from our menu and book using this same email address so your discount can be applied automatically.</p>`;
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
