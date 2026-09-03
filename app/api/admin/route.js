import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
const db=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
function ok(req){return req.headers.get("x-admin-pin")===process.env.ADMIN_PIN}
export async function GET(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 const c=db();const {data,error}=await c.from("bookings").select("id,date,start_minutes,name,email,notes,duration_minutes,total_price,status,created_at,updated_at").order("date",{ascending:true}).order("start_minutes",{ascending:true});
 if(error)return NextResponse.json({error:"Database error"},{status:500});
 const {data:fees}=await c.from("fees").select("id,email,booking_id,amount,reason,status,created_at").order("created_at",{ascending:false});
 return NextResponse.json({bookings:data||[],fees:fees||[]});
}
export async function POST(req){
 if(!ok(req))return NextResponse.json({error:"Access denied"},{status:403});
 try{
  const body=await req.json();const id=String(body.id||"");const action=String(body.action||"");if(!id)return NextResponse.json({error:"Booking id is required."},{status:400});
  const c=db();const {data:b,error:be}=await c.from("bookings").select("id,email,status").eq("id",id).maybeSingle();if(be)throw be;if(!b)return NextResponse.json({error:"Booking not found."},{status:404});
  if(action==="attended"){
    const {error}=await c.from("bookings").update({status:"attended",updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;return NextResponse.json({message:"Appointment marked as attended."});
  }
  if(action==="no_show"){
    const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Enter the fee amount first."},{status:400});
    const {error}=await c.from("bookings").update({status:"no_show",updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;
    const {error:fe}=await c.from("fees").insert({email:b.email,booking_id:id,amount,reason:"No-show",status:"outstanding"});if(fe)throw fe;
    return NextResponse.json({message:`Marked as no-show and added an outstanding fee of $${amount.toFixed(2)}.`});
  }
  if(action==="late_cancel"){
    const amount=Number(body.amount);if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({error:"Enter the fee amount first."},{status:400});
    const {error}=await c.from("bookings").update({status:"late_cancel",updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;
    const {error:fe}=await c.from("fees").insert({email:b.email,booking_id:id,amount,reason:"Late cancellation",status:"outstanding"});if(fe)throw fe;
    return NextResponse.json({message:`Marked as late cancellation and added an outstanding fee of $${amount.toFixed(2)}.`});
  }
  if(action==="waive_fee"){
    const feeId=String(body.feeId||"");if(!feeId)return NextResponse.json({error:"Fee id is required."},{status:400});
    const {error}=await c.from("fees").update({status:"waived"}).eq("id",feeId);if(error)throw error;return NextResponse.json({message:"Fee waived."});
  }
  if(action==="mark_paid"){
    const feeId=String(body.feeId||"");if(!feeId)return NextResponse.json({error:"Fee id is required."},{status:400});
    const {error}=await c.from("fees").update({status:"paid"}).eq("id",feeId);if(error)throw error;return NextResponse.json({message:"Fee marked as paid."});
  }
  return NextResponse.json({error:"Unsupported action."},{status:400});
 }catch(e){console.error(e);return NextResponse.json({error:"Admin action failed."},{status:500})}
}
