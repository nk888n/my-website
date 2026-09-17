"use client";
import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {allServices} from "../../lib/services";

const fmt=v=>v?new Date(v).toLocaleString():"No expiration";
const blankWinner=()=>({customerId:"",name:"",email:"",q:"",serviceIds:[],date:"",start:"",maxUses:"1",expiresAt:""});

function CustomerSearch({customers,value,onChange}){
 const [q,setQ]=useState(value?.q||"");
 const results=useMemo(()=>customers.filter(c=>!q||`${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())).slice(0,12),[customers,q]);
 if(value?.customerId){
  return <button type="button" className="selectedCustomer" onClick={()=>{onChange({...value,customerId:"",name:"",email:"",q:""});setQ("")}}><strong>{value.name}</strong><span>{value.email} ×</span></button>;
 }
 return <div className="winnerCustomerSearch">
  <input placeholder="Search name or email…" value={q} onChange={e=>{setQ(e.target.value);onChange({...value,q:e.target.value})}} />
  {q&&<div className="customerSuggestions winnerSuggestions">{results.map(c=><button type="button" key={c.id} onClick={()=>{onChange({...value,customerId:c.id,name:c.name,email:c.email,q:""});setQ("")}}><strong>{c.name}</strong><span>{c.email}</span></button>)}</div>}
 </div>;
}

function ServiceChoices({value,onChange}){
 return <div className="winnerServiceChoices">{allServices.map(s=><label key={s.id} className="checkLine"><input type="checkbox" checked={value.includes(s.id)} onChange={()=>onChange(value.includes(s.id)?value.filter(id=>id!==s.id):[...value,s.id])}/><span>{s.name}</span></label>)}</div>;
}

export default function WinnerManager(){
 const [pin,setPin]=useState("");
 const [target,setTarget]=useState(null);
 const [customers,setCustomers]=useState([]);
 const [winners,setWinners]=useState([]);
 const [rows,setRows]=useState([blankWinner()]);
 const [msg,setMsg]=useState("");
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  const findTarget=()=>{
   const nodes=[...document.querySelectorAll(".adminSplit")];
   setTarget(nodes.find(n=>n.textContent.includes("Add Fee")&&n.textContent.includes("Discounts"))||null);
  };
  findTarget();
  const observer=new MutationObserver(findTarget);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);

 useEffect(()=>{
  const p=sessionStorage.getItem("vale_admin_pin")||"";
  setPin(p);
  if(p)load(p).catch(e=>setMsg(e.message));
 },[]);

 async function load(p){
  const [a,w]=await Promise.all([
   fetch("/api/admin",{headers:{"x-admin-pin":p},cache:"no-store"}),
   fetch("/api/admin/winners",{headers:{"x-admin-pin":p},cache:"no-store"})
  ]);
  const aj=await a.json();
  const wj=await w.json();
  if(!a.ok)throw Error(aj.error||"Could not load customers.");
  if(!w.ok)throw Error(wj.error||"Could not load winners.");
  setCustomers(aj.customers||[]);
  setWinners(wj.winners||[]);
 }

 function update(i,next){setRows(v=>v.map((r,n)=>n===i?next:r));}
 function addRow(){setRows(v=>[...v,blankWinner()]);}
 function removeRow(i){setRows(v=>v.length===1?v:v.filter((_,n)=>n!==i));}

 async function create(){
  const valid=rows.filter(r=>r.customerId&&r.serviceIds.length);
  if(!valid.length)return setMsg("Choose at least one winner and at least one gift service.");
  if(valid.length!==rows.length)return setMsg("Complete each winner row or remove the empty row.");
  for(const r of valid){
   if((r.date&&!r.start)||(!r.date&&r.start))return setMsg("For a scheduled winner, choose both the date and start time.");
   if(r.maxUses&&(!Number.isInteger(Number(r.maxUses))||Number(r.maxUses)<1))return setMsg("Number of uses must be a positive whole number.");
  }
  setBusy(true);setMsg("");
  try{
   const payload={action:"create_bulk",winners:valid.map(r=>({customerId:r.customerId,serviceIds:r.serviceIds,date:r.date||null,start:r.start||null,maxUses:r.maxUses||null,expiresAt:r.expiresAt||null}))};
   const res=await fetch("/api/admin/winners",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify(payload)});
   const j=await res.json();
   if(!res.ok)throw Error(j.error||"Could not save winner gifts.");
   setMsg(j.message||"Winner gifts added.");
   setRows([blankWinner()]);
   await load(pin);
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }

 async function deactivate(id){
  if(!window.confirm("Deactivate this winner gift?"))return;
  setBusy(true);setMsg("");
  try{
   const r=await fetch("/api/admin/winners",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({action:"deactivate",id})});
   const j=await r.json();
   if(!r.ok)throw Error(j.error||"Could not deactivate winner.");
   setMsg(j.message||"Winner gift deactivated.");
   await load(pin);
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }

 if(!target)return null;
 const content=<section className="adminCard winnerManager" style={{margin:"18px auto",maxWidth:1200}}>
  <style>{`.winnerForm{display:grid;gap:14px;max-width:760px}.winnerRow{border:1px solid var(--line);padding:14px;background:#fff;display:grid;gap:12px}.winnerRowHeader{display:flex;justify-content:space-between;align-items:center}.winnerRow label{display:grid;gap:6px}.winnerRow input{width:100%;box-sizing:border-box}.winnerServiceChoices{display:grid;gap:6px;max-height:230px;overflow:auto;padding:8px;border:1px solid var(--line);background:#fff}.winnerServiceChoices .checkLine{display:flex;align-items:center;gap:8px}.winnerServiceChoices input{width:auto}.winnerCustomerSearch{position:relative}.winnerSuggestions{z-index:40}.winnerActions{display:flex;gap:10px;flex-wrap:wrap}.winnerManager .removeWinner{border:0;background:none;padding:4px 0;color:#a55;cursor:pointer}`}</style>
  <div className="filterHeader"><div><div className="eyebrow">Rewards</div><h3 style={{marginBottom:4}}>Winner Gifts</h3><p className="muted small">Choose one or more winners. Each winner can receive multiple free services and an optional appointment time.</p></div></div>
  <div className="winnerForm">
   {rows.map((r,i)=><div className="winnerRow" key={i}>
    <div className="winnerRowHeader"><strong>Winner {i+1}</strong>{rows.length>1&&<button type="button" className="removeWinner" onClick={()=>removeRow(i)}>Remove</button>}</div>
    <label>Winner / Customer<CustomerSearch customers={customers} value={r} onChange={next=>update(i,next)}/></label>
    <label>Gift service(s)<ServiceChoices value={r.serviceIds} onChange={v=>update(i,{...r,serviceIds:v})}/></label>
    <label>Appointment date <span className="muted small">(optional — leave blank if she will book herself)</span><input type="date" value={r.date} min={new Date().toISOString().slice(0,10)} onChange={e=>update(i,{...r,date:e.target.value})}/></label>
    <label>Start time <span className="muted small">(optional)</span><input type="time" value={r.start} onChange={e=>update(i,{...r,start:e.target.value})}/></label>
    <label>Number of uses <span className="muted small">(optional)</span><input type="number" min="1" step="1" value={r.maxUses} onChange={e=>update(i,{...r,maxUses:e.target.value})}/></label>
    <label>Gift expires at <span className="muted small">(optional)</span><input type="datetime-local" value={r.expiresAt} onChange={e=>update(i,{...r,expiresAt:e.target.value})}/></label>
   </div>)}
   <div className="winnerActions"><button type="button" className="textButton" onClick={addRow}>+ Add another winner</button><button type="button" className="btn" disabled={busy} onClick={create}>{busy?"Saving…":"Send Winner Gifts"}</button></div>
  </div>
  {msg&&<div className={msg.toLowerCase().includes("added")?"success":"error"} style={{marginTop:12}}>{msg}</div>}
  <div style={{marginTop:22}}><h4>Winner history</h4>{winners.length?<div className="adminList">{winners.map(w=>{const person=Array.isArray(w.customer_profiles)?w.customer_profiles[0]:w.customer_profiles;const service=allServices.find(s=>s.id===w.service_id);return <div key={w.id} className="adminBooking"><div style={{padding:14,display:"grid",gap:5}}><strong>{person?.name||"Customer"}</strong><span className="muted">{person?.email||""}</span><span>{service?.name||w.service_id} · FREE · Uses {w.uses||0}{w.max_uses?`/${w.max_uses}`:""}</span><span className="muted small">Expires: {fmt(w.expires_at)} · {w.active?"Active":"Inactive"}</span>{w.active&&<button className="textButton dangerText" disabled={busy} onClick={()=>deactivate(w.id)}>Deactivate gift</button>}</div></div>})}</div>:<p className="muted">No winner gifts yet.</p>}</div>
 </section>;
 return createPortal(content,target);
}
