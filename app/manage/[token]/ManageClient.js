"use client";
import {useEffect,useState} from "react";
export default function ManageClient({token}){
 const [email,setEmail]=useState("");const [booking,setBooking]=useState(null);const [msg,setMsg]=useState("");const [date,setDate]=useState("");const [start,setStart]=useState("");const [slots,setSlots]=useState([]);const [loading,setLoading]=useState(false);
 async function request(action,extra={}){setLoading(true);setMsg("");try{const r=await fetch(`/api/manage/${token}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,action,...extra})});const j=await r.json();if(!r.ok)throw new Error(j.error||"We could not complete that request.");return j}catch(e){setMsg(e.message);return null}finally{setLoading(false)}}
 async function verify(){const j=await request("verify");if(j){setBooking(j.booking);setDate(j.booking.date);setMsg("")}}
 useEffect(()=>{if(!booking||!date)return;fetch(`/api/bookings?date=${date}&duration=${booking.duration}`,{cache:"no-store"}).then(r=>r.json()).then(j=>{setSlots((j.available||[]).filter(x=>x!==booking.start));}).catch(()=>setSlots([]))},[booking,date]);
 async function cancel(){if(!confirm("Cancel this appointment?"))return;const j=await request("cancel");if(j)setMsg(j.message)}
 async function reschedule(){const j=await request("reschedule",{date,start});if(j){setMsg(j.message);setBooking(null)}}
 return <div className="bookingbox"><form className="form" onSubmit={e=>{e.preventDefault();verify()}}><label>Email used for the booking<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="btn" disabled={loading}>{loading?"Checking…":"Verify"}</button></form>
 {msg&&<div className="success" style={{marginTop:15}}>{msg}</div>}
 {booking&&<div className="manageDetails" style={{marginTop:20}}><div className="summary"><strong>{booking.date} · {booking.start}</strong><br/>{booking.items.map((x,i)=><span key={i}>{x.name}{i<booking.items.length-1?" · ":""}</span>)}<br/>Duration: {booking.duration} min · Total: ${Number(booking.total).toFixed(2)}</div>
 <div className="manageActions"><button type="button" className="btn dangerBtn" onClick={cancel} disabled={loading}>Cancel Appointment</button></div>
 <fieldset><legend>Change appointment</legend><label>New date<input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label><label>New start time<select value={start} onChange={e=>setStart(e.target.value)}><option value="">Choose an available time</option>{slots.map(s=><option key={s} value={s}>{s}</option>)}</select></label><button type="button" className="btn" onClick={reschedule} disabled={!date||!start||loading}>Confirm Change</button></fieldset></div>}
 </div>
}
