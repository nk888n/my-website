"use client";
import { useEffect, useMemo, useState } from "react";
import { facialTreatments, bodyTreatments, facialAddons, bodyAddons, eyebrow } from "../../lib/services";
import { Calendar, TimeSlots, localIsoDate } from "../components/AppointmentPicker";

export default function BookingForm({ initialData }) {
  const [data,setData]=useState(initialData);
  const [blocked,setBlocked]=useState([]);
  const [available,setAvailable]=useState([]);
  const [loadingSlots,setLoadingSlots]=useState(false);
  const [availabilityError,setAvailabilityError]=useState("");
  const [msg,setMsg]=useState("");
  const [submitted,setSubmitted]=useState(false);

  const selected = useMemo(() => [
    facialTreatments.find(s=>s.id===data.facial),
    bodyTreatments.find(s=>s.id===data.body),
    data.eyebrow ? eyebrow : null
  ].filter(Boolean), [data.facial,data.body,data.eyebrow]);
  const duration = selected.reduce((a,s)=>a+s.duration,0);
  const total = selected.reduce((a,s)=>a+s.price,0)
    + data.fa.reduce((a,id)=>a+(facialAddons.find(x=>x.id===id)?.price||0),0)
    + data.ba.reduce((a,id)=>a+(bodyAddons.find(x=>x.id===id)?.price||0),0);

  const minDate = useMemo(() => localIsoDate(new Date()), []);

  useEffect(() => {
    if (!data.date || !duration) { setBlocked([]); setAvailable([]); setAvailabilityError(""); return; }
    let cancelled=false;
    setLoadingSlots(true); setAvailabilityError("");
    fetch(`/api/bookings?date=${encodeURIComponent(data.date)}&duration=${duration}`, {cache:"no-store"})
      .then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"availability");return j;})
      .then(j=>{
        if(cancelled)return;
        setBlocked(j.blocked||[]);
        setAvailable(j.available||[]);
        if(data.start && !(j.available||[]).includes(data.start)) setData(v=>({...v,start:""}));
      })
      .catch(()=>{ if(!cancelled) setAvailabilityError("We couldn't load the available times. Please try again."); })
      .finally(()=>{if(!cancelled)setLoadingSlots(false);});
    return ()=>{cancelled=true;};
  }, [data.date,duration]);


  function set(key,value){ setData(v=>({...v,[key]:value})); setMsg(""); }
  function toggleAddon(key,id,checked){ setData(v=>({...v,[key]:checked?[...v[key],id]:v[key].filter(x=>x!==id)})); }
  function removeService(type){ setData(v=>({...v,[type]:type==="eyebrow"?false:"",...(type==="facial"?{fa:[]}:{}),...(type==="body"?{ba:[]}:{})})); }
  function servicesQuery(){
    const p=new URLSearchParams(); if(data.facial)p.set("facial",data.facial); if(data.body)p.set("body",data.body); if(data.eyebrow)p.set("eyebrow","1"); if(data.fa.length)p.set("fa",data.fa.join(",")); if(data.ba.length)p.set("ba",data.ba.join(",")); return p.toString();
  }

  async function submit(e){
    e.preventDefault();
    if(!selected.length || !data.date || !data.start || !data.name.trim() || !data.email.trim()) return;
    setMsg("Checking availability and creating your booking…");
    const res=await fetch("/api/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,duration,total})});
    const j=await res.json();
    if(res.ok){ setSubmitted(true); setMsg(j.message || "Please check your email for your appointment confirmation and booking details."); }
    else setMsg(j.error||"Unable to book this time.");
  }

  if(submitted) return <div className="success confirmationMessage"><h2>Booking confirmed ✨</h2><p>Please check your email for your appointment confirmation and booking details.</p><p className="muted">Your email contains your appointment details and your private link to cancel or change the appointment.</p></div>;

  return <div className="bookingbox"><form className="form" onSubmit={submit}>
    <div className="bookingIntro"><div className="eyebrow">Your Appointment</div><h2>Review your treatments</h2><p>Everything you selected is saved here. You can change or remove anything before choosing your appointment time.</p></div>

    <div className="chosenServices">
      {selected.length ? selected.map(s=><div className="chosenService" key={s.id}>
        <div><strong>{s.name}</strong><span>${s.price} · {s.duration} min</span></div>
        <div className="chosenActions"><a className="textButton" href={`/services?${servicesQuery()}`}>Change</a><button type="button" className="textButton dangerText" onClick={()=>removeService(s.id===eyebrow.id?"eyebrow":s.id===data.facial?"facial":"body")}>Remove</button></div>
      </div>) : <p className="muted">No treatment selected. <a href="/services">Choose a service</a>.</p>}
    </div>

    {data.facial && <fieldset><legend>Facial Add-ons</legend>{facialAddons.map(a=><label key={a.id}><span><input type="checkbox" checked={data.fa.includes(a.id)} onChange={e=>toggleAddon("fa",a.id,e.target.checked)}/> {a.name} — ${a.price}</span></label>)}</fieldset>}
    {data.body && <fieldset><legend>Body Add-ons</legend>{bodyAddons.map(a=><label key={a.id}><span><input type="checkbox" checked={data.ba.includes(a.id)} onChange={e=>toggleAddon("ba",a.id,e.target.checked)}/> {a.name} — ${a.price}</span></label>)}</fieldset>}

    <div className="nextChoices">
      <div><strong>Want to add another service?</strong><span className="muted">You can return to the menu at any time without losing your selections.</span></div>
      <div className="choiceLinks">
        {!data.facial && <a href={`/services?${servicesQuery()}`} className="choiceLink">+ Add a Facial</a>}
        {!data.body && <a href={`/services?${servicesQuery()}`} className="choiceLink">+ Add a Body Treatment</a>}
        {!data.eyebrow && <a href={`/services?${servicesQuery()}`} className="choiceLink">+ Add Eyebrow Threading</a>}
      </div>
    </div>

    <div className="summary"><div>Appointment duration: <strong>{duration} min</strong></div><div>Total: <strong>${total}</strong></div></div>

    <div className="availabilityPanel"><div className="availabilityTitle">Choose your appointment</div><p className="muted small">Select a date and then an available start time.</p></div>
    <label>Date<Calendar value={data.date} minDate={minDate} duration={duration} onChange={v=>{set("date",v);set("start","");}} /></label>
    <div className="timePickerField"><div className="fieldLabel">Start time</div>{data.date ? <TimeSlots date={data.date} duration={duration} selected={data.start} onChange={v=>set("start",v)} blocked={blocked} available={available} loading={loadingSlots}/> : <p className="muted small">Choose a date first.</p>}</div>
    {availabilityError && <div className="error">{availabilityError}</div>}

    <label>Full Name<input required value={data.name} onChange={e=>set("name",e.target.value)} /></label>
    <label>Email<input required type="email" value={data.email} onChange={e=>set("email",e.target.value)} /></label>
    <label>Notes / Special Requests <span className="optionalLabel">(optional)</span><textarea rows="4" value={data.notes} onChange={e=>set("notes",e.target.value)} /></label>
    <p className="muted">A minimum of 24 hours' notice is required for cancellations or appointment changes.</p>
    <div className="bookingNav"><a className="backButton" href={`/services?${servicesQuery()}`}>← Back to Services</a><button type="submit" className="btn" disabled={!selected.length || !data.date || !data.start || !data.name.trim() || !data.email.trim() || !!availabilityError || loadingSlots}>Confirm Booking</button></div>
    {msg&&<div className={msg.includes("Confirmed")||msg.includes("check your email")?"success":"error"}>{msg}</div>}
  </form></div>;
}
