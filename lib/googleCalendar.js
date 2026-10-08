import crypto from "crypto";
import {DateTime} from "luxon";
import {createClient} from "@supabase/supabase-js";
import {business,findService,findAddon} from "./services";

const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const encKey=()=>crypto.createHash("sha256").update(String(process.env.CALENDAR_TOKEN_ENCRYPTION_KEY||"")).digest();

function encrypt(text){
  if(!process.env.CALENDAR_TOKEN_ENCRYPTION_KEY)throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not configured.");
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",encKey(),iv);
  const data=Buffer.concat([cipher.update(String(text),"utf8"),cipher.final()]);
  return [iv.toString("base64"),cipher.getAuthTag().toString("base64"),data.toString("base64")].join(".");
}
function decrypt(value){
  const [ivB,tagB,dataB]=String(value||"").split(".");
  if(!ivB||!tagB||!dataB)throw new Error("Invalid calendar token.");
  const decipher=crypto.createDecipheriv("aes-256-gcm",encKey(),Buffer.from(ivB,"base64"));
  decipher.setAuthTag(Buffer.from(tagB,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB,"base64")),decipher.final()]).toString("utf8");
}
function googleConfig(){
  const clientId=process.env.GOOGLE_CALENDAR_CLIENT_ID,clientSecret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if(!clientId||!clientSecret)throw new Error("Google Calendar OAuth is not configured.");
  return {clientId,clientSecret,redirectUri:`${process.env.NEXT_PUBLIC_SITE_URL}/api/google-calendar/callback`};
}
export function googleAuthorizationUrl(state){
  const {clientId,redirectUri}=googleConfig();
  const p=new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"code",access_type:"offline",prompt:"consent",scope:"https://www.googleapis.com/auth/calendar.events",state});
  return "https://accounts.google.com/o/oauth2/v2/auth?"+p.toString();
}
export async function exchangeGoogleCode(code){
  const {clientId,clientSecret,redirectUri}=googleConfig();
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  const j=await r.json();
  if(!r.ok||!j.refresh_token)throw new Error(j.error_description||j.error||"Google did not return a refresh token.");
  return j;
}
export async function saveGoogleRefreshToken(refreshToken){
  const c=db();
  const {error}=await c.from("google_calendar_connections").upsert({id:1,refresh_token_encrypted:encrypt(refreshToken),calendar_id:"primary",updated_at:new Date().toISOString()},{onConflict:"id"});
  if(error)throw error;
}
async function getAccessToken(){
  const c=db(),{data,error}=await c.from("google_calendar_connections").select("refresh_token_encrypted,calendar_id").eq("id",1).maybeSingle();
  if(error)throw error;
  if(!data?.refresh_token_encrypted)throw new Error("Google Calendar is not connected.");
  const refreshToken=decrypt(data.refresh_token_encrypted),{clientId,clientSecret}=googleConfig();
  const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"})});
  const j=await r.json();
  if(!r.ok||!j.access_token)throw new Error(j.error_description||j.error||"Could not refresh Google Calendar access.");
  return {accessToken:j.access_token,calendarId:data.calendar_id||"primary"};
}
export async function createGoogleCalendarEvent(booking){
  const {accessToken,calendarId}=await getAccessToken();
  const local=DateTime.fromISO(`${booking.date}T${String(booking.start_minutes).padStart(4,"0").replace(/^(..)(..)$/, "$1:$2")}`,{zone:business.timezone});
  const end=local.plus({minutes:Number(booking.duration_minutes)});
  const items=Array.isArray(booking.items)?booking.items:[];
  const services=items.map(i=>`${i.name} — ${Number(i.duration||0)} min`).join("\n");
  const event={
    summary:`${booking.name} — ${services.split("\n")[0]||"Appointment"}`,
    description:`VALE BEAUTY VK\nCustomer: ${booking.name}\nEmail: ${booking.email}\nServices:\n${services}\n\nBooking ID: ${booking.id}`,
    location:business.address,
    start:{dateTime:local.toISO(),timeZone:business.timezone},
    end:{dateTime:end.toISO(),timeZone:business.timezone}
  };
  const r=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify(event)});
  const j=await r.json();
  if(!r.ok)throw new Error(j.error?.message||"Google Calendar event creation failed.");
  return j;
}
export async function calendarConnectionStatus(){
  const c=db(),{data,error}=await c.from("google_calendar_connections").select("calendar_id,updated_at").eq("id",1).maybeSingle();
  if(error)throw error;
  return {connected:!!data?.calendar_id,updatedAt:data?.updated_at||null};
}
