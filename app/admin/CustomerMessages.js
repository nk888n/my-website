"use client";
import {useEffect,useState} from "react";

function fmtDate(value){return value?new Date(value).toLocaleString():"—"}

export default function CustomerMessages({customerId,email,onCount}){
  const[messages,setMessages]=useState([]),[loading,setLoading]=useState(false),[error,setError]=useState("");
  const pin=()=>window.sessionStorage.getItem("vale_admin_pin")||"";
  useEffect(()=>{
    if(!customerId&&!email){setMessages([]);onCount?.(0);return}
    let cancelled=false;
    (async()=>{
      setLoading(true);setError("");
      try{
        const qs=new URLSearchParams();
        if(customerId)qs.set("customerId",customerId);
        if(email)qs.set("email",email);
        const r=await fetch(`/api/admin/customer-messages?${qs.toString()}`,{headers:{"x-admin-pin":pin()},cache:"no-store"});
        const j=await r.json();
        if(!r.ok)throw Error(j.error||"Could not load message history.");
        if(!cancelled){const next=j.messages||[];setMessages(next);onCount?.(next.length)}
      }catch(e){if(!cancelled){setError(e.message);onCount?.(0)}}finally{if(!cancelled)setLoading(false)}
    })();
    return()=>{cancelled=true};
  },[customerId,email,onCount]);

  return <section className="dossierSection" id="dossier-messages">
    <div className="dossierSectionTitle"><span>09</span><h3>Messages</h3></div>
    <p className="muted small">Email history recorded after the message was accepted for sending. This shows what the system actually sent; it does not prove the message reached the customer's inbox.</p>
    {loading&&<p className="muted">Loading message history…</p>}
    {error&&<p className="error">{error}</p>}
    {!loading&&!error&&!messages.length&&<p className="muted">No sent email history for this customer yet.</p>}
    <div className="customerMessageList">
      {messages.map(m=><article className="customerMessage" key={m.id}>
        <div className="dossierBookingHead">
          <div><b>{m.subject}</b><span>{fmtDate(m.created_at)}</span></div>
          <strong>{m.status==="sent"?"Sent":"Failed"}</strong>
        </div>
        <p className="dossierMessageMeta"><b>To:</b> {m.recipient||email} · <b>Status:</b> {m.status==="sent"?"Accepted for sending":"Send failed"}</p>
        <details>
          <summary>View exact email content</summary>
          <div className="customerMessageBody" dangerouslySetInnerHTML={{__html:m.body||"<p>No email body was recorded.</p>"}} />
        </details>
      </article>)}
    </div>
  </section>;
}
