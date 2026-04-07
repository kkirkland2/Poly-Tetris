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
  {id:1,name:"Alex",color:"#E05C5C",light:"#FDEAEA"},
  {id:2,name:"Jordan",color:"#E08A2E",light:"#FEF0DC"},
  {id:3,name:"Morgan",color:"#D4BC1A",light:"#FBF8D8"},
  {id:4,name:"Casey",color:"#4CAF6F",light:"#DFF5E8"},
  {id:5,name:"Riley",color:"#2EAACC",light:"#D8F3FA"},
  {id:6,name:"Taylor",color:"#3A7FD5",light:"#D8E9FA"},
  {id:7,name:"Quinn",color:"#7B52D4",light:"#EDE6FA"},
  {id:8,name:"Avery",color:"#C450A8",light:"#F8E0F3"},
  {id:9,name:"Reese",color:"#D45050",light:"#FAE0E0"},
  {id:10,name:"Sage",color:"#3DA68C",light:"#D7F5EE"},
  {id:11,name:"Blake",color:"#6B7FCC",light:"#E3E7FA"},
  {id:12,name:"Drew",color:"#C47A3A",light:"#FAF0E2"},
];
const EVENT_TYPES = ["CE","Meet & Greet","Hold"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getToday() { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth(),day:d.getDate()}; }
function daysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function firstDayOfMonth(y,m) { return new Date(y,m,1).getDay(); }
function dateKey(y,m,d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function exportICS(events, people) {
  const getPerson = id => people.find(p=>p.id===id)||people[0];
  const fmt = ds => ds.replace(/-/g,"")+"T090000Z";
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CE Scheduler//EN","CALSCALE:GREGORIAN"];
  events.forEach(ev => {
    const p = getPerson(ev.personId);
    lines.push("BEGIN:VEVENT",`UID:${ev.id}@scheduler`,`DTSTART:${fmt(ev.date)}`,`DTEND:${fmt(ev.date)}`,`SUMMARY:${ev.type} — ${p.name}`,`DESCRIPTION:${ev.note||""}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")],{type:"text/calendar"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="scheduler.ics"; a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const today = getToday();
  const [view,setView]               = useState("month");
  const [current,setCurrent]         = useState({year:today.year,month:today.month});
  const [weekStart,setWeekStart]     = useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay());return d;});
  const [events,setEvents]           = useState([]);
  const [people,setPeople]           = useState(DEFAULT_PEOPLE);
  const [modal,setModal]             = useState(null);
  const [editModal,setEditModal]     = useState(null);
  const [form,setForm]               = useState({type:"CE",personId:1,note:""});
  const [editingName,setEditingName] = useState(null);
  const [nameInput,setNameInput]     = useState("");
  const [shareToast,setShareToast]   = useState(false);
  const [syncStatus,setSyncStatus]   = useState("idle");
  const [loading,setLoading]         = useState(true);
  const saveTimer = useRef(null);

  useEffect(()=>{
    loadFromSupabase().then(data=>{
      if(data){
        if(data.events) setEvents(data.events);
        if(data.people) setPeople(data.people);
      }
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    const interval = setInterval(()=>{
      loadFromSupabase().then(data=>{
        if(data){
          if(data.events) setEvents(data.events);
          if(data.people && !editingName) setPeople(data.people);
        }
      }).catch(()=>{});
    },15000);
    return ()=>clearInterval(interval);
  },[editingName]);

  function persist(newEvents, newPeople) {
    setSyncStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>{
      saveToSupabase({events:newEvents,people:newPeople})
        .then(()=>{setSyncStatus("saved");setTimeout(()=>setSyncStatus("idle"),2000);})
        .catch(()=>setSyncStatus("error"));
    },600);
  }

  function updateEvents(ne){setEvents(ne);persist(ne,people);}
  function updatePeople(np){setPeople(np);persist(events,np);}

  function prevMonth(){setCurrent(c=>c.month===0?{year:c.year-1,month:11}:{...c,month:c.month-1});}
  function nextMonth(){setCurrent(c=>c.month===11?{year:c.year+1,month:0}:{...c,month:c.month+1});}
  function prevWeek(){setWeekStart(d=>{const n=new Date(d);n.setDate(n.getDate()-7);return n;});}
  function nextWeek(){setWeekStart(d=>{const n=new Date(d);n.setDate(n.getDate()+7);return n;});}

  function openModal(ds){setForm({type:"CE",personId:people[0].id,note:""});setModal(ds);}
  function addEvent(){if(!modal)return;updateEvents([...events,{id:Date.now(),date:modal,...form}]);setModal(null);}
  function deleteEvent(id){updateEvents(events.filter(e=>e.id!==id));setEditModal(null);}
  function updateEvent(){updateEvents(events.map(e=>e.id===editModal.id?{...e,...form}:e));setEditModal(null);}
  function openEdit(ev,e){e.stopPropagation();setForm({type:ev.type,personId:ev.personId,note:ev.note});setEditModal(ev);}
  function getEventsForDate(ds){return events.filter(e=>e.date===ds);}
  function getPerson(id){return people.find(p=>p.id===id)||people[0];}
  function startEditName(p){setEditingName(p.id);setNameInput(p.name);}
  function saveName(id){
    const np=people.map(p=>p.id===id?{...p,name:nameInput}:p);
    setPeople(np);setEditingName(null);
    setSyncStatus("saving");
    saveToSupabase({events,people:np})
      .then(()=>{setSyncStatus("saved");setTimeout(()=>setSyncStatus("idle"),2000);})
      .catch(()=>setSyncStatus("error"));
  }

  function copyShareLink(){
    navigator.clipboard.writeText(window.location.href).then(()=>{setShareToast(true);setTimeout(()=>setShareToast(false),2500);});
  }

  function weekLabel(){
    const end=new Date(weekStart);end.setDate(end.getDate()+6);
    return `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekStart.getMonth()!==end.getMonth()?MONTH_NAMES[end.getMonth()]+' ':''}${end.getDate()}, ${end.getFullYear()}`;
  }

  function renderMonthGrid(){
    const {year,month}=current;
    const cells=[];
    for(let i=0;i<firstDayOfMonth(year,month);i++) cells.push(null);
    for(let d=1;d<=daysInMonth(year,month);d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);
    return (
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {DAY_NAMES.map(d=><div key={d} style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:"#888",padding:"6px 0",letterSpacing:1}}>{d}</div>)}
        {cells.map((day,i)=>{
          if(!day) return <div key={`e-${i}`} style={{minHeight:80,background:"#FAFAFA",borderRadius:8}}/>;
          const key=dateKey(year,month,day);
          const dayEvs=getEventsForDate(key);
          const isToday=year===today.year&&month===today.month&&day===today.day;
          return (
            <div key={key} onClick={()=>openModal(key)} style={{minHeight:80,background:isToday?"#FFF8EC":"#fff",border:isToday?"2px solid #E08A2E":"1px solid #ECECEC",borderRadius:8,padding:4,cursor:"pointer",transition:"box-shadow .15s",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,.13)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)"}>
              <div style={{fontSize:12,fontWeight:isToday?700:500,color:isToday?"#E08A2E":"#444",fontFamily:"'DM Mono',monospace",marginBottom:3}}>{day}</div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {dayEvs.slice(0,3).map(ev=><EventChip key={ev.id} ev={ev} person={getPerson(ev.personId)} compact onClick={e=>openEdit(ev,e)}/>)}
                {dayEvs.length>3&&<div style={{fontSize:10,color:"#aaa",fontFamily:"'DM Mono',monospace"}}>+{dayEvs.length-3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderWeekGrid(){
    const days=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
    return (
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {days.map((d,i)=>{
          const isToday=d.getFullYear()===today.year&&d.getMonth()===today.month&&d.getDate()===today.day;
          return <div key={i} style={{textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:isToday?"#E08A2E":"#888",padding:"6px 0",letterSpacing:1}}>{DAY_NAMES[d.getDay()]} <span style={{fontSize:13,color:isToday?"#E08A2E":"#555"}}>{d.getDate()}</span></div>;
        })}
        {days.map((d,i)=>{
          const key=dateKey(d.getFullYear(),d.getMonth(),d.getDate());
          const dayEvs=getEventsForDate(key);
          const isToday=d.getFullYear()===today.year&&d.getMonth()===today.month&&d.getDate()===today.day;
          return (
            <div key={`c-${i}`} onClick={()=>openModal(key)} style={{minHeight:200,background:isToday?"#FFF8EC":"#fff",border:isToday?"2px solid #E08A2E":"1px solid #ECECEC",borderRadius:8,padding:6,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,.05)",transition:"box-shadow .15s"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 10px rgba(0,0,0,.13)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.05)"}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {dayEvs.map(ev=><EventChip key={ev.id} ev={ev} person={getPerson(ev.personId)} compact={false} onClick={e=>openEdit(ev,e)}/>)}
                {dayEvs.length===0&&<div style={{fontSize:10,color:"#ddd",fontFamily:"'DM Mono',monospace",marginTop:8,textAlign:"center"}}>+ add</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const syncColor={idle:"#aaa",saving:"#E08A2E",saved:"#4CAF6F",error:"#D45050"}[syncStatus];
  const syncLabel={idle:"synced",saving:"saving…",saved:"✓ saved",error:"sync error"}[syncStatus];
  const modalOverlay={position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100};
  const modalBox={background:"#fff",borderRadius:16,padding:"28px 28px 22px",minWidth:320,boxShadow:"0 8px 40px rgba(0,0,0,.18)"};

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#F5F4F0",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'DM Mono',monospace",color:"#aaa",fontSize:13,letterSpacing:2}}>LOADING CALENDAR…</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#F5F4F0",fontFamily:"'DM Sans',sans-serif",paddingBottom:60}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <div style={{background:"#1A1A2E",padding:"22px 32px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#E08A2E",letterSpacing:3,marginBottom:4}}>SCHEDULER</div>
          <div style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:.5}}>CE's & Meet and Greets</div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:syncColor,letterSpacing:1,padding:"4px 10px",background:"rgba(255,255,255,.06)",borderRadius:20}}>{syncLabel}</div>
          <button onClick={copyShareLink} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#fff",fontWeight:600,letterSpacing:.5}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.18)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.1)"}
          >🔗 Copy Link</button>
          <button onClick={()=>exportICS(events,people)} style={{background:"rgba(224,138,46,.15)",border:"1px solid rgba(224,138,46,.4)",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#E08A2E",fontWeight:600,letterSpacing:.5}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(224,138,46,.28)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(224,138,46,.15)"}
          >📅 Export .ics</button>
          <div style={{display:"flex",gap:6,background:"rgba(255,255,255,.08)",borderRadius:10,padding:4}}>
            {["month","week"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{background:view===v?"#E08A2E":"transparent",color:view===v?"#fff":"#aaa",border:"none",borderRadius:7,padding:"7px 18px",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",transition:"all .2s"}}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{background:"#fff",borderRadius:12,padding:"16px 20px",marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#aaa",letterSpacing:2,marginBottom:10}}>TEAM — click a name to rename</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
            {people.map(p=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,background:p.light,border:`1.5px solid ${p.color}`,borderRadius:20,padding:"5px 12px",cursor:"pointer"}} onClick={()=>startEditName(p)}>
                <div style={{width:9,height:9,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                {editingName===p.id
                  ?<input autoFocus value={nameInput} onChange={e=>setNameInput(e.target.value)} onBlur={()=>saveName(p.id)} onKeyDown={e=>e.key==="Enter"&&saveName(p.id)} style={{border:"none",background:"transparent",color:p.color,fontWeight:700,fontFamily:"'DM Mono',monospace",fontSize:12,width:80,outline:"none"}}/>
                  :<span style={{color:p.color,fontWeight:700,fontFamily:"'DM Mono',monospace",fontSize:12}}>{p.name}</span>}
              </div>
            ))}
          </div>
          <div style={{borderTop:"1px solid #F0F0F0",paddingTop:10,display:"flex",gap:16}}>
            {EVENT_TYPES.map(t=>{
              const ps=getPatternStyle(t,"#555");
              return <div key={t} style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:28,height:16,borderRadius:4,background:"#E8E8E8",border:"1.5px solid #ccc",...ps}}/><span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#666",fontWeight:600}}>{t}</span></div>;
            })}
          </div>
        </div>

        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={view==="month"?prevMonth:prevWeek} style={{background:"#fff",border:"1px solid #E0E0E0",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:16,fontWeight:600,color:"#555"}}>‹</button>
          <div style={{fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:15,color:"#1A1A2E",letterSpacing:.5}}>
            {view==="month"?`${MONTH_NAMES[current.month]} ${current.year}`:weekLabel()}
          </div>
          <button onClick={view==="month"?nextMonth:nextWeek} style={{background:"#fff",border:"1px solid #E0E0E0",borderRadius:8,padding:"7px 16px",cursor:"pointer",fontSize:16,fontWeight:600,color:"#555"}}>›</button>
        </div>

        <div style={{background:"#fff",borderRadius:14,padding:12,boxShadow:"0 2px 12px rgba(0,0,0,.07)"}}>
          {view==="month"?renderMonthGrid():renderWeekGrid()}
        </div>
      </div>

      {shareToast&&<div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#1A1A2E",color:"#4CAF6F",fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:600,letterSpacing:1,padding:"12px 24px",borderRadius:30,boxShadow:"0 4px 20px rgba(0,0,0,.25)",zIndex:200}}>✓ Link copied to clipboard!</div>}

      {modal&&(
        <div style={modalOverlay} onClick={()=>setModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={modalBox}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#E08A2E",letterSpacing:2,marginBottom:4}}>NEW EVENT</div>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",marginBottom:18}}>{modal}</div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>EVENT TYPE</label>
              <div style={{display:"flex",gap:8}}>
                {EVENT_TYPES.map(t=><button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{flex:1,padding:"9px 0",borderRadius:8,cursor:"pointer",fontWeight:600,fontFamily:"'DM Mono',monospace",fontSize:12,letterSpacing:.5,background:form.type===t?"#1A1A2E":"#F5F4F0",color:form.type===t?"#E08A2E":"#777",border:form.type===t?"2px solid #1A1A2E":"2px solid transparent",transition:"all .15s"}}>{t}</button>)}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>PERSON</label>
              <select value={form.personId} onChange={e=>setForm(f=>({...f,personId:Number(e.target.value)}))} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontFamily:"'DM Sans',sans-serif",fontSize:14,background:"#FAFAFA",color:"#1A1A2E",appearance:"none"}}>
                {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:14,height:14,borderRadius:"50%",background:getPerson(form.personId).color}}/>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:getPerson(form.personId).color,fontWeight:600}}>{getPerson(form.personId).name}</span>
              </div>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>NOTE (optional)</label>
              <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Location, topic…" style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontFamily:"'DM Sans',sans-serif",fontSize:13,background:"#FAFAFA",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setModal(null)} style={{flex:1,padding:"10px 0",borderRadius:9,background:"#F5F4F0",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#888",fontWeight:600}}>Cancel</button>
              <button onClick={addEvent} style={{flex:2,padding:"10px 0",borderRadius:9,background:"#1A1A2E",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#E08A2E",fontWeight:700,letterSpacing:1}}>ADD EVENT</button>
            </div>
          </div>
        </div>
      )}

      {editModal&&(
        <div style={modalOverlay} onClick={()=>setEditModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={modalBox}>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#3A7FD5",letterSpacing:2,marginBottom:4}}>EDIT EVENT</div>
            <div style={{fontSize:17,fontWeight:700,color:"#1A1A2E",marginBottom:18}}>{editModal.date}</div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>EVENT TYPE</label>
              <div style={{display:"flex",gap:8}}>
                {EVENT_TYPES.map(t=><button key={t} onClick={()=>setForm(f=>({...f,type:t}))} style={{flex:1,padding:"9px 0",borderRadius:8,cursor:"pointer",fontWeight:600,fontFamily:"'DM Mono',monospace",fontSize:12,background:form.type===t?"#1A1A2E":"#F5F4F0",color:form.type===t?"#E08A2E":"#777",border:form.type===t?"2px solid #1A1A2E":"2px solid transparent",transition:"all .15s"}}>{t}</button>)}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>PERSON</label>
              <select value={form.personId} onChange={e=>setForm(f=>({...f,personId:Number(e.target.value)}))} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontFamily:"'DM Sans',sans-serif",fontSize:14,background:"#FAFAFA",color:"#1A1A2E"}}>
                {people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",letterSpacing:1,display:"block",marginBottom:6}}>NOTE</label>
              <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{width:"100%",padding:"9px 12px",borderRadius:8,border:"1.5px solid #E0E0E0",fontFamily:"'DM Sans',sans-serif",fontSize:13,background:"#FAFAFA",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>deleteEvent(editModal.id)} style={{flex:1,padding:"10px 0",borderRadius:9,background:"#FEE8E8",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#D45050",fontWeight:700}}>DELETE</button>
              <button onClick={()=>setEditModal(null)} style={{flex:1,padding:"10px 0",borderRadius:9,background:"#F5F4F0",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#888",fontWeight:600}}>Cancel</button>
              <button onClick={updateEvent} style={{flex:2,padding:"10px 0",borderRadius:9,background:"#1A1A2E",border:"none",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#E08A2E",fontWeight:700}}>SAVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
