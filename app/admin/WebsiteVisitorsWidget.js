"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

export default function WebsiteVisitorsWidget(){
  const[target,setTarget]=useState(null),[stats,setStats]=useState(null);
  useEffect(()=>{
    const find=()=>{
      if(sessionStorage.getItem("vale_admin_tab")==="dashboard")setTarget(document.querySelector(".adminGrid"));
      else setTarget(null);
    };
    find();
    const observer=new MutationObserver(find);
    observer.observe(document.body,{childList:true,subtree:true});
    const onStorage=find;
    window.addEventListener("storage",onStorage);
    const timer=setInterval(find,500);
    return()=>{observer.disconnect();window.removeEventListener("storage",onStorage);clearInterval(timer)};
  },[]);
  useEffect(()=>{
    if(!target)return;
    const pin=sessionStorage.getItem("vale_admin_pin");
    if(!pin)return;
    fetch("/api/admin/visitor-stats",{headers:{"x-admin-pin":pin},cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>j&&setStats(j)).catch(()=>{});
  },[target]);
  if(!target||!stats)return null;
  return createPortal(<div className="adminCard stat"><strong>{stats.visitors}</strong><span>Website Visitors</span><small>Today: {stats.today}</small></div>,target);
}
