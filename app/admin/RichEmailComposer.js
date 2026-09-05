"use client";
import {useRef,useState} from "react";
export default function RichEmailComposer({value,onChange}){
 const ref=useRef(null);const [preview,setPreview]=useState(false);
 function focus(){ref.current?.focus()}
 function cmd(name,arg=null){focus();document.execCommand(name,false,arg);onChange(ref.current?.innerHTML||"")}
 function link(){const url=window.prompt("Link URL:","https://");if(url)cmd("createLink",url)}
 function image(){const url=window.prompt("Advertising image URL:","https://");if(url)cmd("insertImage",url)}
 function clear(){focus();document.execCommand("removeFormat");onChange(ref.current?.innerHTML||"")}
 return <div className="richComposer">
  <div className="richToolbar">
   <button type="button" onClick={()=>cmd("bold")}><b>B</b></button><button type="button" onClick={()=>cmd("italic")}><i>I</i></button><button type="button" onClick={()=>cmd("underline")}><u>U</u></button>
   <button type="button" onClick={()=>cmd("formatBlock","h2")}>H2</button><button type="button" onClick={()=>cmd("formatBlock","h3")}>H3</button>
   <button type="button" onClick={()=>cmd("insertUnorderedList")}>• List</button><button type="button" onClick={()=>cmd("insertOrderedList")}>1. List</button>
   <button type="button" onClick={()=>cmd("justifyLeft")}>Left</button><button type="button" onClick={()=>cmd("justifyCenter")}>Center</button><button type="button" onClick={()=>cmd("justifyRight")}>Right</button>
   <button type="button" onClick={link}>Link</button><button type="button" onClick={image}>Image</button><button type="button" onClick={clear}>Clear</button>
   <button type="button" className="previewButton" onClick={()=>setPreview(true)}>Preview</button>
  </div>
  <div ref={ref} className="richEditor" contentEditable suppressContentEditableWarning onInput={e=>onChange(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{__html:value||""}} data-placeholder="Write your email here…" />
  {preview&&<div className="modalBackdrop" onClick={()=>setPreview(false)}><div className="emailPreviewModal" onClick={e=>e.stopPropagation()}><div className="emailPreviewHead"><strong>Email Preview</strong><button type="button" className="textButton" onClick={()=>setPreview(false)}>Close</button></div><div className="emailPreviewBody" dangerouslySetInnerHTML={{__html:value||"<p>No message yet.</p>"}}/></div></div>}
 </div>
}
