"use client";
import {useEffect} from "react";

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export default function AllCustomersControl(){
 useEffect(()=>{
  let observer;
  let busy=false;
  function addControl(){
   const headings=[...document.querySelectorAll("h3")];
   const heading=headings.find(x=>x.textContent?.trim()==="Recipients");
   if(!heading||heading.parentElement?.querySelector("[data-all-customers-control]"))return;
   const button=document.createElement("button");
   button.type="button";
   button.textContent="Send to all customers";
   button.setAttribute("data-all-customers-control","true");
   button.className="btn";
   button.style.marginTop="10px";
   button.style.width="auto";
   button.addEventListener("click",async()=>{
    if(busy)return;
    const pin=sessionStorage.getItem("vale_admin_pin");
    if(!pin){window.alert("Please log in to the admin dashboard again.");return;}
    busy=true;button.disabled=true;button.textContent="Selecting all customers…";
    try{
     const r=await fetch("/api/admin",{headers:{"x-admin-pin":pin},cache:"no-store"});
     const j=await r.json();
     if(!r.ok)throw new Error(j.error||"Could not load customers.");
     const all=Array.isArray(j.customers)?j.customers.filter(c=>c?.id&&String(c.email||"").trim()):[];
     const input=heading.parentElement.querySelector("input.adminSearch");
     if(!input)throw new Error("Customer search is unavailable.");
     for(const c of all){
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
      setter?.call(input,String(c.name||c.email));
      input.dispatchEvent(new Event("input",{bubbles:true}));
      await sleep(100);
      const suggestions=[...heading.parentElement.querySelectorAll(".customerSuggestions button")];
      const id=String(c.id);
      const email=String(c.email||"").trim().toLowerCase();
      const name=String(c.name||"").trim().toLowerCase();
      const match=suggestions.find(x=>x.dataset.customerId===id)
       ||suggestions.find(x=>x.textContent.toLowerCase().includes(email)&&x.textContent.toLowerCase().includes(name))
       ||suggestions.find(x=>x.textContent.toLowerCase().includes(email));
      if(match)match.click();
      await sleep(100);
     }
     button.textContent=`All customers selected (${all.length})`;
    }catch(e){window.alert(e.message||"Could not select all customers.");button.textContent="Send to all customers"}
    finally{busy=false;button.disabled=false}
   });
   heading.parentElement.appendChild(button);
  }
  addControl();
  observer=new MutationObserver(addControl);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer?.disconnect();
 },[]);
 return null;
}
