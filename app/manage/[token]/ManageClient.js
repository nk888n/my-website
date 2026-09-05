"use client";
import {useEffect,useMemo,useState} from "react";
import {Calendar,TimeSlots,localIsoDate} from "../../components/AppointmentPicker";
export default function ManageClient({token}){
 const [email,setEmail]=useState(""),[booking,setBooking]=useState(null),[msg,setMsg]=useState(""),[date,setDate]=useState(""),[start,setStart]=useState(""),[blocked,setBlocked]=useState([]),[available,setAvailable]=useState([]),[loading,setLoading]=useState(false),[loadingSlots,setLoadingSlots]=useState(false);
 async function request(action,extra={}){setLoading(true);setMsg("");try{const r=await fetch(`/api/manage/${token}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,action,...extra})});const j=await r.json();if(!r.ok)throw new Error(j.error||"We could not complete that request.");return j}catch(e){setMsg(e.message);return null}finally{setLoading(false)}}
 async function verify(){const j=await request("verify");if(j){setBooking(j.booking);setDate(j.booking.date);setStart("");setMsg("")}}
 useEffect(()=>{if(!booking||!date)return;let cancelled=false;setLoadingSlots(true);fetch(`/api/bookings?date=${date}&duration=${booking.duration}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{if(cancelled)return;setBlocked(j.blocked||[]);setAvailable((j.available||[]).filter(x=>x!==booking.start));}).catch(()=>{if(!cancelled){setBlocked([]);setAvailable([])}}).finally(()=>{if(!cancelled)setLoadingSlots(false)});return()=>{cancelled=true}},[booking,date]);
 async function cancel(){if(!confirm("Cancel this appointment?"))return;const j=await request("cancel");if(j){setMsg(j.message);setBooking(null)}}
 async function reschedule(){const j=await request("reschedule",{date,start});if(j){setMsg(j.message);setBooking(null)}}
 const minDate=useMemo(()=>localIsoDate(new Date()),[]);
 return <div className="bookingbox"><form className="form" onSubmit={e=>{e.preventDefault();verify()}}><label>Email used for the booking<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="btn" disabled={loading}>{loading?"Checking…":"Verify"}</button></form>
 {msg&&<div className="success" style={{marginTop:15}}>{msg}</div>}
 {booking&&<div className="manageDetails" style={{marginTop:20}}><div className="summary"><strong>{booking.date} · {booking.startLabel}</strong><br/>{booking.items.map((x,i)=><span key={i}>{x.name}{i<booking.items.length-1?" · ":""}</span>)}<br/>Duration: {booking.duration} min · Total: ${Number(booking.total).toFixed(2)}</div>
 {booking.lateNotice&&<div className="error" style={{marginTop:12}}><strong>Final 24-hour notice:</strong> This appointment is within the final 24 hours. The link still works. The current system does not charge a late-notice fee.</div>}
 <div className="manageActions"><button type="button" className="btn dangerBtn" onClick={cancel} disabled={loading}>Cancel Appointment</button></div>
 <fieldset><legend>Change appointment</legend><label>New date<Calendar value={date} minDate={minDate} duration={booking.duration} onChange={v=>{setDate(v);setStart("")}}/></label><div className="timePickerField"><div className="fieldLabel">New start time</div>{date?<TimeSlots date={date} duration={booking.duration} selected={start} onChange={setStart} blocked={blocked} available={available} loading={loadingSlots}/>:<p className="muted small">Choose a date first.</p>}</div><button type="button" className="btn" onClick={reschedule} disabled={!date||!start||loading||loadingSlots}>Confirm Change</button></fieldset>
 </div>}
 </div>
}
