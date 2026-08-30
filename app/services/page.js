import ServicesClient from "./ServicesClient";
import { facialTreatments, bodyTreatments, eyebrow, findService } from "../../lib/services";

export default async function Services({ searchParams }) {
  const p = await searchParams;
  const get = key => (typeof p?.[key] === "string" ? p[key] : "");
  const initialSelection = {
    facial: findService(get("facial")) || null,
    body: findService(get("body")) || null,
    eyebrow: get("eyebrow") ? eyebrow : null,
    facialAddons: get("fa") ? get("fa").split(",").filter(Boolean) : [],
    bodyAddons: get("ba") ? get("ba").split(",").filter(Boolean) : [],
  };
  return <main className="container"><nav className="nav"><a className="brand" href="/">VALE BEAUTY VK</a><a href="/booking">Booking</a></nav><section className="section"><div className="eyebrow">Our Menu</div><h1>Services</h1><p style={{color:"var(--muted)"}}>Choose one facial, one body treatment, eyebrow threading, or combine services.</p><ServicesClient sections={[["Facial Treatments", facialTreatments],["Body Treatments", bodyTreatments],["Eyebrow Threading", [eyebrow]]]} initialSelection={initialSelection}/></section></main>;
}
