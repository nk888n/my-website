import "./globals.css";
import "./public-restored.css";
import "./customer-profile.css";
import { business } from "../lib/services";
export const metadata={title:"VALE BEAUTY VK",description:"Beauty studio in Windsor, Ontario"};
export default function RootLayout({children}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/></head><body>{children}<footer className="footer"><div className="container"><strong>{business.name}</strong><p><a href={`mailto:${business.email}`}>{business.email}</a><br/><a href={`tel:${business.phone.replace(/[^0-9+]/g,"")}`}>{business.phone}</a><br/><a href="https://www.google.com/maps/search/?api=1&query=3875+Tecumseh+Rd+E+Unit+2+Windsor+ON+N8W+1J1" target="_blank">3875 Tecumseh Rd E, Unit 2, Windsor, ON N8W 1J1</a></p></div></footer></body></html>}
