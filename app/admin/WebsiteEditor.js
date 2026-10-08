"use client";
import {useEffect,useRef,useState} from "react";
import "./website-editor.css";

function selectorFor(el){
  if(!el||el.nodeType!==1||["HTML","BODY"].includes(el.tagName))return "";
  const parts=[];let cur=el;
  while(cur&&cur.nodeType===1&&cur.tagName!=="BODY"){
    if(cur.id){parts.unshift("#"+CSS.escape(cur.id));break}
    const parent=cur.parentElement;if(!parent)break;
    const same=[...parent.children].filter(x=>x.tagName===cur.tagName);
    parts.unshift(cur.tagName.toLowerCase()+":nth-of-type("+(same.indexOf(cur)+1)+")");
    cur=parent;
  }
  return parts.join(" > ");
}
function elementLabel(el){const text=String(el?.innerText||el?.alt||"").replace(/\s+/g," ").trim();return text.slice(0,90)||String(el?.tagName||"").toLowerCase()}
function readStyles(el){const s=el?.style||{};return{color:s.color||"",backgroundColor:s.backgroundColor||"",fontSize:s.fontSize||"",fontWeight:s.fontWeight||"",textAlign:s.textAlign||"",marginTop:s.marginTop||"",marginBottom:s.marginBottom||"",padding:s.padding||"",transform:s.transform||""}}

export default function WebsiteEditor({pin}){
 const iframeRef=useRef(null),fileRef=useRef(null),uploadKind=useRef("image"),dragRef=useRef(null);
 const [page,setPage]=useState("/"),[content,setContent]=useState({pages:{},globals:{}}),[selected,setSelected]=useState(null),[saving,setSaving]=useState(false),[msg,setMsg]=useState(""),[dirty,setDirty]=useState(false),[text,setText]=useState(""),[src,setSrc]=useState(""),[href,setHref]=useState(""),[hidden,setHidden]=useState(false),[styles,setStyles]=useState(readStyles(null)),[addHtml,setAddHtml]=useState("<div style='padding:30px;text-align:center'>New section</div>");

 useEffect(()=>{fetch("/api/site-content",{cache:"no-store"}).then(r=>r.json()).then(j=>setContent(j.content||{pages:{},globals:{}})).catch(()=>{})},[]);
 useEffect(()=>{setSelected(null);setMsg("");if(iframeRef.current)iframeRef.current.src=page},[page]);

 function pageData(){return content.pages?.[page]||{elements:{},customBlocks:{}}}
 function clearOutline(doc){doc.querySelectorAll("[data-editor-selected]").forEach(x=>{x.removeAttribute("data-editor-selected");x.style.outline=""})}
 function applyPreview(){
  const doc=iframeRef.current?.contentDocument;if(!doc)return;
  clearOutline(doc);
  const data=pageData();
  Object.entries(data.elements||{}).forEach(([sel,cfg])=>doc.querySelectorAll(sel).forEach(el=>{
    if(cfg.hidden===true)el.style.display="none";
    if(cfg.hidden===false)el.style.removeProperty("display");
    if(cfg.text!=null&&!["IMG","VIDEO","INPUT","TEXTAREA","SELECT","OPTION"].includes(el.tagName))el.textContent=cfg.text;
    if(cfg.src&&(el.tagName==="IMG"||el.tagName==="VIDEO"))el.src=cfg.src;
    if(cfg.href&&el.tagName==="A")el.href=cfg.href;
    if(cfg.styles)Object.entries(cfg.styles).forEach(([k,v])=>el.style[k]=v||"");
  }));
  Object.entries(data.customBlocks||{}).forEach(([sel,list])=>doc.querySelectorAll(sel).forEach(parent=>{
    parent.querySelectorAll(":scope > [data-site-custom-block]").forEach(x=>x.remove());
    (list||[]).forEach(block=>{if(!block?.html)return;const w=doc.createElement("div");w.setAttribute("data-site-custom-block",block.id||"");w.innerHTML=block.html;if(block.styles)Object.assign(w.style,block.styles);parent.appendChild(w)});
  }));
 }
 function onLoad(){
  const doc=iframeRef.current?.contentDocument;if(!doc)return;
  applyPreview();
  doc.addEventListener("click",handleClick,true);
 }
 function handleClick(e){
  const el=e.target?.closest?.("*");if(!el||el.closest("[data-site-editor-ignore]"))return;
  e.preventDefault();e.stopPropagation();
  const sel=selectorFor(el);if(!sel)return;
  const cfg=pageData().elements?.[sel]||{};
  const savedTransform=cfg.styles?.transform||"";
  const match=/translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(savedTransform);
  setSelected({selector:sel,tag:el.tagName,label:elementLabel(el),isMedia:["IMG","VIDEO"].includes(el.tagName),x:match?Number(match[1]):0,y:match?Number(match[2]):0});
  setText(cfg.text!=null?cfg.text:(el.tagName==="IMG"?el.alt||"":el.tagName==="VIDEO"?"":el.innerText||""));
  setSrc(cfg.src||el.currentSrc||el.src||"");setHref(cfg.href||el.href||"");setHidden(cfg.hidden===true);setStyles({...readStyles(el),...(cfg.styles||{})});
  clearOutline(el.ownerDocument);el.setAttribute("data-editor-selected","true");el.style.outline="2px solid #b88b6a";
 }
 function updateCfg(patch){
  if(!selected)return;
  setContent(prev=>{
   const pages={...(prev.pages||{})},current={...(pages[page]||{})},elements={...(current.elements||{})};
   elements[selected.selector]={...(elements[selected.selector]||{}),...patch};
   pages[page]={...current,elements};
   return {...prev,pages};
  });
  setDirty(true);
 }
 useEffect(()=>{if(iframeRef.current?.contentDocument)applyPreview()},[content,page]);
 function updateGlobal(k,v){setContent(prev=>({...prev,globals:{...(prev.globals||{}),[k]:v}}));const root=iframeRef.current?.contentDocument?.documentElement;if(root){const map={background:"--bg",surface:"--cream",text:"--ink",muted:"--muted",primary:"--rose",accent:"--gold",border:"--line",danger:"--danger"};if(map[k])root.style.setProperty(map[k],v)}setDirty(true)}
 function updateStyle(k,v){const next={...styles,[k]:v};setStyles(next);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el)el.style[k]=v||"";updateCfg({styles:next})}
 function changeText(v){setText(v);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el&&!["IMG","VIDEO","INPUT","TEXTAREA","SELECT","OPTION"].includes(el.tagName))el.textContent=v;updateCfg({text:v})}
 function changeSrc(v){setSrc(v);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el&&(el.tagName==="IMG"||el.tagName==="VIDEO"))el.src=v;updateCfg({src:v})}
 function changeHref(v){setHref(v);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el?.tagName==="A")el.href=v;updateCfg({href:v})}
 function toggleHidden(){const v=!hidden;setHidden(v);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el)el.style.display=v?"none":"";updateCfg({hidden:v})}
 function moveBy(dx,dy){const x=Number(selected?.x||0)+dx,y=Number(selected?.y||0)+dy;const next={...styles,transform:"translate("+x+"px, "+y+"px)"};setStyles(next);const el=iframeRef.current?.contentDocument?.querySelector(selected?.selector);if(el)el.style.transform=next.transform;updateCfg({styles:next});setSelected(s=>({...s,x,y}))}
 function startDrag(e){
  if(!selected||e.button!==0)return;e.preventDefault();
  const start={x:e.clientX,y:e.clientY,ox:selected.x||0,oy:selected.y||0};dragRef.current=start;
  const move=ev=>{const d=dragRef.current;if(!d)return;const x=d.ox+ev.clientX-d.x,y=d.oy+ev.clientY-d.y;const next={...styles,transform:"translate("+x+"px, "+y+"px)"};setStyles(next);setSelected(s=>({...s,x,y}));const el=iframeRef.current?.contentDocument?.querySelector(selected.selector);if(el)el.style.transform=next.transform;updateCfg({styles:next})};
  const up=()=>{dragRef.current=null;window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};
  window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
 }
 async function save(){
  setSaving(true);setMsg("");
  try{const r=await fetch("/api/admin/site-content",{method:"POST",headers:{"content-type":"application/json","x-admin-pin":pin},body:JSON.stringify({content})});const j=await r.json();if(!r.ok)throw Error(j.error||"Save failed");setDirty(false);setMsg("Saved ✓")}catch(e){setMsg(e.message)}finally{setSaving(false)}
 }
 function openUpload(kind){uploadKind.current=kind;fileRef.current?.click()}
 async function upload(e){
  const file=e.target.files?.[0];e.target.value="";if(!file)return;
  const form=new FormData();form.append("file",file);setMsg("Uploading…");
  try{const r=await fetch("/api/admin/site-content/upload",{method:"POST",headers:{"x-admin-pin":pin},body:form});const j=await r.json();if(!r.ok)throw Error(j.error||"Upload failed");changeSrc(j.url);setMsg("Media uploaded ✓")}catch(err){setMsg(err.message)}
 }
 function addBlock(){
  const parent=selected?.selector||"main",block={id:Date.now().toString(36)+Math.random().toString(36).slice(2),html:addHtml};
  setContent(prev=>{const pages={...(prev.pages||{})},current={...(pages[page]||{})};pages[page]={...current,customBlocks:{...(current.customBlocks||{}),[parent]:[...(current.customBlocks?.[parent]||[]),block]}};return {...prev,pages}});
  setDirty(true);setMsg("New block added.");
 }

 const g=content.globals||{};
 return <section className="siteEditor">
  <div className="siteEditorHead"><div><h3>Website Editor</h3><p className="muted small">Visual design editor. Booking is intentionally protected.</p></div><div className="siteEditorActions"><span className="editorProtected">🔒 Booking protected</span><select value={page} onChange={e=>setPage(e.target.value)}><option value="/">Home page</option><option value="/services">Services page</option></select><button className="btn" onClick={save} disabled={saving||!dirty}>{saving?"Saving…":"Save changes"}</button></div></div>
  <div className="siteEditorLayout">
   <div className="siteEditorPreview"><iframe ref={iframeRef} title="Website visual editor" src={page} onLoad={onLoad}/></div>
   <aside className="siteEditorPanel">
    {!selected?<><div className="editorTheme"><h4>Theme</h4><p>Changes here affect the visual theme only.</p><div className="editorThemeGrid"><label>Background<input type="color" value={g.background||"#F8F1EE"} onChange={e=>updateGlobal("background",e.target.value)}/></label><label>Surface<input type="color" value={g.surface||"#FCF8F5"} onChange={e=>updateGlobal("surface",e.target.value)}/></label><label>Text<input type="color" value={g.text||"#29202A"} onChange={e=>updateGlobal("text",e.target.value)}/></label><label>Primary<input type="color" value={g.primary||"#A96B76"} onChange={e=>updateGlobal("primary",e.target.value)}/></label><label>Accent<input type="color" value={g.accent||"#B99663"} onChange={e=>updateGlobal("accent",e.target.value)}/></label><label>Border<input type="color" value={g.border||"#E7D8D2"} onChange={e=>updateGlobal("border",e.target.value)}/></label></div></div><div className="editorEmpty"><strong>Click an element</strong><span>Text, image, video, heading or button.</span><span>Booking page is not available here.</span></div><div className="editorAdd"><h4>Add new block</h4><textarea value={addHtml} onChange={e=>setAddHtml(e.target.value)} rows={5}/><button className="textButton" onClick={addBlock}>+ Add to page</button></div></>:<>
     <div className="editorSelected"><span>{selected.tag}</span><strong>{selected.label}</strong></div>
     {!selected.isMedia&&<label>Text<textarea rows={7} value={text} onChange={e=>changeText(e.target.value)}/></label>}
     {selected.isMedia&&<><label>{selected.tag==="IMG"?"Image":"Video"} URL<input value={src} onChange={e=>changeSrc(e.target.value)}/></label><div className="editorButtons"><button className="textButton" onClick={()=>openUpload(selected.tag==="IMG"?"image":"video")}>Change {selected.tag==="IMG"?"image":"video"}</button><button className="textButton" onClick={()=>changeSrc("")}>Remove media</button></div></>}
     {selected.tag==="A"&&<label>Link<input value={href} onChange={e=>changeHref(e.target.value)}/></label>}
     <div className="editorTwo"><label>Text color<input type="color" value={styles.color||"#000000"} onChange={e=>updateStyle("color",e.target.value)}/></label><label>Background<input type="color" value={styles.backgroundColor||"#ffffff"} onChange={e=>updateStyle("backgroundColor",e.target.value)}/></label></div>
     <div className="editorTwo"><label>Font size<input placeholder="e.g. 32px" value={styles.fontSize} onChange={e=>updateStyle("fontSize",e.target.value)}/></label><label>Weight<select value={styles.fontWeight||""} onChange={e=>updateStyle("fontWeight",e.target.value)}><option value="">Default</option><option>400</option><option>500</option><option>600</option><option>700</option></select></label></div>
     <div className="editorMove"><h4>Move</h4><div className="moveGrid"><button onClick={()=>moveBy(0,-10)}>↑</button><button onClick={()=>moveBy(-10,0)}>←</button><button onPointerDown={startDrag}>✥ Drag</button><button onClick={()=>moveBy(10,0)}>→</button><button onClick={()=>moveBy(0,10)}>↓</button></div></div>
     <div className="editorButtons"><button className="textButton" onClick={toggleHidden}>{hidden?"Show element":"Hide element"}</button><button className="textButton dangerText" onClick={()=>{setSelected(null);setMsg("")}}>Done</button></div>
     <div className="editorAdd"><h4>Add block after this section</h4><textarea value={addHtml} onChange={e=>setAddHtml(e.target.value)} rows={4}/><button className="textButton" onClick={addBlock}>+ Add block</button></div>
    </>}
   </aside>
  </div>
  <input ref={fileRef} type="file" accept={uploadKind.current==="image"?"image/*":"video/*"} style={{display:"none"}} onChange={upload}/>
  {msg&&<div className={msg.includes("✓")?"success":"error"} style={{marginTop:10}}>{msg}</div>}
 </section>;
}