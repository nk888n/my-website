"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {facialAddons,bodyAddons,allServices} from "../../lib/services";

const STORAGE_KEY="vale-beauty-service-selection";
const CUSTOMER_KEY="vale-customer-session";

function winnerType(r){return r?.prize_type || r?.reward_type || null}
function winnerIsFree(r){return winnerType(r)==="free_service"}
function winnerDiscount(r,price){if(winnerIsFree(r)||winnerType(r)!=="discount")return 0;const value=Number(r?.prize_value??r?.reward_value??r?.discountValue??0);const kind=r?.discountKind||"percent";return Math.min(price,Math.max(0,kind==="percent"?price*value/100:value))}
function discountAmount(d,price){
  if(!d)return 0;
  return Math.min(price,Math.max(0,d.kind==="percent"?price*Number(d.value)/100:Number(d.value)));
}

function Card({s,onSelect,selected,onRemove,discount,reward}){
  const [open,setOpen]=useState(false);
  const free=winnerIsFree(reward) && !discount,winnerOff=free?0:winnerDiscount(reward,s.price); const newPrice=free?0:Math.max(0,s.price-discountAmount(discount,s.price)-winnerOff);

  return (
    <article className={`card ${open?"expanded":""}`}>
      <div className="cardimg">
        <img src={s.image} alt={s.name}/>
        <div className="cardname">{s.name}</div>
      </div>
      <div className="cardbody">
        <div className="row">
          <span>{s.duration} min</span>
          <span className="price">
            {free ? (
              <><del>${s.price}</del> <strong>FREE</strong></>
            ) : (discount || winnerOff>0) ? (
              <><del>${s.price}</del> <strong>${newPrice.toFixed(2)}</strong></>
            ) : `$${s.price}`}
          </span>
        </div>
        {free ? (
          <div className="discountBadge" style={{background:"#fbf2df",color:"#8d6b2f"}}>YOUR GIFT · FREE</div>
        ) : (discount || winnerOff>0) ? (
          <div className="discountBadge">
            {winnerOff>0 ? "WINNER "+Number(reward?.prize_value??reward?.reward_value??0)+"% OFF" : (discount.kind==="percent"?`SPECIAL ${discount.value}% OFF`:`SPECIAL ${Number(discount.value).toFixed(2)} OFF`)}
          </div>
        ) : null}
        <div className="cardactions">
          <button type="button" className="iconbtn arrow" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?"⌃":"⌄"}</button>
          {selected ? (
            <button type="button" className="removeMini" onClick={()=>onRemove(s)}>Remove</button>
          ) : (
            <button type="button" className="iconbtn" onClick={()=>onSelect(s)} aria-label={`Add ${s.name}`}>🛒</button>
          )}
        </div>
      </div>
      {open && (
        <div className="details">
          <div className="detailsInner">
            {reward && (
              <div className="free">
                <strong>🎁 Your Winner Gift</strong>
                <p style={{margin:"6px 0"}}>{reward.prize_name} — {winnerIsFree(reward) ? "this service is FREE for you." : String(reward.prize_value??reward.reward_value??0)+"% off this service."}</p>
              </div>
            )}
            {s.tagline && <h3>{s.tagline}</h3>}
            <p>{s.description}</p>
            {s.skinTypes && (
              <>
                <strong>Skin types</strong>
                <div className="pills">{s.skinTypes.map(x=><span className="pill" key={x}>{x}</span>)}</div>
              </>
            )}
            <strong>Includes</strong>
            <ul>{s.includes?.map(x=><li key={x}>{x}</li>)}</ul>
            {s.free && (
              <div className="free">
                <strong>Free gifts</strong>
                <ul>{s.free.map(x=><li key={x}>{x}</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ServicesClient({sections,initialSelection}){
  const [sel,setSel]=useState(initialSelection);
  const [discounts,setDiscounts]=useState([]);
  const [customer,setCustomer]=useState(null);
  const [rewards,setRewards]=useState([]);

  useEffect(()=>{
    try{
      const saved=sessionStorage.getItem(STORAGE_KEY);
      if(saved){
        const parsed=JSON.parse(saved);
        if(parsed&&typeof parsed==="object")setSel(v=>({...v,...parsed}));
      }
    }catch{}
  },[]);

  useEffect(()=>{
    try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(sel));}catch{}
  },[sel]);

  useEffect(()=>{
    let dead=false;
    fetch("/api/discounts",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{if(!dead)setDiscounts(j.discounts||[])})
      .catch(()=>{if(!dead)setDiscounts([])});
    const syncCustomer=async()=>{
      try{
        const raw=localStorage.getItem(CUSTOMER_KEY);
        if(!raw){
          if(!dead){setCustomer(null);setRewards([]);}
          return;
        }
        const c=JSON.parse(raw);
        if(!c?.id||!c?.email){
          if(!dead){setCustomer(null);setRewards([]);}
          return;
        }
        const res=await fetch(`/api/customers?email=${encodeURIComponent(c.email)}`,{cache:"no-store"});
        const json=await res.json();
        const profile=(json.customers||[]).find(p=>String(p.id)===String(c.id));
        if(!profile){
          localStorage.removeItem(CUSTOMER_KEY);
          if(!dead){setCustomer(null);setRewards([]);}
          return;
        }
        const current={id:profile.id,name:profile.name,email:profile.email};
        localStorage.setItem(CUSTOMER_KEY,JSON.stringify(current));
        if(!dead){
          setCustomer(current);
          fetch(`/api/discounts?customerId=${encodeURIComponent(current.id)}&email=${encodeURIComponent(current.email)}`,{cache:"no-store"})
            .then(r=>r.json())
            .then(j=>{if(!dead)setDiscounts([...(j.discounts||[]),...(j.customerDiscounts||[])])})
            .catch(()=>{});
          fetch(`/api/customer-rewards?customerId=${encodeURIComponent(current.id)}&email=${encodeURIComponent(current.email)}`,{cache:"no-store"})
            .then(r=>r.json())
            .then(j=>{if(!dead)setRewards(j.rewards||[])})
            .catch(()=>{if(!dead)setRewards([])});
        }
      }catch{
        if(!dead){setCustomer(null);setRewards([]);}
      }
    };
    syncCustomer();
    window.addEventListener("storage",syncCustomer);
    window.addEventListener("vale-customer-session-changed",syncCustomer);
    return()=>{
      dead=true;
      window.removeEventListener("storage",syncCustomer);
      window.removeEventListener("vale-customer-session-changed",syncCustomer);
    };
  },[]);

  const selected=useMemo(()=>[sel.facial,sel.body,sel.eyebrow].filter(Boolean),[sel]);
  const rewardFor=s=>rewards.find(r=>r.service_id===s.id)||null;
  const best=(s,reward)=>{
    const eligible=discounts.filter(d=>(d.service_ids||[]).includes(s.id));
    if(reward && winnerType(reward)==="discount"){
      const winnerValue=Number(reward.discountValue??reward.prize_value??reward.reward_value??0);
      const winnerKind=reward.discountKind||"percent";
      return winnerValue>0&&winnerValue<100?{id:reward.discountId||"winner",kind:winnerKind,value:winnerValue,scope:"customer",winner:true}:null;
    }
    if(reward && winnerIsFree(reward)) return null;
    return eligible.filter(d=>Number(d.value)<100).sort((a,b)=>Number(b.value)-Number(a.value))[0]||null;
  };

  const pricing=selected.map(s=>{
    const reward=rewardFor(s);
    const d=best(s,rewardFor(s));
    const free=winnerIsFree(reward) && !d; const winnerOff=free?0:winnerDiscount(reward,s.price); const amount=free?s.price:discountAmount(d,s.price)+winnerOff; return {s,reward,d,amount};
  });

  const regular=selected.reduce((a,s)=>a+s.price,0)
    +sel.facialAddons.reduce((a,id)=>a+(facialAddons.find(x=>x.id===id)?.price||0),0)
    +sel.bodyAddons.reduce((a,id)=>a+(bodyAddons.find(x=>x.id===id)?.price||0),0);
  const discountTotal=pricing.reduce((a,x)=>a+x.amount,0);
  const total=Math.max(0,regular-discountTotal);

  function groupFor(s){
    if(sections[0][1].some(x=>x.id===s.id))return "facial";
    if(sections[1][1].some(x=>x.id===s.id))return "body";
    return "eyebrow";
  }

  function pick(s){setSel(v=>({...v,[groupFor(s)]:s}));}

  function remove(s){
    const g=groupFor(s);
    setSel(v=>({...v,[g]:null,...(g==="facial"?{facialAddons:[]}:{}) ,...(g==="body"?{bodyAddons:[]}:{})}));
  }

  function query(){
    const p=new URLSearchParams();
    if(sel.facial)p.set("facial",sel.facial.id);
    if(sel.body)p.set("body",sel.body.id);
    if(sel.eyebrow)p.set("eyebrow","1");
    if(sel.facialAddons.length)p.set("fa",sel.facialAddons.join(","));
    if(sel.bodyAddons.length)p.set("ba",sel.bodyAddons.join(","));
    return p.toString();
  }

  return (
    <div className="selectionDock">
      {customer && (
        <div className="success" style={{marginBottom:20,textAlign:"left"}}>
          <strong>Hi {customer.name} ✨</strong>
          {rewards.length ? (
            <p style={{margin:"6px 0 0"}}>You have {rewards.length} winner offer{rewards.length===1?"":"s"}. Look for your special offer on your eligible service{rewards.length===1?"":"s"}.</p>
          ) : (
            <p style={{margin:"6px 0 0"}}>Your profile is connected. Any future offers or rewards will appear here automatically.</p>
          )}
        </div>
      )}

      <div className="serviceSections">
        {sections.map(([title,items])=>(
          <div key={title} className={`serviceSection ${title==="Eyebrow Threading"?"eyebrowSection":""}`}>
            <h2>{title}</h2>
            <div className="serviceGrid">
              {items.map(s=>(
                <Card
                  key={s.id}
                  s={s}
                  discount={best(s,rewardFor(s))}
                  reward={rewardFor(s)}
                  selected={[sel.facial?.id,sel.body?.id,sel.eyebrow?.id].includes(s.id)}
                  onSelect={pick}
                  onRemove={remove}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bookingbox selectionBox">
        <strong>Your Selection</strong>
        {selected.length ? (
          <div className="selectionList">
            {selected.map(s=>{
              const d=best(s,rewardFor(s));
              const reward=rewardFor(s);
              const free=winnerIsFree(reward) && !d, winnerOff=free?0:winnerDiscount(reward,s.price);
              const da=free?s.price:discountAmount(d,s.price)+winnerOff;
              return (
                <div className="selectionItem" key={s.id}>
                  <span>
                    {s.name} — {free ? <><del>${s.price}</del> <strong>FREE</strong></> : (d||winnerOff>0) ? <><del>${s.price}</del> <strong>${(s.price-da).toFixed(2)}</strong></> : `${s.price}`} · {s.duration} min
                  </span>
                  <button type="button" className="textRemove" onClick={()=>remove(s)}>Remove</button>
                </div>
              );
            })}
          </div>
        ) : <p className="muted">Nothing selected yet.</p>}

        <div className="row summaryRow">
          <span>Appointment duration: {selected.reduce((a,s)=>a+s.duration,0)} min</span>
          <strong>{discountTotal>0?<><del>${regular.toFixed(2)}</del> ${total.toFixed(2)}</>:`Total: $${total.toFixed(2)}`}</strong>
        </div>

        <Link
          className="btn"
          href={selected.length?`/booking?${query()}`:"/services"}
          style={{marginTop:12,pointerEvents:selected.length?"auto":"none",opacity:selected.length?1:.5}}
        >Continue Booking</Link>
      </div>
    </div>
  );
}
