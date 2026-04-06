import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ── YOUR SUPABASE CREDENTIALS — replace these two lines ──────────────────────
const SUPABASE_URL = "https://wziyuvjnnzkkghyxpkkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXl1dmpubnpra2doeXhwa2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDg1MTQsImV4cCI6MjA5MTA4NDUxNH0.m33U3tfU4lq3RuQfR0FybM6pgRvRaV67jT8h4IYaP7Y";
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const STORAGE_KEY = "shared-calendar-data";

async function loadFromSupabase() {
  const { data } = await supabase.from("calendar_data").select("value").eq("key", STORAGE_KEY).single();
  return data ? JSON.parse(data.value) : null;
}

async function saveToSupabase(payload) {
  await supabase.from("calendar_data").upsert({ key: STORAGE_KEY, value: JSON.stringify(payload), updated_at: new Date().toISOString() });
}

function getPatternStyle(type, color) {
  if (type === "CE") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><line x1='0' y1='8' x2='8' y2='0' stroke='${encodeURIComponent(color)}' stroke-width='1.5' stroke-opacity='0.18'/></svg>`;
    return { backgroundImage: `url("data:image/svg+xml,${svg}")`, backgroundSize: "8px 8px" };
  } else if (type === "Meet & Greet") {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><circle cx='4' cy='4' r='1.2' fill='${encodeURIComponent(color)}' fill-opacity='0.25'/></svg>`;
    return { backgroundImage: `url("data:image/svg+xml,${svg}")`, backgroundSize: "8px 8px" };
  } else {
    const c = encodeURIComponent(color);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><line x1='0' y1='5' x2='10' y2='5' stroke='${c}' stroke-width='1' stroke-opacity='0.2'/><line x1='5' y1='0' x2='5' y2='10' stroke='${c}' stroke-width='1' stroke-opacity='0.2'/></svg>`;
    return { backgroundImage: `url("data:image/svg+xml,${svg}")`, backgroundSize: "10px 10px" };
  }
}

function EventChip({ ev, person, onClick, compact = false }) {
  const patternStyle = getPatternStyle(ev.type, person.color);
  return (
    <div onClick={onClick} style={{
      position:"relative", overflow:"hidden",
      background:person.light, border:`1.5px solid ${person.color}`,
      borderRadius:compact?5:6, padding:compact?"2px 5px":"4px 7px",
      fontSize:compact?10:11, color:person.color, fontWeight:600,
      fontFamily:"'DM Mono',monospace", whiteSpace:compact?"nowrap":"normal",
      textOverflow:compact?"ellipsis":"unset", cursor:"pointer", ...patternStyle,
    }}>
      {compact ? `${ev.type} · ${person.name}` : <>
        <div>{ev.type}</div>
        <div style={{fontWeight:400,color:"#555"}}>{person.name}</div>
        {ev.note && <div style={{fontWeight:400,fontSize:10,color:"#777",marginTop:1}}>{ev.note}</div>}
      </>}
    </div>
  );
}

const DEFAULT_PEOPLE = [
  {id:1,name:"Ashly",color:"#E05C5C",light:"#FDEAEA"},
  {id:2,name:"Dave D",color:"#E08A2E",light:"#FEF0DC"},
  {id:3,name:"David",color:"#D4BC1A",light:"#FBF8D8"},
  {id:4,name:"Dave S",color:"#4CAF6F",light:"#DFF5E8"},
  {id:5,name:"Matt",color:"#2EAACC",light:"#D8F3FA"},
  {id:6,name:"Comet",color:"#3A7FD5",light:"#D8E9FA"},
  {id:7,name:"Erin",color:"#7B52D4",light:"#EDE6FA"},
  {id:8,name:"Kari",color:"#C450A8",light:"#F8E0F3"},
  {id:9,name:"Rachel",color:"#D45050",light:"#FAE0E0"},
  {id:10,name:"",color:"#3DA68C",light:"#D7F5EE"},
  {id:11,name:"",color:"#6B7FCC",light:"#E3E7FA"},
  {id:12,name:"Dean",color:"#C47A3A",light:"#FAF0E2"},
];
const EVENT_TYPES = ["CE","Meet & Greet","Hold"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getToday() { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth(),day:d.getDate()}; }
function daysInMonth(y,m)
