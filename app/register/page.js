import RegisterClient from "./RegisterClient";
export default async function RegisterPage({searchParams}){
  const p=await searchParams;
  const invite={
    customerId:typeof p?.customerId==="string"?p.customerId:"",
    email:typeof p?.email==="string"?p.email:"",
    name:typeof p?.name==="string"?p.name:""
  };
  const hasInvite=!!(invite.customerId&&invite.email&&invite.name);
  return <main className="container"><nav className="nav"><a className="brand" href="/">VALE BEAUTY VK</a><div className="navlinks"><a href="/services">Services</a><a href="/booking">Booking</a></div></nav><section className="section"><div className="eyebrow">VALE BEAUTY</div><h1>{hasInvite?"Connect Your Special Offer":"Create your profile"}</h1>{hasInvite&&<p style={{color:"var(--muted)"}}>We’re connecting your name and email to your VALE BEAUTY customer profile so your special offers follow you to booking.</p>}<RegisterClient invite={hasInvite?invite:null}/></section></main>;
}