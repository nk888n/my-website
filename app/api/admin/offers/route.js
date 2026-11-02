import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {allServices,facialTreatments,bodyTreatments,facialAddons,bodyAddons,eyebrow} from "../../../../lib/services";

export const dynamic="force-dynamic";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const authorized=req=>!!process.env.ADMIN_PIN&&req.headers.get("x-admin-pin")===process.env.ADMIN_PIN;
const allowed=new Map(allServices.map(s=>[s.id,s]));
const allowedAddons=new Map([...facialAddons.map(a=>[a.id,{...a,category:"facial"}]),...bodyAddons.map(a=>[a.id,{...a,category:"body"}])]);
const category=id=>facialTreatments.some(s=>s.id===id)?"facial":bodyTreatments.some(s=>s.id===id)?"body":id===eyebrow.id?"eyebrow":"unknown";
function prepare(body){
  const ids=Array.isArray(body.services)?body.services.map(x=>typeof x==="string"?x:x?.id):[];
  if(!ids.length||ids.some(id=>!allowed.has(id)))throw new Error("Choose at least one valid service.");
  const services=ids.map(id=>{const s=allowed.get(id);return {id:s.id,name:s.name,category:category(id),duration:Number(s.duration||0),price:Number(s.price||0),description:s.description||"",tagline:s.tagline||"",includes:Array.isArray(s.includes)?s.includes:[],free:Array.isArray(s.free)?s.free:[],image:s.image||""}});
  const serviceCategories=new Set(services.map(s=>s.category));
  const addonIds=Array.isArray(body.addons)?[...new Set(body.addons.map(String))]:[];
  if(addonIds.some(id=>!allowedAddons.has(id)))throw new Error("Choose valid package add-ons.");
  const addons=addonIds.map(id=>{const a=allowedAddons.get(id);if(!serviceCategories.has(a.category))throw new Error("Facial add-ons require a facial service, and body add-ons require a body service.");return{id:a.id,name:a.name,category:a.category,price:Number(a.price||0)}});
  const original=services.reduce((n,s)=>n+s.price,0)+addons.reduce((n,a)=>n+a.price,0),duration=services.reduce((n,s)=>n+s.duration,0);
  const originalPrice=Number(body.original_price??original),offerPrice=Number(body.offer_price);
  if(!Number.isFinite(offerPrice)||offerPrice<0||offerPrice>originalPrice)throw new Error("Offer price must be between $0 and the original price.");
  const startsAt=new Date(body.starts_at),endsAt=new Date(body.ends_at);
  if(!Number.isFinite(startsAt.getTime())||!Number.isFinite(endsAt.getTime())||endsAt<=startsAt)throw new Error("Choose a valid start and end date/time.");
  const duplicateCategories=["facial","body","eyebrow"].filter(k=>services.filter(s=>s.category===k).length>1);
  if(duplicateCategories.length&&!body.duplicate_confirmed)throw new Error("This package contains more than one service of the same type. Confirm the warning to continue.");
  return {title:String(body.title||"").trim(),short_description:String(body.short_description||"").trim(),nav_label:String(body.nav_label||"Offers").trim()||"Offers",services,addons,original_price:originalPrice,offer_price:offerPrice,total_duration_minutes:duration,popup_image_url:body.popup_image_url||null,detail_image_url:body.detail_image_url||null,starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),homepage_order:Math.max(1,Math.floor(Number(body.homepage_order)||1)),show_homepage:body.show_homepage!==false,show_offers_page:body.show_offers_page!==false,is_active:body.is_active===true,updated_at:new Date().toISOString()};
}
export async function GET(req){
 if(!authorized(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{const {data,error}=await db().from("beauty_offers").select("*").order("homepage_order").order("starts_at",{ascending:false});if(error)throw error;return NextResponse.json({offers:data||[]})}
 catch(e){console.error("ADMIN OFFERS GET",e);return NextResponse.json({error:"Unable to load offers."},{status:500})}
}
export async function POST(req){
 if(!authorized(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const body=await req.json();
  if(body.action==="toggle"){
   if(!body.id)return NextResponse.json({error:"Offer ID is required."},{status:400});
   const {data,error}=await db().from("beauty_offers").update({is_active:!!body.is_active,updated_at:new Date().toISOString()}).eq("id",body.id).select("*").single();
   if(error)throw error;return NextResponse.json({offer:data,message:data.is_active?"Offer activated.":"Offer deactivated."});
  }
  const value=prepare(body);
  if(!value.title)return NextResponse.json({error:"Offer name is required."},{status:400});
  const query=body.id?db().from("beauty_offers").update(value).eq("id",body.id):db().from("beauty_offers").insert(value);
  const {data,error}=await query.select("*").single();if(error)throw error;
  return NextResponse.json({offer:data,message:"Offer saved."});
 }catch(e){console.error("ADMIN OFFERS SAVE",e);return NextResponse.json({error:e.message||"Unable to save offer."},{status:400})}
}