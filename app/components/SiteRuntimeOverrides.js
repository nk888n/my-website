"use client";
import {useEffect} from "react";

function applyContent(content){
  if(!content||typeof content!=="object")return;
  const elements=content.elements||{};
  Object.entries(elements).forEach(([selector,cfg])=>{
    document.querySelectorAll(selector).forEach(el=>{
      if(cfg.hidden!=null)el.style.display=cfg.hidden?"none":"";
      if(cfg.text!=null&&!["IMG","VIDEO","INPUT","TEXTAREA"].includes(el.tagName))el.textContent=cfg.text;
      if(cfg.src&&(el.tagName==="IMG"||el.tagName==="VIDEO"))el.src=cfg.src;
      if(cfg.href&&el.tagName==="A")el.href=cfg.href;
      if(cfg.styles&&typeof cfg.styles==="object")Object.entries(cfg.styles).forEach(([k,v])=>{el.style[k]=v??""});
    });
  });
  const blocks=content.customBlocks||{};
  Object.entries(blocks).forEach(([selector,list])=>{
    document.querySelectorAll(selector).forEach(parent=>{
      parent.querySelectorAll("[data-site-custom-block]").forEach(x=>x.remove());
      (Array.isArray(list)?list:[]).forEach(block=>{
        const wrap=document.createElement("div");
        wrap.setAttribute("data-site-custom-block",block.id||"");
        wrap.innerHTML=block.html||"";
        if(block.styles)Object.assign(wrap.style,block.styles);
        parent.appendChild(wrap);
      });
    });
  });
  const g=content.globals||{};
  if(g.fontFamily)document.documentElement.style.setProperty("--site-editor-font",g.fontFamily);
  if(g.background)document.documentElement.style.setProperty("--site-editor-background",g.background);
  if(g.accent)document.documentElement.style.setProperty("--site-editor-accent",g.accent);
}

export default function SiteRuntimeOverrides(){
 useEffect(()=>{
  let dead=false;
  fetch("/api/site-content",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(!dead)applyContent(j.content||{})}).catch(()=>{});
  return()=>{dead=true};
 },[]);
 return null;
}