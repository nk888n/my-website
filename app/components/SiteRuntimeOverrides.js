"use client";
import {useEffect} from "react";

function applyElementOverrides(doc,pageContent){
  const elements=pageContent?.elements||{};
  Object.entries(elements).forEach(([selector,cfg])=>{
    if(!selector||!cfg||typeof cfg!=="object")return;
    let nodes=[];
    try{nodes=[...doc.querySelectorAll(selector)]}catch{return}
    nodes.forEach(el=>{
      if(cfg.hidden===true)el.style.display="none";
      if(cfg.hidden===false)el.style.removeProperty("display");
      if(cfg.text!=null&&!["IMG","VIDEO","INPUT","TEXTAREA","SELECT","OPTION"].includes(el.tagName))el.textContent=String(cfg.text);
      if(cfg.src&&(el.tagName==="IMG"||el.tagName==="VIDEO"))el.src=String(cfg.src);
      if(cfg.href&&el.tagName==="A")el.href=String(cfg.href);
      if(cfg.styles&&typeof cfg.styles==="object")Object.entries(cfg.styles).forEach(([key,value])=>{
        if(typeof value==="string"||typeof value==="number")el.style[key]=String(value);
      });
    });
  });
  Object.entries(pageContent?.customBlocks||{}).forEach(([selector,blocks])=>{
    let parents=[];try{parents=[...doc.querySelectorAll(selector)]}catch{return}
    parents.forEach(parent=>{
      parent.querySelectorAll(":scope > [data-site-custom-block]").forEach(node=>node.remove());
      (Array.isArray(blocks)?blocks:[]).forEach(block=>{
        if(!block?.html)return;
        const wrapper=doc.createElement("div");
        wrapper.setAttribute("data-site-custom-block",String(block.id||""));
        wrapper.innerHTML=String(block.html);
        if(block.styles&&typeof block.styles==="object")Object.entries(block.styles).forEach(([key,value])=>{if(typeof value==="string"||typeof value==="number")wrapper.style[key]=String(value)});
        parent.appendChild(wrapper);
      });
    });
  });
}

function applyTheme(doc,globals){
  if(!globals||typeof globals!=="object")return;
  const root=doc.documentElement;
  const vars={"--bg":globals.background,"--cream":globals.surface,"--ink":globals.text,"--muted":globals.muted,"--rose":globals.primary,"--gold":globals.accent,"--line":globals.border,"--danger":globals.danger};
  Object.entries(vars).forEach(([key,value])=>{if(typeof value==="string"&&value.trim())root.style.setProperty(key,value)});
}

export default function SiteRuntimeOverrides(){
  useEffect(()=>{
    let dead=false;
    async function load(){
      try{
        const response=await fetch("/api/site-content",{cache:"no-store"});
        const json=await response.json();
        if(dead)return;
        const content=json?.content||{};
        const path=window.location.pathname.replace(/\/$/,"")||"/";
        const pageContent=content.pages?.[path]||{};
        applyElementOverrides(document,pageContent);
        applyTheme(document,content.globals||{});
      }catch{}
    }
    load();
    return()=>{dead=true};
  },[]);
  return null;
}