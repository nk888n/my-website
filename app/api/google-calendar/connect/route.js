import {NextResponse} from "next/server";
import crypto from "crypto";
import {googleAuthorizationUrl} from "../../../../lib/googleCalendar";
export async function POST(req){
  if(req.headers.get("x-admin-pin")!==process.env.ADMIN_PIN)return NextResponse.json({error:"Access denied"},{status:403});
  try{
    const nonce=crypto.randomBytes(24).toString("hex");
    const exp=Math.floor(Date.now()/1000)+600;
    const payload=`${exp}.${nonce}`;
    const sig=crypto.createHmac("sha256",String(process.env.ADMIN_PIN||"")).update(payload).digest("hex");
    const state=`${payload}.${sig}`;
    const res=NextResponse.json({url:googleAuthorizationUrl(state)});
    res.cookies.set("google_calendar_oauth_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:600,path:"/"});
    return res;
  }catch(e){return NextResponse.json({error:e.message||"Google Calendar setup is unavailable."},{status:500})}
}
