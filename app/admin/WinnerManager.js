"use client";
import {useEffect,useMemo,useState} from "react";
import {allServices} from "../../lib/services";

const money=v=>`$${Number(v||0).toFixed(2)}`;
const fmt=v=>v?new Date(v).toLocaleString():"No expiration";

export default function WinnerManager(){
 const[pin,setPin]=useState("");
 const[customers,setCustomers]=useState([]),[winners,setWinners]=useState([]),[customerId,setCustomerId]=useState(""),[serviceId,setServiceId]=useState(""),[prizeName,setPrizeName]=useState(""),[expiresAt,setExpiresAt]=useState(""),[maxUses,setMaxUses]=useState("1"),[q,setQ]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const services=useMemo(()=>allServices,[ ]);
 const filtered=useMemo(()=>customers.filter(c=>!q||`${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase())).slice(0,20),[customers,q]);
 async function load(p){
  const [a,w]=await Promise.all([
   fetch("/api/admin",{headers:{"x-admin-pin":p},cache:"no-store"}),
   fetch("/api/admin/winners",{headers:{"x-admin-pin":p},cache:"no-store"})
  ]);
  const aj=await a.json(),wj=await w.json();
  if(!a.ok)throw Error(aj.error||"Could not load customers.");
  if(!w.ok)throw Error(wj.error||"Could not load winners.");
  setCustomers(aj.customers||[]);setWinners(wj.winners||[]);
 }
 useEffect(()=>{const p=sessionStorage.getItem("vale_admin_pin")||"";setPin(p);if(p)load(p).catch(e=>setMsg(e.message))},[]);
 async function create(){
  if(!customerId||!serviceId||!prizeName.trim())return setMsg("Choose a winner, service and prize name.");
  setBusy(true);setMsg("");
  try{
   const r=await fetch("/api/admin/winners",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({action:"create",customerId,serviceId,prizeName:prizeName.trim(),expiresAt,maxUses})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Could not save winner gift.");
   setMsg(j.message||"Winner gift added.");setCustomerId("");setQ("");setServiceId("");setPrizeName("");setExpiresAt("");setMaxUses("1");await load(pin);
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }
 async function deactivate(id){
  if(!window.confirm("Deactivate this winner gift?"))return;
  setBusy(true);setMsg("");
  try{const r=await fetch("/api/admin/winners",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({action:"deactivate",id})});const j=await r.json();if(!r.ok)throw Error(j.error||"Could not deactivate winner.");setMsg(j.message||"Winner gift deactivated.");await load(pin)}catch(e){setMsg(e.message)}finally{setBusy(false)}
 }
 return <section className="adminCard winnerManager" style={{margin:"18px auto",maxWidth:1200}}>
  <div className="filterHeader"><div><div className="eyebrow">Rewards</div><h3 style={{marginBottom:4}}>Winner Gifts</h3><p className="muted small">Give a specific customer a free service without requiring a previous booking.</p></div></div>
  <div className="winnerFormGrid">
   <label>Winner / Customer<input placeholder="Search name or email…" value={q} onChange={e=>{setQ(e.target.value);setCustomerId("")}}/>{q&&<div className="customerSuggestions winnerSuggestions">{filtered.map(c=><button type="button" key={c.id} onClick={()=>{setCustomerId(c.id);setQ(`${c.name} · ${c.email}`)}}><strong>{c.name}</strong><span>{c.email}</span></button>)}</div>}{customerId&&<div className="statusGood small">Selected customer ✓</div>}</label>
   <label>Gift / Service<select value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">Choose a service…</option>{services.map(s=><option key={s.id} value={s.id}>{s.name} — {money(s.price)}</option>)}</select></label>
   <label>Prize name<input placeholder="e.g. Free Facial" value={prizeName} onChange={e=>setPrizeName(e.target.value)}/></label>
   <label>Expires at <span className="muted small">(optional)</span><input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)}/></label>
   <label>Number of uses <span className="muted small">(optional)</span><input type="number" min="1" step="1" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="1"/></label>
  </div>
  <button className="btn" disabled={busy} onClick={create}>{busy?"Saving…":"Add Winner Gift"}</button>
  {msg&&<div className={msg.toLowerCase().includes("gift added")||msg.toLowerCase().includes("deactivated")?"success":"error"} style={{marginTop:12}}>{msg}</div>}
  <div style={{marginTop:22}}><h4>Winner history</h4>{winners.length?<div className="adminList">{winners.map(w=>{const person=Array.isArray(w.customer_profiles)?w.customer_profiles[0]:w.customer_profiles;const service=services.find(s=>s.id===w.service_id);return <div key={w.id} className="adminBooking"><div style={{padding:14,display:"grid",gap:5}}><strong>{person?.name||"Customer"} · {w.prize_name}</strong><span className="muted">{person?.email||""}</span><span>{service?.name||w.service_id} · FREE · Uses {w.uses||0}{w.max_uses?`/${w.max_uses}`:""}</span><span className="muted small">Expires: {fmt(w.expires_at)} · {w.active?"Active":"Inactive"}</span>{w.active&&<button className="textButton dangerText" disabled={busy} onClick={()=>deactivate(w.id)}>Deactivate gift</button>}</div></div>})}</div>:<p className="muted">No winner gifts yet.</p>}</div>
 </section>
}
