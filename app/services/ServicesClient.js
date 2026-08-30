"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { facialAddons, bodyAddons } from "../../lib/services";

function Card({ s, onSelect, selected, onRemove }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`card ${open ? "expanded" : ""}`}>
      <div className="cardimg"><img src={s.image} alt={s.name} /><div className="cardname">{s.name}</div></div>
      <div className="cardbody">
        <div className="row"><span>{s.duration} min</span><span className="price">${s.price}</span></div>
        <div className="cardactions">
          <button type="button" className="iconbtn arrow" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} ${s.name} details`}>{open ? "⌃" : "⌄"}</button>
          {selected ? <button type="button" className="removeMini" onClick={() => onRemove(s)}>Remove</button> : <button type="button" className="iconbtn" onClick={() => onSelect(s)} aria-label={`Add ${s.name}`}>🛒</button>}
        </div>
      </div>
      {open && <div className="details"><div className="detailsInner">
        {s.tagline && <h3>{s.tagline}</h3>}<p>{s.description}</p>
        {s.skinTypes && <><strong>Skin types</strong><div className="pills">{s.skinTypes.map(x => <span className="pill" key={x}>{x}</span>)}</div></>}
        <strong>Includes</strong><ul>{s.includes?.map(x => <li key={x}>{x}</li>)}</ul>
        {s.free && <div className="free"><strong>Free gifts</strong><ul>{s.free.map(x => <li key={x}>{x}</li>)}</ul></div>}
      </div></div>}
    </article>
  );
}

export default function ServicesClient({ sections, initialSelection }) {
  const [sel, setSel] = useState(initialSelection);

  const selected = useMemo(() => [sel.facial, sel.body, sel.eyebrow].filter(Boolean), [sel]);
  const total = selected.reduce((a, s) => a + s.price, 0) + sel.facialAddons.reduce((a, id) => a + (facialAddons.find(x => x.id === id)?.price || 0), 0) + sel.bodyAddons.reduce((a, id) => a + (bodyAddons.find(x => x.id === id)?.price || 0), 0);
  const duration = selected.reduce((a, s) => a + s.duration, 0);

  function groupFor(s) {
    if (sections[0][1].some(x => x.id === s.id)) return "facial";
    if (sections[1][1].some(x => x.id === s.id)) return "body";
    return "eyebrow";
  }
  function pick(s) {
    const group = groupFor(s);
    setSel(v => ({ ...v, [group]: s }));
  }
  function remove(s) {
    const group = groupFor(s);
    setSel(v => ({ ...v, [group]: null, ...(group === "facial" ? { facialAddons: [] } : {}), ...(group === "body" ? { bodyAddons: [] } : {}) }));
  }
  function query() {
    const p = new URLSearchParams();
    if (sel.facial) p.set("facial", sel.facial.id);
    if (sel.body) p.set("body", sel.body.id);
    if (sel.eyebrow) p.set("eyebrow", "1");
    if (sel.facialAddons.length) p.set("fa", sel.facialAddons.join(","));
    if (sel.bodyAddons.length) p.set("ba", sel.bodyAddons.join(","));
    return p.toString();
  }

  return <>
    <div className="serviceSections">{sections.map(([title, items]) => <div key={title} className={`serviceSection ${title === "Eyebrow Threading" ? "eyebrowSection" : ""}`}>
      <h2>{title}</h2><div className="serviceGrid">{items.map(s => <Card key={s.id} s={s} selected={[sel.facial?.id, sel.body?.id, sel.eyebrow?.id].includes(s.id)} onSelect={pick} onRemove={remove} />)}</div>
    </div>)}</div>
    <div className="bookingbox selectionBox">
      <strong>Your Selection</strong>
      {selected.length ? <div className="selectionList">{selected.map(s => <div className="selectionItem" key={s.id}><span>{s.name} — ${s.price} · {s.duration} min</span><button type="button" className="textRemove" onClick={() => remove(s)}>Remove</button></div>)}</div> : <p className="muted">Nothing selected yet.</p>}
      <div className="row summaryRow"><span>Appointment duration: {duration} min</span><strong>Total: ${total}</strong></div>
      <Link className="btn" href={selected.length ? `/booking?${query()}` : "/services"} style={{ marginTop: 12, pointerEvents: selected.length ? "auto" : "none", opacity: selected.length ? 1 : .5 }}>Continue Booking</Link>
    </div>
  </>;
}
