"use client";
import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {allServices} from "../../lib/services";

const money=v=>`$${Number(v||0).toFixed(2)}`;
const blankGroup=()=>({customerIds:[],serviceIds:[],kind:"percent",value:""});

function CustomerPicker({customers,value,onChange}){
 const [q,setQ]=useState("");
 const [remote,setRemote]=useState([]);
 const selected=customers.filter(c=>value.includes(c.id));
 const local=customers.filter(c=>!q||`${c.name||""} ${c.email||""}`.toLowerCase().includes(q.toLowerCase()));
 const merged=[...local,...remote.filter(r=>!local.some(c=>c.id===r.id))].slice(0,12);
 useEffect(()=>{
  const term=q.trim();
  if(!term){setRemote([]);return}
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   try{
    const r=await fetch(`/api/customers?name=${encodeURIComponent(term)}`,{cache:"no-store",signal:controller.signal});
    const j=await r.json();
    setRemote(j.customers||[]);
   }catch{if(!controller.signal.aborted)setRemote([])}
  },180);
  return()=>{clearTimeout(timer);controller.abort()};
 },[q]);
 return <div className="discountCustomerPicker">
  <div className="discountSelectedList">{selected.map(c=><button type="button" className="selectedCustomer" key={c.id} onClick={()=>onChange(value.filter(id=>id!==c.id))}>{c.name} · {c.email} ×</button>)}</div>
  <input placeholder="Search name or email…" value={q} onChange={e=>setQ(e.target.value)}/>
  {q&&<div className="customerSuggestions">
   {merged.map(c=><button type="button" key={c.id} onClick={()=>{if(!value.includes(c.id))onChange([...value,c.id]);setQ("")}}><strong>{c.name}</strong><span>{c.email}</span></button>)}
   {!merged.length&&<div className="muted small" style={{padding:10}}>No customer found.</div>}
  </div>}
 </div>;
}

function ServiceChoices({group,onChange}){
 return <div className="discountServiceChoices">{allServices.map(s=><label key={s.id} className="checkLine"><input type="checkbox" checked={group.serviceIds.includes(s.id)} onChange={()=>onChange({...group,serviceIds:group.serviceIds.includes(s.id)?group.serviceIds.filter(id=>id!==s.id):[...group.serviceIds,s.id]})}/><span>{s.name} — {money(s.price)}</span></label>)}</div>;
}

export default function DiscountManager(){
 const[pin,setPin]=useState(""),[target,setTarget]=useState(null),[customers,setCustomers]=useState([]),[scope,setScope]=useState("customer"),[groups,setGroups]=useState([blankGroup()]),[starts,setStarts]=useState(""),[expires,setExpires]=useState(""),[maxUses,setMaxUses]=useState(""),[note,setNote]=useState(""),[notify,setNotify]=useState(true),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{const findTarget=()=>{const nodes=[...document.querySelectorAll(".adminSplit")];const section=nodes.flatMap(n=>[...n.querySelectorAll(":scope > .adminCard")]).find(s=>s.querySelector("h3")?.textContent.trim()==="Discounts");setTarget(section||null);if(section)section.classList.add("discountManagerHost")};findTarget();const observer=new MutationObserver(findTarget);observer.observe(document.body,{childList:true,subtree:true});return()=>{observer.disconnect();document.querySelectorAll(".discountManagerHost").forEach(x=>x.classList.remove("discountManagerHost"))}},[]);
 useEffect(()=>{const p=sessionStorage.getItem("vale_admin_pin")||"";setPin(p);if(!p)return;fetch("/api/admin",{headers:{"x-admin-pin":p},cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Could not load customers.");setCustomers(j.customers||[])}).catch(e=>setMsg(e.message))},[]);
 function updateGroup(i,next){setGroups(v=>v.map((g,n)=>n===i?next:g))}
 function addGroup(){setGroups(v=>[...v,blankGroup()])}
 function removeGroup(i){setGroups(v=>v.length===1?v:v.filter((_,n)=>n!==i))}
 async function save(){
  const valid=groups.filter(g=>g.serviceIds.length&&Number(g.value)>0&&Number.isFinite(Number(g.value)));
  if(scope==="customer"&&valid.some(g=>!g.customerIds.length))return setMsg("Choose at least one customer for every discount.");
  if(!valid.length)return setMsg("Add at least one service and discount value.");
  const seen=new Set();
  for(const g of valid){
   for(const id of g.serviceIds){if(scope==="customer"&&seen.has(id))return setMsg("A service can only appear in one discount row.");if(scope==="customer")seen.add(id)}
   if(g.kind==="percent"&&Number(g.value)>100)return setMsg("Percent discounts cannot be more than 100%.");
  }
  setBusy(true);setMsg("");
  try{
   const endpoint=scope==="customer"?"/api/admin/discount-groups":"/api/admin";
   const body=scope==="customer"
    ?{discountGroups:valid,startsAt:starts||null,expiresAt:expires||null,maxUses:maxUses||null,note,notify}
    :{action:"service_discount",serviceIds:valid.flatMap(g=>g.serviceIds),kind:valid[0].kind,value:Number(valid[0].value),startsAt:starts||null,expiresAt:expires||null,maxUses:maxUses||null,note};
   const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||"Could not activate discount.");setMsg(j.message||"Discount activated.");setGroups([blankGroup()]);setStarts("");setExpires("");setMaxUses("");setNote("");
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }
 if(!target)return null;
 const content=<>
  <style jsx global>{`.discountManagerHost>.form{display:none!important}.discountManagerHost>.discountManager{display:block}.discountManager{margin-top:8px}.discountCustomerPicker{position:relative}.discountSelectedList{display:grid;gap:6px;margin-bottom:8px}.discountSelectedList:empty{display:none}.discountGroup{border:1px solid var(--line);padding:12px;margin:10px 0;background:#fff}.discountGroupHeader{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}.discountGroupHeader strong{font-size:15px}.discountServiceChoices{display:grid;gap:6px;max-height:220px;overflow:auto;padding:8px;border:1px solid var(--line);background:#fff}.discountValueRow{display:grid;grid-template-columns:minmax(150px,1fr) minmax(130px,1fr);gap:10px;margin-top:10px}.discountManagerActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.discountManager .btn{margin-top:8px}.discountHelp{margin:5px 0 10px}.discountManager label{display:grid;gap:5px}.discountManager .checkLine{display:flex;align-items:center;gap:8px}.discountManager .checkLine input{width:auto}.discountManager textarea{width:100%;resize:vertical}.discountManager input,.discountManager select,.discountManager textarea{box-sizing:border-box}.discountManager .removeGroup{border:0;background:none;padding:4px 0;color:#a55;cursor:pointer}.discountManager .statusGood{margin-top:8px}.discountManager .customerSuggestions{z-index:40;position:absolute;left:0;right:0;background:#fff;border:1px solid var(--line);box-shadow:0 8px 20px rgba(0,0,0,.08);max-height:260px;overflow:auto}.discountManager .customerSuggestions button{display:grid;width:100%;text-align:left;border:0;background:#fff;padding:9px 10px;cursor:pointer;gap:2px}.discountManager .customerSuggestions button:hover{background:#f8f1ef}`}</style>
  <section className="adminCard discountManager" style={{marginTop:8}}>
   <p className="muted small discountHelp">Create different discounts for different customers and services, then send them together in one action.</p>
   {scope==="customer"&&groups.map((g,i)=><div className="discountGroup" key={i}>
    <div className="discountGroupHeader"><strong>Discount {i+1}</strong>{groups.length>1&&<button type="button" className="removeGroup" onClick={()=>removeGroup(i)}>Remove</button>}</div>
    <label>Customer(s)<CustomerPicker customers={customers} value={g.customerIds} onChange={v=>updateGroup(i,{...g,customerIds:v})}/></label>
    <label style={{marginTop:10}}>Apply to service(s)<ServiceChoices group={g} onChange={next=>updateGroup(i,next)}/></label>
    <div className="discountValueRow"><label>Discount type<select value={g.kind} onChange={e=>updateGroup(i,{...g,kind:e.target.value})}><option value="percent">Percent %</option><option value="fixed">Fixed $</option></select></label><label>Discount value<input type="number" min="0.01" step="0.01" placeholder={g.kind==="percent"?"e.g. 50":"e.g. 25"} value={g.value} onChange={e=>updateGroup(i,{...g,value:e.target.value})}/></label></div>
   </div>)}
   {scope!=="customer"&&<div className="discountGroup"><label>Apply to service(s)<ServiceChoices group={groups[0]} onChange={next=>updateGroup(0,next)}/><div className="discountValueRow"><label>Discount type<select value={groups[0].kind} onChange={e=>updateGroup(0,{...groups[0],kind:e.target.value})}><option value="percent">Percent %</option><option value="fixed">Fixed $</option></select></label><label>Discount value<input type="number" min="0.01" step="0.01" value={groups[0].value} onChange={e=>updateGroup(0,{...groups[0],value:e.target.value})}/></label></div></div>}
   {scope==="customer"&&<button type="button" className="textButton" onClick={addGroup}>+ Add another discount</button>}
   <label style={{marginTop:14}}>Discount type<select value={scope} onChange={e=>setScope(e.target.value)}><option value="customer">Customer-specific discount</option><option value="service">Service discount for everyone</option></select></label>
   <div style={{display:"grid",gap:10,marginTop:14}}><label>Start date/time <span className="muted small">(optional — blank means now)</span><input type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></label><label>End date/time <span className="muted small">(optional)</span><input type="datetime-local" value={expires} onChange={e=>setExpires(e.target.value)}/></label><label>Maximum uses per discount <span className="muted small">(optional)</span><input type="number" min="1" step="1" placeholder="No limit" value={maxUses} onChange={e=>setMaxUses(e.target.value)}/></label><label>Note <span className="muted small">(optional)</span><textarea rows="2" placeholder="Optional note" value={note} onChange={e=>setNote(e.target.value)}/></label></div>
   {scope==="customer"&&<label className="checkLine" style={{marginTop:12}}><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/> Send one email per selected customer containing their discounts</label>}
   <div className="discountManagerActions"><button type="button" className="btn" disabled={busy} onClick={save}>{busy?"Saving…":"Activate Discount(s)"}</button></div>
   {msg&&<div className={msg.toLowerCase().includes("activated")?"success":"error"} style={{marginTop:12}}>{msg}</div>}
  </section>
 </>;
 return createPortal(content,target);
}
