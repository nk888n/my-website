import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
function chooseRotatingOffer(schedule,offers,now){
 if(!schedule?.is_enabled||now<Date.parse(schedule.starts_at)||now>=Date.parse(schedule.ends_at))return null;
 const eligible=new Set(offers.map(o=>o.id));
 const slots=(schedule.slots||[]).filter(s=>eligible.has(s.offer_id)&&Number(s.duration_minutes)>0);
 if(!slots.length)return null;
 const cycleMs=slots.reduce((n,s)=>n+Number(s.duration_minutes)*60000,0);
 if(!cycleMs)return null;
 let cursor=((now-Date.parse(schedule.starts_at))%cycleMs+cycleMs)%cycleMs;
 for(const slot of slots){
  const duration=Number(slot.duration_minutes)*60000;
  if(cursor<duration)return offers.find(o=>o.id===slot.offer_id)||null;
  cursor-=duration;
 }
 return offers.find(o=>o.id===slots[0].offer_id)||null;
}
export async function GET(){
 try{
  const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const nowIso=new Date().toISOString(),now=Date.now();
  const [{data,error},{data:schedule,error:scheduleError}]=await Promise.all([
   db.from("beauty_offers").select("id,title,short_description,nav_label,services,original_price,offer_price,total_duration_minutes,popup_image_url,detail_image_url,starts_at,ends_at,homepage_order,show_homepage,show_offers_page,is_active").eq("is_active",true).lte("starts_at",nowIso).gt("ends_at",nowIso).order("homepage_order").order("starts_at"),
   db.from("beauty_offer_rotation").select("*").eq("singleton",true).maybeSingle()
  ]);
  if(error)throw error;
  if(scheduleError)throw scheduleError;
  const offers=data||[];
  const rotationOffer=chooseRotatingOffer(schedule,offers,now);
  const homepage=(rotationOffer?.show_homepage?rotationOffer:null)||offers.find(x=>x.show_homepage)||null;
  const visible=offers.filter(x=>x.show_offers_page);
  return NextResponse.json({homepage,offers:visible,navLabel:homepage?.nav_label||visible[0]?.nav_label||"Offers",hasOffers:offers.length>0,rotation:{active:!!rotationOffer,ends_at:schedule?.ends_at||null}});
 }catch(e){console.error("PUBLIC OFFERS GET",e);return NextResponse.json({homepage:null,offers:[],navLabel:"Offers",hasOffers:false,rotation:{active:false,ends_at:null}},{status:200})}
}
