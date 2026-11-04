"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export default function OffersNavLink(){const[offer,setOffer]=useState(null);useEffect(()=>{let dead=false;fetch("/api/offers",{cache:"no-store"}).then(r=>r.json()).then(j=>{if(!dead)setOffer(j.homepage||j.offers?.[0]||null)}).catch(()=>{});return()=>{dead=true}},[]);return offer?<Link className="offersNavLink" href="/offers">{offer.nav_label||"Offers"}</Link>:null}
