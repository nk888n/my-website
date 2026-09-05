"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import CustomerDossier from "./CustomerDossier";
function money(v){return `$${Number(v||0).toFixed(2)}`}
export default function AdminEnhancements(){
 const [modal,setModal]=useState(null),[customers,setCustomers]=useState([]),[feeOpen,setFeeOpen]=useState(false),[selected,setSelected]=useState(""),[amount,setAmount]=useState(""),[reason,setReason]=useState("Admin fee"),[notify,setNotify]=useState(false),[msg,setMsg]=useState(""),[saving,setSaving]=useState(false);
 const pin=()=>sessionStorage.getItem("vale_admin_pin")||"";
 useEffect(()=>{
  const onClick=e=>{
   const card=e.target.closest?.(".customerCardButton");
   if(card){setTimeout(()=>{const el=document.querySelector(".profileModal");if(!el)return;const email=el.querySelector('input[type="email"]')?.value||"";const name=el.querySelector(".modalHeader h3")?.textContent||"";fetch("/api/admin",{headers:{"x-admin-pin":pin()},cache:"no-store"}).then(r=>r.json()).then(j=>{const list=j.customers||[];setCustomers(list);const c=list.find(x=>x.email?.toLowerCase()===email.toLowerCase()&&x.name===name)||list.find(x=>x.email?.toLowerCase()===email.toLowerCase());setModal(c||{id:null,name,email,phone:"",address:"",internal_notes:"",bookings:0,attended:0,noShows:0,lateCancels:0,totalSpent:0,outstanding:0,fees:[],discounts:[],history:[]})}).catch(()=>{})},0);return}
   const close=e.target.closest?.(".profileModal .modalHeader .textButton");
   if(close){setModal(null);return}
   if(e.target.classList?.contains("modalBackdrop")){setModal(null);return}
  };
  document.addEventListener("click",onClick);return()=>document.removeEventListener("click",onClick)
 },[]);
 useEffect(()=>{const onTab=()=>{const active=document.querySelector('.adminTabs .adminTab.active');const next=!!active?.textContent.includes("Fees");setFeeOpen(v=>v===next?v:next)};onTab();document.addEventListener("click",onTab);return()=>document.removeEventListener("click",onTab)},[]);
 useEffect(()=>{if(!feeOpen)return;fetch("/api/admin",{headers:{"x-admin-pin":pin()},cache:"no-store"}).then(r=>r.json()).then(j=>setCustomers(j.customers||[])).catch(()=>{});const old=document.querySelector(".adminSplit > .adminCard:first-child");if(old)old.style.display="none";return()=>{if(old)old.style.display=""}},[feeOpen]);
 useEffect(()=>{const el=document.querySelector(".profileModal");if(!el||!modal)return;el.classList.add("legacy-profile-hidden");return()=>el.classList.remove("legacy-profile-hidden")},[modal]);
 const chosen=customers.find(c=>(c.id&&`id:${c.id}`===selected)||(!c.id&&`email:${c.email}`===selected));
 async function addFee(){const c=chosen;if(!c){setMsg("Please choose a customer first.");return}if(!Number.isFinite(Number(amount))||Number(amount)<=0){setMsg("Enter a valid fee amount.");return}if(!confirm(`Add ${money(amount)} fee to ${c.name}?`))return;setSaving(true);setMsg("");try{const r=await fetch("/api/admin/fees",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin()},body:JSON.stringify({customerId:c.id||null,email:c.email,customerName:c.name,amount:Number(amount),reason,notify})});const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not add the fee.");setMsg(j.message||"Fee added.");setAmount("");setReason("Admin fee");setNotify(false);setSelected("");}catch(e){setMsg(e.message)}finally{setSaving(false)}}
 function closeModal(){
  const el=document.querySelector(".profileModal");
  const originalClose=el?.querySelector(".modalHeader .textButton");
  if(originalClose){originalClose.click();}
  setModal(null);
 }
 return <>{modal&&createPortal(<div className="dossierOverlay" role="dialog" aria-modal="true"><div className="dossierOverlayCard"><CustomerDossier customer={modal} onClose={closeModal} onSaved={()=>{}}/></div></div>,document.body)}{feeOpen&&createPortal(<section className="adminCard feeFixCard"><h3>Add fee</h3><p className="muted small">Choose the customer, enter the fee, then save. The fee is recorded even if email notification fails.</p><div className="form"><select value={selected} onChange={e=>{setSelected(e.target.value);setMsg("")}}><option value="">Choose customer</option>{customers.map(c=><option key={c.id||`email:${c.email}`} value={c.id?`id:${c.id}`:`email:${c.email}`}>{c.name} · {c.email}</option>)}</select><input type="number" min="0.01" step="0.01" placeholder="Fee amount" value={amount} onChange={e=>setAmount(e.target.value)}/><input placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)}/><label className="checkLine"><input type="checkbox" checked={notify} onChange={e=>setNotify(e.target.checked)}/> Notify customer by email</label><button className="btn" disabled={saving||!chosen||Number(amount)<=0} onClick={addFee}>{saving?"Saving…":"Add Fee"}</button>{msg&&<p className="muted small">{msg}</p>}</div></section>,document.querySelector(".adminShell")||document.body)}</>}
