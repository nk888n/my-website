"use client";
import {useEffect} from "react";

function esc(v){return String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function actionLabel(action){
  return String(action||"").replaceAll("_"," ");
}
function customerName(rows,email){
  const e=String(email||"").trim().toLowerCase();
  return rows.find(c=>String(c.email||"").trim().toLowerCase()===e)?.name||"Customer";
}

export default function ActivityEnhancer(){
  useEffect(()=>{
    let cancelled=false;
    let observer;
    async function render(){
      const heading=[...document.querySelectorAll("h3")].find(x=>x.textContent?.trim()==="Activity");
      if(!heading) return;
      const card=heading.parentElement;
      if(!card||card.querySelector("[data-activity-enhanced]")) return;
      const pin=sessionStorage.getItem("vale_admin_pin");
      if(!pin) return;
      try{
        const r=await fetch("/api/admin",{headers:{"x-admin-pin":pin},cache:"no-store"});
        const data=await r.json();
        if(!r.ok||cancelled) return;
        const rows=data.audit||[];
        const customers=data.customers||[];
        [...card.children].forEach(el=>{if(el!==heading)el.style.display="none";});
        const wrap=document.createElement("div");
        wrap.setAttribute("data-activity-enhanced","true");
        wrap.style.marginTop="14px";
        rows.forEach(row=>{
          const item=document.createElement("div");
          item.style.padding="11px 0";
          item.style.borderBottom="1px solid var(--line)";
          const name=customerName(customers,row.email);
          const email=String(row.email||"");
          const time=row.created_at?new Date(row.created_at).toLocaleString():"—";
          const details=row.details&&typeof row.details==="object"?row.details:{};
          let detail="";
          if(details.reason)detail=`Reason: ${details.reason}`;
          if(details.notify!==undefined)detail+=(detail?" · ":"")+`Customer notified: ${details.notify?"Yes":"No"}`;
          item.innerHTML=`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:18px"><div style="min-width:0"><div style="font-weight:600;font-size:15px">${esc(actionLabel(row.action))}</div><div style="margin-top:3px;font-size:13px;line-height:1.35"><span style="font-weight:500">${esc(name)}</span><span style="display:block;color:#8b8580;font-size:11px;opacity:.78;word-break:break-all">${esc(email)}</span>${detail?`<span style="display:block;color:#756f6a;font-size:12px;margin-top:4px">${esc(detail)}</span>`:""}</div></div><div style="flex:0 0 auto;color:#8b8580;font-size:11px;white-space:nowrap;text-align:right">${esc(time)}</div></div>`;
          wrap.appendChild(item);
        });
        card.appendChild(wrap);
      }catch{}
    }
    render();
    observer=new MutationObserver(()=>render());
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>{cancelled=true;observer?.disconnect()};
  },[]);
  return null;
}
