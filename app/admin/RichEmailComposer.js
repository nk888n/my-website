"use client";
import {useEffect,useRef,useState} from "react";
const MAX_FILE=2*1024*1024;
const MAX_TOTAL=3*1024*1024;
export default function RichEmailComposer({value,onChange,onAttachmentsChange}){
 const ref=useRef(null);const imageRef=useRef(null);const fileRef=useRef(null);const videoRef=useRef(null);const [preview,setPreview]=useState(false);const [attachments,setAttachments]=useState([]);const lastValue=useRef(value||"");
 useEffect(()=>{if(ref.current&&!ref.current.matches(":focus")&&lastValue.current!==(value||"")){ref.current.innerHTML=value||"";lastValue.current=value||""}},[value]);
 useEffect(()=>{if(ref.current&&ref.current.innerHTML!==(value||""))ref.current.innerHTML=value||"";lastValue.current=value||""},[]);
 function updateAttachments(next){setAttachments(next);onAttachmentsChange?.(next)}
 function focus(){ref.current?.focus()}
 function sync(){const html=ref.current?.innerHTML||"";lastValue.current=html;onChange(html)}
 function cmd(name,arg=null){focus();document.execCommand(name,false,arg);sync()}
 function link(){const url=window.prompt("Link URL:","https://");if(url)cmd("createLink",url)}
 function totalBytes(list){return list.reduce((sum,a)=>sum+Math.ceil(String(a.content||"").length*3/4),0)}
 function readFile(file,{inline=false,kind="file"}={}){
  if(!file)return;
  if(file.size>MAX_FILE){window.alert("Please choose a file smaller than 2 MB.");return}
  if(totalBytes(attachments)+file.size>MAX_TOTAL){window.alert("The total size of files/images/videos in this email cannot exceed 3 MB.");return}
  const reader=new FileReader();
  reader.onload=()=>{
   const b64=String(reader.result).split(",")[1]||"",id=(kind==="image"?"img-":kind==="video"?"video-":"file-")+Date.now()+"-"+Math.random().toString(36).slice(2);
   const item={filename:file.name,content:b64,contentType:file.type||"application/octet-stream",cid:inline?id:undefined,asAttachment:!inline};
   const next=[...attachments,item];updateAttachments(next);focus();
   if(inline){
    document.execCommand("insertHTML",false,"<p><img src=\"cid:"+id+"\" alt=\""+String(file.name).replace(/"/g,"&quot;")+"\" style=\"max-width:100%;height:auto;border-radius:6px\"></p>");
   }else{
    const icon=kind==="video"?"🎥":"📎";
    document.execCommand("insertHTML",false,"<p>"+icon+" <b>"+String(file.name).replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")+"</b> <span>(attached)</span></p>");
   }
   sync();
  };
  reader.readAsDataURL(file);
 }
 function clear(){if(ref.current){ref.current.innerHTML="";focus();sync();updateAttachments([])}}
 function handleInput(e){const html=e.currentTarget.innerHTML;lastValue.current=html;onChange(html)}
 return <div className="richComposer">
  <div className="richToolbar">
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("bold")}><b>B</b></button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("italic")}><i>I</i></button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("underline")}><u>U</u></button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("formatBlock","h2")}>H2</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("formatBlock","h3")}>H3</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("insertUnorderedList")}>• List</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("insertOrderedList")}>1. List</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyLeft")}>Left</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyCenter")}>Center</button><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>cmd("justifyRight")}>Right</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={link}>🔗 Link</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>imageRef.current?.click()}>🖼 Image</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>fileRef.current?.click()}>📎 File</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>videoRef.current?.click()}>🎥 Video</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={clear}>Clear</button>
   <button type="button" className="previewButton" onClick={()=>setPreview(true)}>Preview</button>
  </div>
  <div ref={ref} className="richEditor" contentEditable suppressContentEditableWarning onInput={handleInput} dir="ltr" data-placeholder="Write your email here…" />
  <input ref={imageRef} type="file" accept="image/*" hidden onChange={e=>{readFile(e.target.files?.[0],{inline:true,kind:"image"});e.target.value=""}}/>
  <input ref={fileRef} type="file" hidden onChange={e=>{readFile(e.target.files?.[0],{kind:"file"});e.target.value=""}}/>
  <input ref={videoRef} type="file" accept="video/*" hidden onChange={e=>{readFile(e.target.files?.[0],{kind:"video"});e.target.value=""}}/>
  {attachments.length>0&&<div className="richAttachments"><b>Attachments:</b>{attachments.map((a,i)=><span key={a.cid||a.filename+i}>📎 {a.filename}</span>)}</div>}
  <div className="richHint">Image opens your device photos/files. File attaches a document, and Video attaches a video. Each item max 2 MB; total max 3 MB.</div>
  {preview&&<div className="modalBackdrop" onClick={()=>setPreview(false)}><div className="emailPreviewModal" onClick={e=>e.stopPropagation()}><div className="emailPreviewHead"><strong>Email Preview</strong><button type="button" className="textButton" onClick={()=>setPreview(false)}>Close</button></div><div className="emailPreviewBody" dangerouslySetInnerHTML={{__html:value||"<p>No message yet.</p>"}}/></div></div>}
 </div>
}
