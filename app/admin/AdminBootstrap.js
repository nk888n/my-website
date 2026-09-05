"use client";
import {useEffect,useState} from "react";
import AdminClient from "./AdminClientFinal";
export default function AdminBootstrap(){const[ready,setReady]=useState(false);useEffect(()=>{const pin=sessionStorage.getItem("vale_admin_pin");if(!pin){setReady(true);return}fetch("/api/admin/expire-discounts",{method:"POST",headers:{"x-admin-pin":pin}}).finally(()=>setReady(true))},[]);return ready?<AdminClient/>:<div className="bookingbox"><p>Loading studio controls…</p></div>}
