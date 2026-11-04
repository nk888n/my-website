"use client";
import {useEffect,useState} from "react";
import Link from "next/link";

const money=v=>"$"+Number(v||0).toFixed(2);
export default function OffersLandingHero(){
  const [offers,setOffers]=useState([]);
  const [active,setActive]=useState(0);
  useEffect(()=>{
    let dead=false;
    fetch("/api/offers",{cache:"no-store"})
      .then(r=>r.json())
      .then(j=>{
        if(dead)return;
        const list=(j.offers||[]).filter(o=>o.show_offers_page!==false);
        const home=j.homepage;
        const ordered=home?[home,...list.filter(o=>o.id!==home.id)]:list;
        setOffers(ordered);
      }).catch(()=>{});
    return()=>{dead=true};
  },[]);
  useEffect(()=>{
    if(offers.length<2)return;
    const t=setInterval(()=>setActive(v=>(v+1)%offers.length),6500);
    return()=>clearInterval(t);
  },[offers.length]);
  if(!offers.length)return <section className="offersLandingFallback"><div><span>VALE BEAUTY · SPECIAL EXPERIENCES</span><h1>A little something special, just for you.</h1><Link href="/offers">EXPLORE OFFERS</Link></div></section>;
  const offer=offers[active%offers.length];
  const image=offer.detail_image_url||offer.popup_image_url;
  const discount=Math.max(0,Math.round((1-Number(offer.offer_price||0)/Math.max(1,Number(offer.original_price||0)))*100));
  return <section className="offersLanding" aria-label="Featured special offers">
    {image?<img className="offersLandingImage" src={image} alt={offer.title}/>:null}
    <div className="offersLandingShade"/>
    <div className="offersLandingContent">
      <span className="offersLandingEyebrow">VALE BEAUTY · LIMITED-TIME EDIT</span>
      <div className="offersLandingPill">SPECIAL OFFER{discount?" · SAVE "+discount+"%":""}</div>
      <h1>{offer.title}</h1>
      {offer.short_description&&<p>{offer.short_description}</p>}
      <div className="offersLandingPrice"><del>{money(offer.original_price)}</del><strong>{money(offer.offer_price)}</strong></div>
      <Link className="offersLandingButton" href="/offers">SHOP THIS OFFER <span>→</span></Link>
      {offers.length>1&&<div className="offersLandingDots" aria-label="Choose featured offer">{offers.map((o,i)=><button key={o.id} type="button" className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={"Show "+o.title}/>)}</div>}
    </div>
    <div className="offersLandingSideNote"><span>VALE BEAUTY VK</span><i>SKIN · BODY · WELLNESS</i></div>
  </section>;
}
