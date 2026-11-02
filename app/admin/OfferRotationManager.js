"use client";
import {useEffect,useState} from "react";
const localValue=value=>{if(!value)return "";const d=new Date(value);if(!Number.isFinite(d.getTime()))return "";const offset=d.getTimezoneOffset()*60000;return new Date(d.getTime()-offset).toISOString().slice(0,16)};
const blankSlot=()=>({offer_id:"",hours:"1",minutes:"0"});
export default function OfferRotationManager({pin,offers=[]}){
 const[schedule,setSchedule]=useState({starts_at:"",ends_at:"",is_enabled:false,slots:[blankSlot()]});
 const[loading,setLoading]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{if(!pin)return;let dead=false;fetch("/api/admin/offers/rotation",{headers:{"x-admin-pin":pin},cache:"no-store"}).then(r=>r.json()).then(j=>{if(dead||!j.schedule)return;setSchedule({starts_at:localValue(j.schedule.starts_at),ends_at:localValue(j.schedule.ends_at),is_enabled:!!j.schedule.is_enabled,slots:(j.schedule.slots||[]).map(s=>({offer_id:s.offer_id,hours:String(Math.floor(s.duration_minutes/60)),minutes:String(s.duration_minutes%60)}))})}).catch(()=>{});return()=>{dead=true}},[pin]);
 function patch(k,v){setSchedule(s=>({...s,[k]:v}))}
 function patchSlot(i,k,v){setSchedule(s=>({...s,slots:s.slots.map((x,n)=>n===i?{...x,[k]:v}:x)}))}
 function addSlot(){patch("slots",[...schedule.slots,blankSlot()])}
 function removeSlot(i){patch("slots",schedule.slots.length===1?[blankSlot()]:schedule.slots.filter((_,n)=>n!==i))}
 async function save(){setLoading(true);setMessage("");try{const slots=schedule.slots.map(s=>({offer_id:s.offer_id,duration_minutes:Number(s.hours||0)*60+Number(s.minutes||0)}));const r=await fetch("/api/admin/offers/rotation",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({...schedule,slots})}),j=await r.json();if(!r.ok)throw Error(j.error||"Unable to save schedule.");setMessage(j.message||"Rotation schedule saved.")}catch(e){setMessage(e.message)}finally{setLoading(false)}}
 const total=schedule.slots.reduce((n,s)=>n+Number(s.hours||0)*60+Number(s.minutes||0),0);
 return <section className="offerRotationPanel">
  <div className="filterHeader"><div><h4>Smart Offer Rotation</h4><p className="muted small">Choose which offer appears, for how long, and repeat the sequence until your rotation end date.</p></div><span className="offerRotationPill">Automatic rotation</span></div>
  <div className="offerRotationDates"><label>Rotation starts<input type="datetime-local" value={schedule.starts_at} onChange={e=>patch("starts_at",e.target.value)}/></label><label>Rotation ends<input type="datetime-local" value={schedule.ends_at} onChange={e=>patch("ends_at",e.target.value)}/></label></div>
  <div className="offerRotationRows"><b>Rotation sequence</b><p className="muted small">Add the same offer more than once if you want. Each period starts when the previous one ends.</p>
   {schedule.slots.map((slot,i)=><div className="offerRotationRow" key={i}><span className="offerRotationIndex">{i+1}</span><label className="offerRotationSelect">Offer<select value={slot.offer_id} onChange={e=>patchSlot(i,"offer_id",e.target.value)}><option value="">Choose saved offer</option>{offers.map(o=><option value={o.id} key={o.id}>{o.title}</option>)}</select></label><label>Hours<input type="number" min="0" max="168" value={slot.hours} onChange={e=>patchSlot(i,"hours",e.target.value)}/></label><label>Minutes<input type="number" min="0" max="59" value={slot.minutes} onChange={e=>patchSlot(i,"minutes",e.target.value)}/></label><button type="button" className="textButton dangerText" onClick={()=>removeSlot(i)}>Remove</button></div>)}
   <button type="button" className="textButton" onClick={addSlot}>+ Add another rotation period</button>
  </div>
  <div className="offerRotationSummary">One full sequence lasts <b>{Math.floor(total/60)}h {total%60}m</b>. It repeats automatically until the rotation end date.</div>
  <label className="offerRotationEnable"><input type="checkbox" checked={schedule.is_enabled} onChange={e=>patch("is_enabled",e.target.checked)}/> Enable this rotation schedule</label>
  <p className="muted small">Offers are automatically skipped as soon as their own end date passes, or before their own start date. The remaining valid periods continue rotating. If no valid scheduled offer is available, no expired offer is shown.</p>
  <button type="button" className="btn" onClick={save} disabled={loading}>{loading?"Saving…":"Save rotation schedule"}</button>{message&&<p className={message.includes("saved")?"success":"error"}>{message}</p>}
 </section>
}
