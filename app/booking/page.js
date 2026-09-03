import BookingForm from "./BookingForm";
import { findService, eyebrow } from "../../lib/services";

export default async function BookingPage({ searchParams }) {
  const p = await searchParams;
  const get = key => (typeof p?.[key] === "string" ? p[key] : "");
  const initialData = {
    facial: get("facial"), body: get("body"), eyebrow: !!get("eyebrow"),
    date: "", start: "", name: "", email: "", notes: "",
    fa: get("fa") ? get("fa").split(",").filter(Boolean) : [],
    ba: get("ba") ? get("ba").split(",").filter(Boolean) : [],
  };
  return <main className="container"><nav className="nav"><a className="brand" href="/">VALE BEAUTY VK</a><a href="/services">Services</a></nav><section className="section"><div className="eyebrow">Appointment</div><h1>Book your appointment</h1><BookingForm initialData={initialData}/></section></main>;
}
