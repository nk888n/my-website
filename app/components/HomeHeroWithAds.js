"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const money=v=>"$"+Number(v||0).toFixed(0);
function OfferAd({offer,position}){
 if(!offer)return <div className={"homeAdEmpty "+position} aria-hidden="true"/>;
 const image=offer.detail_image_url||offer.popup_image_url;
 const original=Number(offer.original_price||0),price=Number(offer.offer_price||0);
 const save=original>price&&original>0?Math.round((1-price/original)*100):0;
 return <Link href="/offers" className={"homeOfferAd "+position}>
  {image?<img src={image} alt="" loading="lazy"/>:null}
  <span className="homeOfferAdShade"/>
  <span className="homeOfferAdCopy"><small>{save?"SAVE "+save+"%":"SPECIAL OFFER"}</small><strong>{offer.title}</strong><span className="homeOfferAdPrice">{money(price)}{original>price?<del>{money(original)}</del>:null}</span><em>VIEW OFFER ↗</em></span>
 </Link>;
}
export default function HomeHeroWithAds(){
 const [offers,setOffers]=useState([]);
 useEffect(()=>{let dead=false;fetch("/api/offers",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(dead)return;const home=j.homepage;const list=j.offers||[];const ordered=home?[home,...list.filter(o=>o.id!==home.id)]:list;setOffers(ordered.slice(0,4));}).catch(()=>{});return()=>{dead=true};},[]);
 return <section className="homePromoStage" aria-label="VALE BEAUTY featured offers">
  <div className="homePromoRail homePromoLeft"><OfferAd offer={offers[0]} position="homeAdOne"/><OfferAd offer={offers[1]} position="homeAdTwo"/></div>
  <div className="homePromoCenter"><div className="homePromoCaption"><span>VALE BEAUTY</span><i>LIMITED-TIME SPECIALS</i></div><div className="hero"><img src="/services/hero.jpg" alt="VALE BEAUTY VK beauty studio"/><div className="hero-content"><div className="gold">PRIVATE BEAUTY STUDIO</div><h1>Where beauty<br/>meets calm.</h1><p>Personalized facial, body and beauty treatments designed around you.</p><Link className="heroBtn" href="/services">BOOK YOUR EXPERIENCE</Link></div></div></div>
  <div className="homePromoRail homePromoRight"><OfferAd offer={offers[2]||offers[0]} position="homeAdThree"/><OfferAd offer={offers[3]||offers[1]} position="homeAdFour"/></div>
 </section>;
}