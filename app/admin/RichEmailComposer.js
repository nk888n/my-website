"use client";
import {useEffect,useRef,useState} from "react";
export default function RichEmailComposer({value,onChange}){
 const ref=useRef(null);const [preview,setPreview]=useState(false);const lastValue=useRef(value||"");
 useEffect(()=>{if(ref.current&&!ref.current.matches(":focus")&&lastValue.current!==(value||"")){ref.current.innerHTML=value||"";lastValue.current=value||""}},[value]);
 useEffect(()=>{if(ref.current&&ref.current.innerHTML!==(value||"")){ref.current.innerHTML=value||""}lastValue.current=value||""},[]);
 function focus(){ref.current?.focus()}
 function sync(){const html=ref.current?.innerHTML||"";lastValue.current=html;onChange(html)}
 function cmd(name,arg=null){focus();document.execCommand(name,false,arg);sync()}
 function link(){const url=window.prompt("Link URL:","https://");if(url)cmd("createLink",url)}
 function image(){const url=window.prompt("Advertising image URL:","https://");if(url)cmd("insertImage",url)}
 function clear(){if(ref.current){ref.current.innerHTML="";focus();sync()}}
 function handleInput(e){const html=e.currentTarget.innerHTML;lastValue.current=html;onChange(html)}
 return <div className="richComposer">
  <div className="richToolbar">
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("bold")}><b>B</b></button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("italic")}><i>I</i></button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("underline")}><u>U</u></button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("formatBlock","h2")}>H2</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("formatBlock","h3")}>H3</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("insertUnorderedList")}>• List</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("insertOrderedList")}>1. List</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyLeft")}>Left</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyCenter")}>Center</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyRight")}>Right</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={link}>Link</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={image}>Image</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={clear}>Clear</button>
   <button type="button" className="previewButton" onClick={()=>setPreview(true)}>Preview</button>
  </div>
  <div ref={ref} className="richEditor" contentEditable suppressContentEditableWarning onInput={handleInput} dir="ltr" data-placeholder="Write your email here…" />
  {preview&&<div className="modalBackdrop" onClick={()=>setPreview(false)}><div className="emailPreviewModal" onClick={e=>e.stopPropagation()}><div className="emailPreviewHead"><strong>Email Preview</strong><button type="button" className="textButton" onClick={()=>setPreview(false)}>Close</button></div><div className="emailPreviewBody" dangerouslySetInnerHTML={{__html:value||"<p>No message yet.</p>"}}/></div></div>}
 </div>
}
