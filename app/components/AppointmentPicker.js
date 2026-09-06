"use client";
import { useEffect, useMemo, useState } from "react";

const SLOT_MINUTES = 30;
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 19 * 60;
const BUFFER_MINUTES = 30;

function pad(n){ return String(n).padStart(2,"0"); }
export function localIsoDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function monthKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }
export function labelTime(mins){ const h=Math.floor(mins/60), m=mins%60, suffix=h>=12?"PM":"AM", hh=h%12||12; return `${hh}:${pad(m)} ${suffix}`; }
function addMonths(date, amount){ return new Date(date.getFullYear(), date.getMonth()+amount, 1); }

export function Calendar({ value, onChange, minDate, duration, ignoreDate, ignoreBookingId }) {
  const [month, setMonth] = useState(() => new Date(`${value || minDate}T12:00:00`));
  const [unavailable, setUnavailable] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const wanted = new Date(`${value || minDate}T12:00:00`);
    if (wanted.getFullYear() !== month.getFullYear() || wanted.getMonth() !== month.getMonth()) {
      setMonth(new Date(wanted.getFullYear(), wanted.getMonth(), 1));
    }
  }, [value, minDate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const suffix=ignoreBookingId?`&excludeBookingId=${encodeURIComponent(ignoreBookingId)}`:"";
    fetch(`/api/bookings?month=${monthKey(month)}&duration=${duration}${suffix}`, { cache:"no-store" })
      .then(async r => { const j=await r.json(); if(!r.ok) throw new Error(j.error||"availability"); return j; })
      .then(j => { if(!cancelled) setUnavailable(new Set(j.fullyBookedDates || [])); })
      .catch(() => { if(!cancelled) setUnavailable(new Set()); })
      .finally(() => { if(!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, duration, ignoreBookingId]);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({length:42}, (_,i) => { const d=new Date(start); d.setDate(start.getDate()+i); return d; });
  }, [month]);

  const min = new Date(`${minDate}T00:00:00`);
  const prevDisabled = addMonths(month,-1) < new Date(min.getFullYear(),min.getMonth(),1);

  return <div className="calendar" aria-label="Appointment date picker">
    <div className="calendarHead">
      <button type="button" className="calendarNav" onClick={()=>setMonth(addMonths(month,-1))} disabled={prevDisabled} aria-label="Previous month">‹</button>
      <strong>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</strong>
      <button type="button" className="calendarNav" onClick={()=>setMonth(addMonths(month,1))} aria-label="Next month">›</button>
    </div>
    <div className="calendarWeek">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d}>{d}</span>)}</div>
    <div className="calendarGrid">
      {cells.map(d=>{
        const iso=localIsoDate(d);
        const outside=d.getMonth()!==month.getMonth();
        const tooEarly=d<min;
        const full=unavailable.has(iso);
        const disabled=outside||tooEarly||full||loading;
        const selected=value===iso;
        return <button key={iso} type="button" disabled={disabled} className={`calendarDay ${outside?"outside":""} ${full?"unavailable":""} ${selected?"selected":""}`} onClick={()=>onChange(iso)} aria-label={`${iso}${full?" unavailable":""}`}>
          <span>{d.getDate()}</span>
        </button>;
      })}
    </div>
    <div className="calendarLegend"><span><i className="legendDot availableDot"/> Available</span><span><i className="legendDot unavailableDot"/> Fully booked</span></div>
    <div className="calendarHint">{loading ? "Checking availability…" : "Choose an available date. Hours are 8:00 AM–7:00 PM."}</div>
  </div>;
}

export function TimeSlots({ date, duration, selected, onChange, blocked=[], available=null, loading=false, ignoreId, ignoreStart, ignoreDuration }) {
  const slots = useMemo(() => {
    const out=[];
    const allowed = available ? new Set(available) : null;
    const selfStart = Number(ignoreStart);
    const selfDuration = Number(ignoreDuration || 0);
    const selfEndWithBuffer = selfStart + selfDuration + BUFFER_MINUTES;
    for(let start=OPEN_MINUTES; start+duration+BUFFER_MINUTES<=CLOSE_MINUTES; start+=SLOT_MINUTES){
      const value=`${pad(Math.floor(start/60))}:${pad(start%60)}`;
      const isSelected = selected===value;
      const conflict=blocked.some(b=>{
        const isCurrentBooking = Number.isFinite(selfStart) && selfDuration>0 && Number(b.start_minutes)===selfStart && Number(b.end_minutes)===selfEndWithBuffer;
        if(isCurrentBooking) return false;
        if(ignoreId && b.id!=null && String(b.id)===String(ignoreId)) return false;
        return start<b.end_minutes && start+duration+BUFFER_MINUTES>b.start_minutes;
      });
      const past = date && localIsoDate(new Date())===date && start <= (new Date().getHours()*60+new Date().getMinutes());
      const disabled=loading || conflict || past || (allowed ? !allowed.has(value) : false);
      out.push({minutes:start,value,disabled,reason:conflict?"Booked":past?"Past":isSelected?"Current booking":"Unavailable"});
    }
    return out;
  }, [date,duration,selected,blocked,available,loading,ignoreId,ignoreStart,ignoreDuration]);

  return <div className="timeGrid" aria-label="Available appointment times">
    {slots.map(s=><button key={s.value} type="button" className={`timeSlot ${s.disabled?"timeSlotDisabled":""} ${selected===s.value?"timeSlotSelected":""}`} disabled={s.disabled} onClick={()=>onChange(s.value)}>
      <span>{labelTime(s.minutes)}</span>
      {selected===s.value && <small>حجزك الحالي</small>}
      {s.disabled && selected!==s.value && <small>{s.reason}</small>}
    </button>)}
    {!slots.length && <p className="muted small">No appointment times fit this service before 7:00 PM.</p>}
  </div>;
}
