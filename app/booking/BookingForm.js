"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { facialTreatments, bodyTreatments, facialAddons, bodyAddons, eyebrow } from "../../lib/services";

const SLOT_MINUTES = 30;
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 19 * 60;
const BUFFER_MINUTES = 30;

function pad(n){ return String(n).padStart(2,"0"); }
function isoDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function labelTime(mins){ const h=Math.floor(mins/60), m=mins%60, suffix=h>=12?"PM":"AM", hh=h%12||12; return `${hh}:${pad(m)} ${suffix}`; }
function serviceName(id){ return [...facialTreatments,...bodyTreatments].find(s=>s.id===id)?.name || ""; }

function DatePicker({ value, onChange, min }) {
  const ref = useRef(null);
  return <div className="pickerWrap">
    <button type="button" className={`pickerButton ${value ? "hasValue" : ""}`} onClick={() => ref.current?.showPicker?.()}>
      <span>{value ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"}) : "Choose a date"}</span><span aria-hidden="true">▣</span>
    </button>
    <input ref={ref} className="nativePicker" type="date" required value={value} min={min} onChange={e=>onChange(e.target.value)} aria-label="Choose appointment date" />
  </div>;
}

export default function BookingForm({ initialData }) {
  const [data,setData] = useState(initialData);
  const [blocked,setBlocked] = useState([]);
  const [loadingSlots,setLoadingSlots] = useState(false);
  const [availabilityError,setAvailabilityError] = useState("");
  const [msg,setMsg] = useState("");

  const selected = useMemo(() => [
    facialTreatments.find(s=>s.id===data.facial),
    bodyTreatments.find(s=>s.id===data.body),
    data.eyebrow ? eyebrow : null
  ].filter(Boolean), [data.facial,data.body,data.eyebrow]);
  const duration = selected.reduce((a,s)=>a+s.duration,0);
  const total = selected.reduce((a,s)=>a+s.price,0)
    + data.fa.reduce((a,id)=>a+(facialAddons.find(x=>x.id===id)?.price||0),0)
    + data.ba.reduce((a,id)=>a+(bodyAddons.find(x=>x.id===id)?.price||0),0);

  const minDate = useMemo(() => {
    const d = new Date(Date.now() + 24*60*60*1000);
    return isoDate(d);
  }, []);

  useEffect(() => {
    if (!data.date || !duration) { setBlocked([]); return; }
    let cancelled=false;
    setLoadingSlots(true); setAvailabilityError("");
    fetch(`/api/bookings?date=${encodeURIComponent(data.date)}&duration=${duration}`, {cache:"no-store"})
      .then(r=>r.json().then(j=>({ok:r.ok,j})))
      .then(({ok,j})=>{
        if(cancelled) return;
        if(!ok) throw new Error(j.error||"Could not load availability.");
        setBlocked(j.blocked||[]);
        if (data.start && !(j.available||[]).includes(data.start)) setData(v=>({...v,start:""}));
      })
      .catch(e=>{ if(!cancelled) setAvailabilityError(e.message); })
      .finally(()=>{ if(!cancelled) setLoadingSlots(false); });
    return ()=>{cancelled=true;};
  }, [data.date,duration]);

  const slots = useMemo(() => {
    const out=[];
    for(let start=OPEN_MINUTES; start + duration <= CLOSE_MINUTES; start += SLOT_MINUTES){
      const endWithBuffer=start+duration+BUFFER_MINUTES;
      const conflict=blocked.some(b=>start < b.end_minutes && endWithBuffer > b.start_minutes);
      out.push({minutes:start, value:`${pad(Math.floor(start/60))}:${pad(start%60)}`, disabled:conflict});
    }
    return out;
  }, [blocked,duration]);

  function set(key,value){ setData(v=>({...v,[key]:value})); }
  function toggleAddon(key,id,checked){ setData(v=>({...v,[key]:checked?[...v[key],id]:v[key].filter(x=>x!==id)})); }
  function removeService(type){ setData(v=>({...v,[type]:type==="eyebrow"?false:"",...(type==="facial"?{fa:[]}:{}),...(type==="body"?{ba:[]}:{})})); }
  function servicesQuery(){
    const p=new URLSearchParams(); if(data.facial)p.set("facial",data.facial); if(data.body)p.set("body",data.body); if(data.eyebrow)p.set("eyebrow","1"); if(data.fa.length)p.set("fa",data.fa.join(",")); if(data.ba.length)p.set("ba",data.ba.join(",")); return p.toString();
  }
  async function submit(e){
    e.preventDefault();
    if(!selected.length || !data.date || !data.start) return;
    setMsg("Checking availability and creating your booking…");
    const res=await fetch("/api/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,duration,total})});
    const j=await res.json();
    setMsg(res.ok?`Your Appointment Is Confirmed ✨ — ${j.message}`:(j.error||"Unable to book this time."));
  }

  return <div className="bookingbox"><form className="form" onSubmit={submit}>
    <div className="bookingIntro">
      <div className="eyebrow">Your Appointment</div>
      <h2>Review your treatments</h2>
      <p>Everything you selected is saved here. You can change or remove anything before choosing your appointment time.</p>
    </div>

    <div className="chosenServices">
      {selected.length ? selected.map(s=><div className="chosenService" key={s.id}>
        <div><strong>{s.name}</strong><span>${s.price} · {s.duration} min</span></div>
        <div className="chosenActions">
          <a className="textButton" href={`/services?${servicesQuery()}`}>Change</a>
          <button type="button" className="textButton dangerText" onClick={()=>removeService(s.id===eyebrow.id?"eyebrow":s.id===data.facial?"facial":"body")}>Remove</button>
        </div>
      </div>) : <p className="muted">No treatment selected. <a href="/services">Choose a service</a>.</p>}
    </div>

    {data.facial && <fieldset><legend>Facial Add-ons</legend>{facialAddons.map(a=><label key={a.id}><span><input type="checkbox" checked={data.fa.includes(a.id)} onChange={e=>toggleAddon("fa",a.id,e.target.checked)}/> {a.name} — ${a.price}</span></label>)}</fieldset>}
    {data.body && <fieldset><legend>Body Add-ons</legend>{bodyAddons.map(a=><label key={a.id}><span><input type="checkbox" checked={data.ba.includes(a.id)} onChange={e=>toggleAddon("ba",a.id,e.target.checked)}/> {a.name} — ${a.price}</span></label>)}</fieldset>}

    <div className="summary"><div>Appointment duration: <strong>{duration} min</strong></div><div>Total: <strong>${total}</strong></div></div>

    <div className="availabilityPanel">
      <div className="availabilityTitle">Appointment availability</div>
      <p className="hoursNotice">Hours: <strong>8:00 AM – 7:00 PM, every day</strong></p>
      <p className="muted small">Appointments use 30-minute start times. A 30-minute buffer is kept after each appointment.</p>
    </div>

    <label>Date<DatePicker value={data.date} min={minDate} onChange={v=>{set("date",v);set("start","")}} /></label>
    <label>Start time
      <select required value={data.start} disabled={!data.date || loadingSlots || !selected.length} onChange={e=>set("start",e.target.value)}>
        <option value="">{loadingSlots ? "Loading available times…" : data.date ? "Choose an available time" : "Choose a date first"}</option>
        {slots.map(s=><option key={s.value} value={s.value} disabled={s.disabled}>{labelTime(s.minutes)}{s.disabled?" — Unavailable":""}</option>)}
      </select>
    </label>
    {availabilityError && <div className="error">{availabilityError}</div>}

    <label>Full Name<input required value={data.name} onChange={e=>set("name",e.target.value)} /></label>
    <label>Email<input required type="email" value={data.email} onChange={e=>set("email",e.target.value)} /></label>
    <label>Notes / Special Requests<textarea rows="4" value={data.notes} onChange={e=>set("notes",e.target.value)} /></label>
    <p className="muted">A minimum of 24 hours' notice is required for cancellations or appointment changes.</p>
    <div className="bookingNav"><a className="backButton" href={`/services?${servicesQuery()}`}>← Back to Services</a><button className="btn" disabled={!selected.length || !data.date || !data.start || !!availabilityError}>Confirm Booking</button></div>
    {msg&&<div className={msg.includes("Confirmed")?"success":"error"}>{msg}</div>}
  </form></div>;
}
