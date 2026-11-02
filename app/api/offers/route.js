import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const now=new Date().toISOString();
  const {data,error}=await db.from("beauty_offers").select("id,title,short_description,nav_label,services,original_price,offer_price,total_duration_minutes,popup_image_url,detail_image_url,starts_at,ends_at,homepage_order,show_homepage,show_offers_page,is_active").eq("is_active",true).lte("starts_at",now).gt("ends_at",now).order("homepage_order").order("starts_at");
  if(error)throw error;
  const offers=data||[],homepage=offers.find(x=>x.show_homepage)||null,visible=offers.filter(x=>x.show_offers_page);
  return NextResponse.json({homepage,offers:visible,navLabel:homepage?.nav_label||visible[0]?.nav_label||"Offers",hasOffers:offers.length>0});
 }catch(e){console.error("PUBLIC OFFERS GET",e);return NextResponse.json({homepage:null,offers:[],navLabel:"Offers",hasOffers:false},{status:200})}
}