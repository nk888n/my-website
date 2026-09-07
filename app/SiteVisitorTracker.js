"use client";
import {useEffect} from "react";

export default function SiteVisitorTracker(){
  useEffect(()=>{
    if(window.location.pathname.startsWith("/admin"))return;
    try{
      if(sessionStorage.getItem("vale_visit_tracked"))return;
      sessionStorage.setItem("vale_visit_tracked","1");
    }catch{}
    fetch("/api/analytics/visit",{method:"POST",credentials:"include",keepalive:true}).catch(()=>{});
  },[]);
  return null;
}
