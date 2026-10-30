/* ---------- Estado ---------- */
const STORE='appSemanal.v1';
const COLORS=['#3b34b0','#6366f1','#0b6e79','#4f6b7f','#a3480f','#9d2a6b'];
const DIAS=['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
const DIASL=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MESL=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function blank(){return {v:2,tasks:[],goals:{},calendars:[],notes:[],groups:[],layouts:{},evDone:{},evHidden:{},dayOrder:{}};}
function load(){try{const s=JSON.parse(localStorage.getItem(STORE));if(s&&Array.isArray(s.tasks))return Object.assign(blank(),s);}catch(e){}return blank();}
let state=load();
let storageOk=true;
function saveLocal(){try{const out=Object.assign({},state,{calendars:state.calendars.map(c=>c.google?Object.assign({},c,{events:[]}):c)});localStorage.setItem(STORE,JSON.stringify(out));storageOk=true;}catch(e){if(storageOk)toast('No se ha podido guardar en este navegador');storageOk=false;}}
function save(){const before=JSON.stringify(snap);stamp();saveLocal();if(JSON.stringify(snap)!==before)schedulePush();}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

/* ---------- Fechas ---------- */
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseDkey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d);};
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,d.getHours(),d.getMinutes(),d.getSeconds());
const mondayOf=d=>{const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());return addDays(x,-((x.getDay()+6)%7));};
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const day=(t.getUTCDay()+6)%7;t.setUTCDate(t.getUTCDate()-day+3);const y=t.getUTCFullYear();const f=new Date(Date.UTC(y,0,4));const w=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return {year:y,week:w};}
const weekKey=d=>{const {year,week}=isoWeek(d);return year+'-W'+pad(week);};
function weekStart(key){const [y,w]=key.split('-W').map(Number);return addDays(mondayOf(new Date(y,0,4)),(w-1)*7);}
const weekNum=key=>Number(key.split('-W')[1]);
function rangeLabel(key){const a=weekStart(key),b=addDays(a,6);const sameM=a.getMonth()===b.getMonth();return (sameM?a.getDate():a.getDate()+' '+MES[a.getMonth()])+' – '+b.getDate()+' '+MES[b.getMonth()]+' '+b.getFullYear();}
const todayKey=()=>dkey(new Date());
const fmtTime=d=>pad(d.getHours())+':'+pad(d.getMinutes());
function ago(ms){const m=Math.round((Date.now()-ms)/60000);if(m<1)return 'hace un momento';if(m<60)return 'hace '+m+' min';const h=Math.round(m/60);if(h<24)return 'hace '+h+' h';const d=new Date(ms);return 'el '+d.getDate()+' '+MES[d.getMonth()]+' a las '+fmtTime(d);}

/* ---------- Utilidades ---------- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let toastT;
function toast(msg){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>{el.hidden=true;},3200);}
const I={
 left:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
 right:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
 plus:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
 link:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"/></svg>',
 cal:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 note:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Tiene notas" role="img"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
 logo:'<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="2" y="4" width="24" height="22" rx="6" fill="#4f46e5"/><rect x="7" y="11" width="4" height="10" rx="2" fill="#fff"/><rect x="12" y="11" width="4" height="10" rx="2" fill="#fff" opacity=".7"/><rect x="17" y="11" width="4" height="10" rx="2" fill="#fff" opacity=".45"/></svg>'
};

/* ---------- Lector de calendarios .ics ---------- */
const fmtCache={};
function tzOffset(ms,tz){let f=fmtCache[tz];if(!f)f=fmtCache[tz]=new Intl.DateTimeFormat('en-US',{timeZone:tz,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});const o={};f.formatToParts(new Date(ms)).forEach(p=>o[p.type]=p.value);return Date.UTC(+o.year,+o.month-1,+o.day,+o.hour%24,+o.minute,+o.second)-ms;}
function zoned(y,mo,d,h,mi,s,tz){const g=Date.UTC(y,mo,d,h,mi,s);try{const o1=tzOffset(g,tz);let t=g-o1;const o2=tzOffset(t,tz);if(o2!==o1)t=g-o2;return t;}catch(e){return new Date(y,mo,d,h,mi,s).getTime();}}
function parseLine(line){let i=0,q=false;for(;i<line.length;i++){const c=line[i];if(c==='"')q=!q;else if(c===':'&&!q)break;}if(i>=line.length)return null;const parts=line.slice(0,i).split(';');const params={};parts.slice(1).forEach(x=>{const j=x.indexOf('=');if(j>0)params[x.slice(0,j).toUpperCase()]=x.slice(j+1).replace(/^"|"$/g,'');});return {name:parts[0].toUpperCase(),params,value:line.slice(i+1)};}
function parseDate(p){const v=p.value.trim();if(p.params.VALUE==='DATE'||/^\d{8}$/.test(v)){return {allDay:true,key:v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6,8)};}
 const m=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);if(!m)return null;const [y,mo,d,h,mi,s]=[+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)];
 let ms;if(m[7])ms=Date.UTC(y,mo,d,h,mi,s);else if(p.params.TZID)ms=zoned(y,mo,d,h,mi,s,p.params.TZID);else ms=new Date(y,mo,d,h,mi,s).getTime();return {allDay:false,ms};}
const unesc=s=>String(s||'').replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');
function parseDuration(v){const m=/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v||'');if(!m)return 0;return ((+m[2]||0)*7*864e5+(+m[3]||0)*864e5+(+m[4]||0)*36e5+(+m[5]||0)*6e4+(+m[6]||0)*1e3)*(m[1]==='-'?-1:1);}
function parseICS(text){
 if(!/BEGIN:VCALENDAR/i.test(text))throw new Error('El enlace no devuelve un calendario (.ics)');
 const raw=text.replace(/\r\n?/g,'\n').split('\n');const lines=[];
 for(const l of raw){if((l[0]===' '||l[0]==='\t')&&lines.length)lines[lines.length-1]+=l.slice(1);else lines.push(l);}
 const items=[];let cur=null;const stack=[];
 for(const line of lines){if(!line.trim())continue;const p=parseLine(line);if(!p)continue;
  if(p.name==='BEGIN'){const v=p.value.trim().toUpperCase();stack.push(v);if(v==='VEVENT')cur={};continue;}
  if(p.name==='END'){const v=stack.pop();if(v==='VEVENT'&&cur){items.push(cur);cur=null;}continue;}
  if(cur&&stack[stack.length-1]==='VEVENT')(cur[p.name]=cur[p.name]||[]).push(p);}
 const evs=[];
 for(const r of items){const g=n=>r[n]&&r[n][0];const ds=g('DTSTART');if(!ds)continue;const st=parseDate(ds);if(!st)continue;
  const en=g('DTEND')?parseDate(g('DTEND')):null;const dur=g('DURATION')?parseDuration(g('DURATION').value):null;
  const ev={uid:g('UID')?g('UID').value:uid(),title:unesc(g('SUMMARY')?g('SUMMARY').value:'')||'(Sin título)',location:unesc(g('LOCATION')?g('LOCATION').value:''),description:unesc(g('DESCRIPTION')?g('DESCRIPTION').value:''),url:g('URL')?g('URL').value.trim():'',allDay:st.allDay};
  if(st.allDay){ev.start=st.key;let end=en&&en.allDay?en.key:null;if(!end&&dur)end=dkey(addDays(parseDkey(st.key),Math.max(1,Math.round(dur/864e5))));if(!end||end<=st.key)end=dkey(addDays(parseDkey(st.key),1));ev.end=end;}
  else{ev.start=st.ms;ev.end=en&&!en.allDay?en.ms:(dur!=null?st.ms+dur:st.ms);if(ev.end<ev.start)ev.end=ev.start;}
  if(g('RRULE')){const rr={};g('RRULE').value.split(';').forEach(kv=>{const [k,v]=kv.split('=');if(k&&v)rr[k.toUpperCase()]=v;});ev.rrule=rr;}
  const ex=[];(r.EXDATE||[]).forEach(p=>p.value.split(',').forEach(v=>{const x=parseDate({params:p.params,value:v});if(x)ex.push(x.allDay?x.key:x.ms);}));if(ex.length)ev.exdates=ex;
  const rds=[];(r.RDATE||[]).forEach(p=>p.value.split(',').forEach(v=>{const x=parseDate({params:p.params,value:v});if(x)rds.push(x.allDay?x.key:x.ms);}));if(rds.length)ev.rdates=rds;
  if(g('RECURRENCE-ID')){const x=parseDate(g('RECURRENCE-ID'));if(x)ev.recurrenceId=x.allDay?x.key:x.ms;}
  if(g('STATUS')&&g('STATUS').value.trim().toUpperCase()==='CANCELLED')ev.cancelled=true;
  evs.push(ev);}
 const masters={};evs.forEach(e=>{if(e.rrule&&e.recurrenceId==null)masters[e.uid]=e;});
 evs.forEach(e=>{if(e.recurrenceId!=null&&masters[e.uid]){const m=masters[e.uid];(m.exdates=m.exdates||[]).push(e.recurrenceId);}});
 return evs.filter(e=>!e.cancelled).map(e=>{delete e.recurrenceId;return e;});
}
function parseUntil(v){const p=parseDate({params:{},value:v});if(!p)return null;return p.allDay?addDays(parseDkey(p.key),1).getTime()-1:p.ms;}
/* ---------- Repeticiones (RRULE) ---------- */
const BDN={MO:0,TU:1,WE:2,TH:3,FR:4,SA:5,SU:6};
const wdOf=d=>(d.getDay()+6)%7;
const dim=(y,m)=>new Date(y,m+1,0).getDate();
function parseByday(s){return String(s||'').split(',').map(x=>x.trim().toUpperCase()).map(x=>{const m=/^([+-]?\d{1,2})?(MO|TU|WE|TH|FR|SA|SU)$/.exec(x);return m?{n:m[1]?+m[1]:0,wd:BDN[m[2]]}:null;}).filter(Boolean);}
const nums=s=>String(s||'').split(',').map(x=>parseInt(x,10)).filter(x=>!isNaN(x)&&x!==0);
function daysByWeekday(y,m,bd){const n=dim(y,m),out=new Set();for(const {n:o,wd} of bd){const l=[];for(let d=1;d<=n;d++)if(wdOf(new Date(y,m,d))===wd)l.push(d);if(!o)l.forEach(x=>out.add(x));else{const x=o>0?l[o-1]:l[l.length+o];if(x)out.add(x);}}return out;}
function daysByMonthday(y,m,md){const n=dim(y,m),out=new Set();for(const v of md){const d=v>0?v:n+v+1;if(d>=1&&d<=n)out.add(d);}return out;}
function monthCands(y,m,bd,bmd,d0){let set;if(bd.length&&bmd.length){const b=daysByMonthday(y,m,bmd);set=[...daysByWeekday(y,m,bd)].filter(x=>b.has(x));}else if(bd.length)set=[...daysByWeekday(y,m,bd)];else if(bmd.length)set=[...daysByMonthday(y,m,bmd)];else set=d0<=dim(y,m)?[d0]:[];return set.sort((a,b)=>a-b);}
/* Devuelve los inicios (Date) de las repeticiones que tocan [from,to) */
function occurrences(ev,from,to){
 const s0=ev.allDay?parseDkey(ev.start):new Date(ev.start);
 const durMs=ev.allDay?(parseDkey(ev.end)-parseDkey(ev.start)):(ev.end-ev.start);
 const ex=new Set(ev.exdates||[]);const keyOf=d=>ev.allDay?dkey(d):d.getTime();
 const touches=d=>d<to&&d.getTime()+Math.max(durMs,1)>from.getTime();
 if(!ev.rrule)return touches(s0)?[s0]:[];
 const r=ev.rrule,freq=r.FREQ,interval=Math.max(1,+r.INTERVAL||1),count=r.COUNT?+r.COUNT:Infinity,until=r.UNTIL?parseUntil(r.UNTIL):null;
 const bd=parseByday(r.BYDAY),bmd=nums(r.BYMONTHDAY),bm=nums(r.BYMONTH).map(x=>x-1),bsp=nums(r.BYSETPOS);
 const H=s0.getHours(),M=s0.getMinutes(),S=s0.getSeconds();const mk=(y,mo,d)=>new Date(y,mo,d,H,M,S);
 const y0=s0.getFullYear(),m0=s0.getMonth(),d0=s0.getDate(),w0=mondayOf(s0);
 const res=[];let n=0;
 const emit=d=>{if(d<s0)return true;n++;if(n>count)return false;if(until!=null&&d.getTime()>until)return false;if(d>=to)return false;if(!ex.has(keyOf(d))&&touches(d))res.push(d);return true;};
 for(let p=0,g=0;g<40000;p+=interval,g++){
  let days=[],pStart;
  if(freq==='DAILY'){const d=mk(y0,m0,d0+p);pStart=d;if((!bm.length||bm.includes(d.getMonth()))&&(!bmd.length||daysByMonthday(d.getFullYear(),d.getMonth(),bmd).has(d.getDate()))&&(!bd.length||bd.some(x=>x.wd===wdOf(d))))days=[d];}
  else if(freq==='WEEKLY'){const mon=addDays(w0,p*7);pStart=mon;const wds=[...new Set(bd.length?bd.map(x=>x.wd):[wdOf(s0)])].sort((a,b)=>a-b);days=wds.map(o=>mk(mon.getFullYear(),mon.getMonth(),mon.getDate()+o)).filter(d=>!bm.length||bm.includes(d.getMonth()));}
  else if(freq==='MONTHLY'){const b=new Date(y0,m0+p,1);const Y=b.getFullYear(),Mo=b.getMonth();pStart=b;if(!bm.length||bm.includes(Mo))days=monthCands(Y,Mo,bd,bmd,d0).map(d=>mk(Y,Mo,d));}
  else if(freq==='YEARLY'){const Y=y0+p;pStart=new Date(Y,0,1);
   if(bd.length&&!bm.length&&!bmd.length){for(const {n:o,wd} of bd){const l=[];for(let d=new Date(Y,0,1);d.getFullYear()===Y;d=addDays(d,1))if(wdOf(d)===wd)l.push(d);if(!o)l.forEach(x=>days.push(mk(Y,x.getMonth(),x.getDate())));else{const x=o>0?l[o-1]:l[l.length+o];if(x)days.push(mk(Y,x.getMonth(),x.getDate()));}}days.sort((a,b)=>a-b);}
   else for(const Mo of (bm.length?[...bm].sort((a,b)=>a-b):[m0]))monthCands(Y,Mo,bd,bmd,d0).forEach(d=>days.push(mk(Y,Mo,d)));}
  else{if(touches(s0)&&!ex.has(keyOf(s0)))res.push(s0);break;}
  if(bsp.length&&days.length){const srt=days;days=bsp.map(i=>i>0?srt[i-1]:srt[srt.length+i]).filter(Boolean).sort((a,b)=>a-b);days=days.filter((d,i)=>i===0||d.getTime()!==days[i-1].getTime());}
  if(!days.length&&pStart>=to)break;
  let stop=false;for(const d of days){if(!emit(d)){stop=true;break;}}if(stop)break;
 }
 for(const rd of (ev.rdates||[])){const d=ev.allDay?parseDkey(rd):new Date(rd);if(touches(d)&&!ex.has(keyOf(d))&&!res.some(x=>x.getTime()===d.getTime()))res.push(d);}
 return res.sort((a,b)=>a-b);
}
const ORDN={1:'primer',2:'segundo',3:'tercer',4:'cuarto',5:'quinto','-1':'último','-2':'penúltimo'};
function describeRule(r){if(!r)return '';const iv=+r.INTERVAL||1;const bd=parseByday(r.BYDAY);
 let t={DAILY:iv>1?`Cada ${iv} días`:'Cada día',WEEKLY:iv>1?`Cada ${iv} semanas`:'Cada semana',MONTHLY:iv>1?`Cada ${iv} meses`:'Cada mes',YEARLY:iv>1?`Cada ${iv} años`:'Cada año'}[r.FREQ]||'Se repite';
 if(bd.length){const parts=bd.map(x=>(x.n?(ORDN[x.n]||x.n+'º')+' ':'')+DIASL[x.wd]);t+=' el '+(parts.length>1?parts.slice(0,-1).join(', ')+' y '+parts[parts.length-1]:parts[0]);}
 else if(r.BYMONTHDAY)t+=' el día '+r.BYMONTHDAY;
 if(r.BYMONTH&&r.FREQ==='YEARLY')t+=' de '+nums(r.BYMONTH).map(m=>MESL[m-1]).join(', ');
 if(r.COUNT)t+=`, ${r.COUNT} veces`;
 if(r.UNTIL){const u=parseUntil(r.UNTIL);if(u){const d=new Date(u);t+=`, hasta el ${d.getDate()} de ${MESL[d.getMonth()]} de ${d.getFullYear()}`;}}
 return t;}

/* ---------- Colores ---------- */
const GCOL={1:{hex:'#7986cb',name:'Lavanda'},2:{hex:'#33b679',name:'Salvia'},3:{hex:'#8e24aa',name:'Uva'},4:{hex:'#e67c73',name:'Flamenco'},5:{hex:'#f6bf26',name:'Plátano'},6:{hex:'#f4511e',name:'Mandarina'},7:{hex:'#039be5',name:'Pavo real'},8:{hex:'#616161',name:'Grafito'},9:{hex:'#3f51b5',name:'Arándano'},10:{hex:'#0b8043',name:'Albahaca'},11:{hex:'#d50000',name:'Tomate'}};
function hex6(c){c=String(c||'').trim();if(/^#[0-9a-f]{6}$/i.test(c))return c.toLowerCase();if(/^#[0-9a-f]{3}$/i.test(c))return '#'+c.slice(1).split('').map(x=>x+x).join('').toLowerCase();return '#4f46e5';}
function lum(hex){const n=parseInt(hex6(hex).slice(1),16);const ch=[n>>16&255,n>>8&255,n&255].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*ch[0]+.7152*ch[1]+.0722*ch[2];}
function textOn(hex){const L=lum(hex);return 1.05/(L+.05)>=(L+.05)/(0.0088+.05)?'#ffffff':'#14181f';}
function evColor(o){return hex6((o.ev.colorId&&GCOL[o.ev.colorId]&&GCOL[o.ev.colorId].hex)||o.c.color);}

/* ---------- Eventos de la semana ---------- */
let OCC=[];
function eventsForWeek(key){
 const mon=weekStart(key),end=addDays(mon,7);const lastWeekDay=dkey(addDays(mon,6));const byDay={};for(let i=0;i<7;i++)byDay[dkey(addDays(mon,i))]=[];
 for(const c of state.calendars){if(!c.visible)continue;for(const ev of (c.events||[])){let occ;try{occ=occurrences(ev,mon,end);}catch(e){continue;}
  for(const s of occ){const i=OCC.length;
   if(ev.allDay){const days=Math.max(1,Math.round((parseDkey(ev.end)-parseDkey(ev.start))/864e5));OCC.push({c,ev,start:s,end:addDays(s,days)});
    for(let k=0;k<days;k++){const dk=dkey(addDays(s,k));if(byDay[dk])byDay[dk].push({i,label:days>1?`Todo el día · ${k+1}/${days}`:'Todo el día',sort:-1});}}
   else{const e=new Date(s.getTime()+(ev.end-ev.start));OCC.push({c,ev,start:s,end:e});
    const last=e>s?new Date(e.getTime()-1):s;const lastK=dkey(last),firstK=dkey(s);
    let d=new Date(Math.max(new Date(s.getFullYear(),s.getMonth(),s.getDate()).getTime(),mon.getTime()));
    for(let g=0;g<8;g++){const k=dkey(d);const isF=k===firstK,isL=k===lastK;
     const label=isF&&isL?fmtTime(s)+(e>s?'–'+fmtTime(e):''):isF?fmtTime(s)+' → '+e.getDate()+' '+MES[e.getMonth()]:isL?'hasta las '+fmtTime(e):'Todo el día';
     if(byDay[k])byDay[k].push({i,label,sort:isF?s.getHours()*60+s.getMinutes():-1});
     if(isL||k>=lastWeekDay)break;d=addDays(d,1);}}}}}
 Object.values(byDay).forEach(a=>a.sort((x,y)=>x.sort-y.sort));return byDay;
}

/* ---------- Calendarios importados (.ics) ---------- */
const syncing=new Set();
function syncCal(){toast('En la web los enlaces .ics se añaden en Google Calendar (Otros calendarios › Desde URL).');}

/* ---------- Eventos de Google ---------- */
function gTime(t){if(!t)return null;if(t.date)return {allDay:true,key:t.date};const ms=Date.parse(t.dateTime);return isNaN(ms)?null:{allDay:false,ms};}
function gConv(it){const s=gTime(it.start),e=gTime(it.end);if(!s)return null;
 const conf=((it.conferenceData&&it.conferenceData.entryPoints)||[]).find(x=>x.entryPointType==='video');
 const ev={uid:it.id,gid:it.id,masterId:it.recurringEventId||'',title:it.summary||'(Sin título)',location:it.location||'',description:it.description||'',colorId:it.colorId||'',htmlLink:it.htmlLink||'',allDay:s.allDay,
  attendees:(it.attendees||[]).map(a=>({email:a.email||'',name:a.displayName||'',status:a.responseStatus||'',organizer:!!a.organizer,self:!!a.self,optional:!!a.optional})),
  organizer:it.organizer?(it.organizer.displayName||it.organizer.email||''):'',organizerSelf:!!(it.organizer&&it.organizer.self),
  meet:it.hangoutLink||(conf&&conf.uri)||'',reminders:it.reminders||null};
 if(s.allDay){ev.start=s.key;ev.end=(e&&e.allDay&&e.key>s.key)?e.key:dkey(addDays(parseDkey(s.key),1));}else{ev.start=s.ms;ev.end=e&&!e.allDay&&e.ms>=s.ms?e.ms:s.ms;}
 for(const line of (it.recurrence||[])){const p=parseLine(line);if(!p)continue;
  if(p.name==='RRULE'){const rr={};p.value.split(';').forEach(kv=>{const [k,v]=kv.split('=');if(k&&v)rr[k.toUpperCase()]=v;});ev.rrule=rr;}
  else if(p.name==='EXDATE'||p.name==='RDATE'){p.value.split(',').forEach(v=>{const x=parseDate({params:p.params,value:v});if(!x)return;const k=x.allDay?x.key:x.ms;if(p.name==='EXDATE')(ev.exdates=ev.exdates||[]).push(k);else(ev.rdates=ev.rdates||[]).push(k);});}}
 return ev;}
function googleToEvents(items){const masters={},out=[];
 for(const it of items){if(it.recurringEventId||it.status==='cancelled')continue;const ev=gConv(it);if(ev){out.push(ev);if(ev.rrule)masters[it.id]=ev;}}
 for(const it of items){if(!it.recurringEventId)continue;const m=masters[it.recurringEventId];const o=gTime(it.originalStartTime);
  if(m&&o)(m.exdates=m.exdates||[]).push(o.allDay?o.key:o.ms);
  if(it.status!=='cancelled'){const ev=gConv(it);if(ev)out.push(ev);}}
 return out;}
function applyGoogle(cals,connected){const seen=new Set();
 for(const gc of cals){const id='g:'+gc.id;seen.add(id);let c=state.calendars.find(x=>x.id===id);
  if(!c){c={id,google:true,gid:gc.id,name:gc.summary,color:gc.color||COLORS[state.calendars.length%COLORS.length],visible:true};state.calendars.push(c);}
  c.name=gc.summary;c.gcolor=gc.color||'';if(!c.customColor&&gc.color)c.color=gc.color;const pf=(state.calPrefs||{})[id];if(pf){if(typeof pf.visible==='boolean')c.visible=pf.visible;c.customColor=!!pf.customColor;if(pf.customColor&&pf.color)c.color=pf.color;}c.writable=!!gc.writable;c.primary=!!gc.primary;
  try{c.events=googleToEvents(gc.items||[]);}catch(e){c.events=[];}c.lastSync=Date.now();c.lastError='';}
 state.calendars=state.calendars.filter(c=>!c.google||(connected&&seen.has(c.id)));saveLocal();}

/* ---------- Conexión con Google (desde el navegador + intermediario) ---------- */
const CFG=window.APP_CONFIG||{};
const SCOPES=['https://www.googleapis.com/auth/calendar.readonly','https://www.googleapis.com/auth/calendar.events','https://www.googleapis.com/auth/drive.appdata'].join(' ');
const CAL_API='https://www.googleapis.com/calendar/v3',DRIVE_API='https://www.googleapis.com/drive/v3',DRIVE_UP='https://www.googleapis.com/upload/drive/v3';
const AUTH_KEY='appSemanal.google',PKCE_KEY='appSemanal.pkce';
const REDIRECT=location.origin+location.pathname.replace(/index\.html$/,'');
const workerUrl=p=>String(CFG.authWorker||'').replace(/\/+$/,'')+p;
const configured=()=>!!(CFG.googleClientId&&CFG.authWorker);
function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch(_){return null;}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(_){}}
let gAuth=lsGet(AUTH_KEY); // {session, access, exp, scope, email, lost}
const saveAuth=()=>lsSet(AUTH_KEY,gAuth);
const hasScope=s=>!!(gAuth&&(gAuth.scope||'').includes(s));
const G={cals:{},email:'',lastList:0,error:'',lastSync:0,busy:false};
let gStatus=null;
function updateGStatus(){const before=JSON.stringify(gStatus);
 gStatus={configured:configured(),connected:!!(gAuth&&!gAuth.lost),lost:!!(gAuth&&gAuth.lost),email:G.email||(gAuth&&gAuth.email)||'',error:G.error,canWrite:hasScope('auth/calendar.events'),drive:hasScope('auth/drive.appdata'),driveState:D.state,driveAt:D.at};
 return JSON.stringify(gStatus)!==before;}
const b64url=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randStr=n=>b64url(crypto.getRandomValues(new Uint8Array(n)));
async function gConnect(){
 if(!configured()){toast('Falta configurar la conexión con Google (config.js).');return;}
 const verifier=randStr(48),state=randStr(16);
 const challenge=b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));
 lsSet(PKCE_KEY,{verifier,state,back:location.hash,at:Date.now()});
 location.href='https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({client_id:CFG.googleClientId,redirect_uri:REDIRECT,response_type:'code',scope:SCOPES,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,code_challenge:challenge,code_challenge_method:'S256'});}
async function handleRedirect(){
 const q=new URLSearchParams(location.search);if(!q.has('code')&&!q.has('error'))return;
 const p=lsGet(PKCE_KEY);lsSet(PKCE_KEY,null);
 history.replaceState(null,'',REDIRECT);
 if(q.has('error')){toast(q.get('error')==='access_denied'?'Has cancelado la conexión con Google':'Google no completó la conexión');return;}
 if(!p||p.state!==q.get('state')){toast('La conexión con Google no se pudo verificar. Vuelve a intentarlo.');return;}
 try{const r=await fetch(workerUrl('/exchange'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:q.get('code'),code_verifier:p.verifier,redirect_uri:REDIRECT})});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Error '+r.status));
  gAuth={session:d.session,access:d.access_token,exp:Date.now()+(d.expires_in||3600)*1000,scope:d.scope||'',email:''};saveAuth();G.cals={};G.lastList=0;D.file=null;D.mod='';
  toast('Google conectado');}
 catch(e){toast('No se pudo conectar: '+e.message);}}
let refreshing=null;
async function gToken(){
 if(!gAuth||gAuth.lost)throw new Error('No hay cuenta de Google conectada.');
 if(gAuth.access&&gAuth.exp>Date.now()+60000)return gAuth.access;
 if(!refreshing)refreshing=(async()=>{
  const r=await fetch(workerUrl('/refresh'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:gAuth.session})});
  const d=await r.json().catch(()=>({}));
  if(r.status===401){gAuth.lost=true;saveAuth();throw new Error('Google ha retirado el permiso. Vuelve a conectar.');}
  if(!r.ok)throw new Error(d.error||('No se pudo renovar la conexión ('+r.status+')'));
  gAuth.access=d.access_token;gAuth.exp=Date.now()+(d.expires_in||3600)*1000;if(d.scope)gAuth.scope=d.scope;saveAuth();return gAuth.access;})().finally(()=>{refreshing=null;});
 return refreshing;}
async function gfetch(url,opts={}){
 for(let a=0;a<2;a++){const t=await gToken();const r=await fetch(url,Object.assign({},opts,{headers:Object.assign({},opts.headers||{},{Authorization:'Bearer '+t})}));
  if(r.status===401&&a===0){gAuth.exp=0;continue;}return r;}}
class Gone extends Error{}
async function apiErr(r){let m='';try{const d=await r.json();m=(d.error&&d.error.message)||'';}catch(_){}
 if(r.status===403&&/scope|insufficient/i.test(m))return new Error('Falta permiso. Pulsa «Dar permiso» en Calendarios.');
 if(r.status===403)return new Error('No tienes permiso para cambiar ese calendario.');
 return new Error('Google respondió '+r.status+(m?': '+m:''));}
async function gList(){
 const r=await gfetch(CAL_API+'/users/me/calendarList?maxResults=250&fields='+encodeURIComponent('items(id,summary,summaryOverride,selected,primary,backgroundColor,accessRole)'));
 if(!r.ok)throw await apiErr(r);const d=await r.json();const want={};
 for(const c of d.items||[]){if(c.primary){G.email=c.id;if(gAuth&&gAuth.email!==c.id){gAuth.email=c.id;saveAuth();}}
  if(c.selected||c.primary)want[c.id]={summary:c.summaryOverride||c.summary||c.id,color:c.backgroundColor||'',writable:['owner','writer'].includes(c.accessRole),primary:!!c.primary};}
 let changed=false;
 for(const id of Object.keys(G.cals))if(!want[id]){delete G.cals[id];changed=true;}
 for(const [id,m] of Object.entries(want)){const c=G.cals[id];if(!c){G.cals[id]=Object.assign({},m,{syncToken:null,raw:{}});changed=true;}else if(Object.keys(m).some(k=>c[k]!==m[k])){Object.assign(c,m);changed=true;}}
 return changed;}
const EV_FIELDS='items(id,status,summary,location,description,start,end,recurrence,recurringEventId,originalStartTime,colorId,htmlLink,hangoutLink,attendees(email,displayName,responseStatus,organizer,self,optional),organizer(email,displayName,self),reminders,conferenceData(entryPoints(entryPointType,uri,label))),nextPageToken,nextSyncToken';
async function gSyncCal(id){
 const cal=G.cals[id];if(!cal)return false;const full=!cal.syncToken;const items=[];let page=null,next=null;
 do{const q={maxResults:'2500',showDeleted:'true',fields:EV_FIELDS};if(!full)q.syncToken=cal.syncToken;if(page)q.pageToken=page;
  const r=await gfetch(CAL_API+'/calendars/'+encodeURIComponent(id)+'/events?'+new URLSearchParams(q));
  if(r.status===410){cal.syncToken=null;return gSyncCal(id);}
  if(!r.ok)throw await apiErr(r);const d=await r.json();items.push(...(d.items||[]));page=d.nextPageToken;next=d.nextSyncToken;}while(page);
 if(full){cal.raw={};}
 for(const it of items){if(it.status==='cancelled'&&!it.recurringEventId)delete cal.raw[it.id];else cal.raw[it.id]=it;}
 cal.syncToken=next;return full||items.length>0;}
function gApply(){applyGoogle(Object.entries(G.cals).map(([id,c])=>({id,summary:c.summary,color:c.color,writable:c.writable,primary:c.primary,items:Object.values(c.raw)})),!!(gAuth&&!gAuth.lost));}
async function gTick(force){
 if(!gAuth||gAuth.lost||G.busy||(document.hidden&&!force)){if(updateGStatus())render();return;}
 G.busy=true;let changed=false;
 try{if(force||Date.now()-G.lastList>300000){changed=await gList()||changed;G.lastList=Date.now();}
  for(const id of Object.keys(G.cals))changed=(await gSyncCal(id))||changed;
  G.error='';G.lastSync=Date.now();}
 catch(e){G.error=e.message||String(e);}
 finally{G.busy=false;}
 if(changed)gApply();
 if(updateGStatus()||changed)render();}
async function gWrite(action,calendarId,eventId,body){
 const base=CAL_API+'/calendars/'+encodeURIComponent(calendarId)+'/events';let r;
 if(action==='create')r=await gfetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 else if(action==='update')r=await gfetch(base+'/'+encodeURIComponent(eventId),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 else{r=await gfetch(base+'/'+encodeURIComponent(eventId),{method:'DELETE'});if(r.status===410)r={ok:true};}
 if(!r.ok)throw await apiErr(r);
 try{await gSyncCal(calendarId);gApply();render();}catch(_){}
 return true;}
async function gDisconnect(){
 if(gAuth&&gAuth.session){try{await fetch(workerUrl('/revoke'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:gAuth.session})});}catch(_){}}
 gAuth=null;saveAuth();G.cals={};G.email='';G.error='';D.file=null;D.mod='';D.state='';applyGoogle([],false);updateGStatus();render();}

/* ---------- Tus tareas en tu Google Drive (carpeta privada de la app) ---------- */
const D={file:null,mod:'',state:'',at:0,pushing:false,again:false,timer:null};
const DRIVE_NAME='app-semanal.json';
const COLLS={
 tasks:{get:()=>Object.fromEntries(state.tasks.map(t=>[t.id,t])),set:m=>{state.tasks=Object.values(m);}},
 goals:{get:()=>Object.assign({},state.goals),set:m=>{state.goals=m;}},
 calPrefs:{get:()=>Object.assign({},state.calPrefs||{}),set:m=>{state.calPrefs=m;applyCalPrefs();}},
 notes:{get:()=>Object.fromEntries((state.notes||[]).map(n=>[n.id,n])),set:m=>{state.notes=Object.values(m);}},
 groups:{get:()=>Object.fromEntries((state.groups||[]).map(g=>[g.id,g])),set:m=>{state.groups=Object.values(m);}},
 layouts:{get:()=>Object.assign({},state.layouts||{}),set:m=>{state.layouts=m;}},
 evDone:{get:()=>Object.assign({},state.evDone||{}),set:m=>{state.evDone=m;}},
 evHidden:{get:()=>Object.assign({},state.evHidden||{}),set:m=>{state.evHidden=m;}},
 dayOrder:{get:()=>Object.assign({},state.dayOrder||{}),set:m=>{state.dayOrder=m;}},
 icsCals:{get:()=>Object.fromEntries(state.calendars.filter(c=>!c.google).map(c=>[c.id,c])),set:m=>{state.calendars=state.calendars.filter(c=>c.google).concat(Object.values(m));}}
};
let snap=null;
function snapshot(){const s={};for(const [n,C] of Object.entries(COLLS)){const m=C.get();s[n]={};for(const k in m)s[n][k]=JSON.stringify(m[k]);}return s;}
function stamp(){const now=Date.now();state.ts=state.ts||{};state.tomb=state.tomb||{};const cur=snapshot();
 for(const n of Object.keys(COLLS)){const ts=state.ts[n]=state.ts[n]||{},tb=state.tomb[n]=state.tomb[n]||{},prev=snap&&snap[n];
  for(const k in cur[n]){if(!ts[k]||(prev&&prev[k]!==cur[n][k]))ts[k]=now;if(tb[k]&&tb[k]<ts[k])delete tb[k];}
  if(prev)for(const k in prev)if(!(k in cur[n])){tb[k]=now;delete ts[k];}
  for(const k in tb)if(now-tb[k]>90*864e5)delete tb[k];}
 snap=cur;}
const stable=o=>JSON.stringify(Object.keys(o||{}).sort().map(k=>[k,o[k]]));
function mergeDoc(R){let localChanged=false,needPush=false;state.ts=state.ts||{};state.tomb=state.tomb||{};
 for(const [n,C] of Object.entries(COLLS)){const L=C.get(),lts=state.ts[n]||{},ltb=state.tomb[n]||{};
  const Rm=(R.data&&R.data[n])||{},rts=(R.ts&&R.ts[n])||{},rtb=(R.tomb&&R.tomb[n])||{};
  const out={},ots={},otb={};
  for(const k of new Set([...Object.keys(L),...Object.keys(Rm),...Object.keys(ltb),...Object.keys(rtb)])){
   const tomb=Math.max(ltb[k]||0,rtb[k]||0);const lt=k in L?(lts[k]||1):0,rt=k in Rm?(rts[k]||1):0;
   if(Math.max(lt,rt)>tomb){if(lt>=rt){out[k]=L[k];ots[k]=lt;}else{out[k]=Rm[k];ots[k]=rt;}}else if(tomb)otb[k]=tomb;}
  const so=stable(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,JSON.stringify(v)])));
  if(so!==stable(Object.fromEntries(Object.entries(L).map(([k,v])=>[k,JSON.stringify(v)]))))localChanged=true;
  if(so!==stable(Object.fromEntries(Object.entries(Rm).map(([k,v])=>[k,JSON.stringify(v)])))||stable(otb)!==stable(rtb)||stable(ots)!==stable(rts))needPush=true;
  C.set(out);state.ts[n]=ots;state.tomb[n]=otb;}
 snap=snapshot();return {localChanged,needPush};}
function docOf(){const data={};for(const [n,C] of Object.entries(COLLS))data[n]=C.get();return {v:1,app:'App Semanal',savedAt:new Date().toISOString(),data,ts:state.ts||{},tomb:state.tomb||{}};}
const driveOn=()=>!!(gAuth&&!gAuth.lost&&hasScope('auth/drive.appdata'));
async function driveFind(){const r=await gfetch(DRIVE_API+'/files?'+new URLSearchParams({spaces:'appDataFolder',q:`name='${DRIVE_NAME}' and trashed=false`,fields:'files(id,modifiedTime)',orderBy:'modifiedTime desc'}));if(!r.ok)throw await apiErr(r);const d=await r.json();return (d.files||[])[0]||null;}
async function drivePull(noPush){
 if(!driveOn())return;
 if(!D.file){const f=await driveFind();if(!f){D.file=null;if(!noPush)await drivePush(true);return;}D.file=f.id;}
 const m=await gfetch(DRIVE_API+'/files/'+D.file+'?fields=modifiedTime');
 if(m.status===404){D.file=null;D.mod='';return drivePull(noPush);}
 if(!m.ok)throw await apiErr(m);const meta=await m.json();
 if(meta.modifiedTime===D.mod)return;
 const r=await gfetch(DRIVE_API+'/files/'+D.file+'?alt=media');if(!r.ok)throw await apiErr(r);
 let R={};try{R=await r.json();}catch(_){}
 D.mod=meta.modifiedTime;const {localChanged,needPush}=mergeDoc(R);
 if(localChanged){saveLocal();render();}
 if(needPush&&!noPush)await drivePush(true);}
async function drivePush(skipPull){
 if(!driveOn())return;if(D.pushing){D.again=true;return;}D.pushing=true;
 try{if(!skipPull)await drivePull(true);
  const body=JSON.stringify(docOf());let r;
  if(D.file)r=await gfetch(DRIVE_UP+'/files/'+D.file+'?uploadType=media&fields=id,modifiedTime',{method:'PATCH',headers:{'Content-Type':'application/json'},body});
  else{const bd='as'+randStr(12);const meta={name:DRIVE_NAME,parents:['appDataFolder'],mimeType:'application/json'};
   r=await gfetch(DRIVE_UP+'/files?uploadType=multipart&fields=id,modifiedTime',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+bd},body:`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${bd}--`});}
  if(!r.ok)throw await apiErr(r);const d=await r.json();D.file=d.id;D.mod=d.modifiedTime;D.state='ok';D.at=Date.now();}
 catch(e){D.state='error:'+(e.message||e);}
 finally{D.pushing=false;if(updateGStatus()&&route().v==='calendarios')render();if(D.again){D.again=false;drivePush();}}}
async function driveTick(force){if(!driveOn()||(document.hidden&&!force)||D.pushing)return;
 try{await drivePull();if(D.state!=='ok'||!D.at){D.state='ok';D.at=Date.now();}else D.at=Date.now();}
 catch(e){D.state='error:'+(e.message||e);}
 if(updateGStatus()&&route().v==='calendarios')render();}
function schedulePush(){if(!driveOn())return;clearTimeout(D.timer);D.timer=setTimeout(()=>drivePush(),1500);}
function applyCalPrefs(){for(const c of state.calendars){if(!c.google)continue;const p=(state.calPrefs||{})[c.id];if(!p)continue;if(typeof p.visible==='boolean')c.visible=p.visible;c.customColor=!!p.customColor;if(p.customColor&&p.color)c.color=p.color;else if(c.gcolor)c.color=c.gcolor;}}
function setCalPref(c){if(!c.google)return;state.calPrefs=state.calPrefs||{};state.calPrefs[c.id]={visible:!!c.visible,customColor:!!c.customColor,color:c.customColor?c.color:''};}

function googleCard(){
 const box=b=>`<div class="card" style="padding:16px;display:flex;flex-direction:column;gap:10px;border-radius:16px"><span class="title">Google Calendar y sincronización</span>${b}</div>`;
 const g=gStatus||{};
 if(!g.configured)return box('<span class="meta">La conexión con Google todavía no está configurada en esta web (falta rellenar config.js).</span>');
 if(!g.connected)return box(`<span class="meta">${g.lost?'<span class="err">Google ha retirado el permiso (o lo quitaste tú).</span> ':''}Conecta tu cuenta una vez en este dispositivo: verás y editarás tu Google Calendar al momento, y tus tareas se guardarán en tu Google Drive para tenerlas en todos tus dispositivos.</span><div><button class="btn primary" data-act="g-connect">${I.link}${g.lost?'Volver a conectar':'Conectar con Google'}</button></div>`);
 const ds=g.driveState||'';const drive=!g.drive?'<span class="meta">Tus tareas aún no se sincronizan.</span>':ds.startsWith('error:')?`<span class="meta err">Tareas: ${esc(ds.slice(6))}</span>`:g.driveAt?`<span class="meta ok">Tareas sincronizadas con tu Google Drive · ${ago(g.driveAt)}</span>`:'<span class="meta">Sincronizando tareas…</span>';
 const perm=(!g.canWrite||!g.drive)?`<span class="meta">Falta algún permiso (editar eventos o guardar tareas en Drive).</span><div><button class="btn small primary" data-act="g-connect">Dar permiso</button></div>`:'';
 return box(`<span class="meta ${g.error?'err':'ok'}">${g.error?esc(g.error):'Conectado'+(g.email?' como '+esc(g.email):'')+' · cambios cada 10 segundos'}</span>${drive}${perm}<div style="display:flex;gap:8px;flex-wrap:wrap">${g.error?'<button class="btn small" data-act="g-retry">Reintentar</button>':''}<button class="btn small danger" data-act="g-disconnect">Desconectar Google</button></div>`);}

/* ---------- Ficha de evento ---------- */
const byId=id=>document.getElementById(id);
const TZ=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'Europe/Madrid';
const IC={
 clock:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 repeat:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
 pin:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
 video:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/></svg>',
 text:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
 people:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/></svg>',
 bell:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',
 link:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1 1"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"/></svg>'
};
const RESP={accepted:'ha aceptado',declined:'ha rechazado',tentative:'quizá',needsAction:'sin responder'};
function fmtLong(d){return DIASL[wdOf(d)]+', '+d.getDate()+' de '+MESL[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' de '+d.getFullYear():'');}
function whenText(o){const {ev,start,end}=o;
 if(ev.allDay){const last=addDays(end,-1);return dkey(start)===dkey(last)||last<start?fmtLong(start)+' · todo el día':fmtLong(start)+' – '+fmtLong(last)+' · todo el día';}
 if(end<=start)return fmtLong(start)+' · '+fmtTime(start);
 return dkey(start)===dkey(new Date(end.getTime()-1))?fmtLong(start)+' · '+fmtTime(start)+' – '+fmtTime(end):fmtLong(start)+', '+fmtTime(start)+' – '+fmtLong(end)+', '+fmtTime(end);}
function descText(s){if(!s)return '';if(!/<[a-z][\s\S]*>/i.test(s))return s;
 const doc=new DOMParser().parseFromString(String(s).replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li|h\d)>/gi,'\n'),'text/html');
 doc.querySelectorAll('a').forEach(a=>{const h=a.getAttribute('href')||'';if(/^https?:/i.test(h)&&!a.textContent.includes(h))a.textContent=a.textContent+' ('+h+')';});
 return doc.body.textContent.replace(/\n{3,}/g,'\n\n').trim();}
function linkify(t){return esc(t).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g,u=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);}
function remindersText(rm){if(!rm)return '';if(rm.useDefault)return 'Aviso predeterminado del calendario';const ov=rm.overrides||[];if(!ov.length)return 'Sin avisos';
 return ov.map(x=>{const m=+x.minutes||0;const t=m===0?'a la hora':m%10080===0?(m/10080)+' semana'+(m>10080?'s':'')+' antes':m%1440===0?(m/1440)+' día'+(m>1440?'s':'')+' antes':m%60===0?(m/60)+' hora'+(m>60?'s':'')+' antes':m+' minutos antes';return t+(x.method==='email'?' (correo)':'');}).join(' · ');}
const evRow=(icon,html)=>`<div class="evrow">${icon}<div style="min-width:0;flex-grow:1">${html}</div></div>`;
const evDlg=byId('evDlg');let evOcc=null;
function canEditCal(c){return !!(c&&c.google&&c.writable&&gStatus&&gStatus.connected&&gStatus.canWrite);}
function masterOf(o){const {ev,c}=o;return ev.rrule?ev:(ev.masterId?(c.events||[]).find(x=>x.gid===ev.masterId)||null:null);}
function openEvent(i){const o=OCC[i];if(!o)return;evOcc=o;const {ev,c}=o;const bg=evColor(o);const m=masterOf(o);
 const rows=[evRow(IC.clock,esc(whenText(o)))];
 if(m&&m.rrule)rows.push(evRow(IC.repeat,esc(describeRule(m.rrule))+(ev.masterId?' <span class="meta">(esta vez está cambiada)</span>':'')));
 if(ev.location)rows.push(evRow(IC.pin,`${linkify(ev.location)}<div><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(ev.location)}" target="_blank" rel="noopener noreferrer">Ver en el mapa</a></div>`));
 if(/^https:\/\//i.test(ev.meet||''))rows.push(evRow(IC.video,`<a class="btn small primary" href="${esc(ev.meet)}" target="_blank" rel="noopener noreferrer">Unirse a la videollamada</a> <span class="meta">${esc(ev.meet.replace(/^https:\/\//,''))}</span>`));
 if(ev.description)rows.push(evRow(IC.text,`<div class="desc">${linkify(descText(ev.description))}</div>`));
 if(/^https?:\/\//i.test(ev.url||''))rows.push(evRow(IC.link,`<a href="${esc(ev.url)}" target="_blank" rel="noopener noreferrer">${esc(ev.url)}</a>`));
 if(ev.attendees&&ev.attendees.length){const yes=ev.attendees.filter(a=>a.status==='accepted').length;
  rows.push(evRow(IC.people,`<div>${ev.attendees.length} invitado${ev.attendees.length>1?'s':''} · ${yes} sí</div><ul class="att">${ev.attendees.map(a=>`<li><span>${esc(a.name||a.email)}${a.self?' (tú)':''}</span>${a.organizer?' <span class="meta">· organiza</span>':''}${a.optional?' <span class="meta">· opcional</span>':''} <span class="meta">· ${RESP[a.status]||a.status}</span></li>`).join('')}</ul>`));}
 else if(ev.organizer&&!ev.organizerSelf)rows.push(evRow(IC.people,'Organiza: '+esc(ev.organizer)));
 if(ev.reminders)rows.push(evRow(IC.bell,esc(remindersText(ev.reminders))));
 const edit=canEditCal(c);const recurring=!!(ev.rrule||ev.masterId);
 const note=c.google&&!edit?(c.writable?'<p class="meta" style="margin:0">Para editar desde la app, ve a Calendarios y pulsa «Dar permiso para editar».</p>':'<p class="meta" style="margin:0">Este calendario es de solo lectura.</p>'):(!c.google?'<p class="meta" style="margin:0">Calendario por enlace: solo lectura.</p>':'');
 byId('evDlgBody').innerHTML=`<div style="display:flex;gap:12px;align-items:flex-start"><span class="dot" style="width:14px;height:14px;margin-top:8px;background:${bg}"></span><div style="flex-grow:1;min-width:0"><h2 id="evDlgTitle" style="margin:0;font-size:20px;line-height:26px;font-weight:700;overflow-wrap:anywhere">${esc(ev.title)}</h2><span class="meta">${esc(c.name)}</span></div><button class="btn icon ghost" data-ev="close" aria-label="Cerrar">✕</button></div>
 ${rows.join('')}${note}
 <div id="evDelAsk" class="card" style="padding:12px;display:none;flex-direction:column;gap:8px"><span style="font-weight:600">¿Qué quieres eliminar?</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small danger" data-ev="del-one">Solo este evento</button><button class="btn small danger" data-ev="del-series">Toda la serie</button><button class="btn small" data-ev="del-cancel">Cancelar</button></div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn ghost" data-ev="mk-task">Crear tarea</button>${ev.htmlLink?`<a class="btn ghost" href="${esc(ev.htmlLink)}" target="_blank" rel="noopener noreferrer">Abrir en Google Calendar</a>`:''}${edit?`<button class="btn danger" data-ev="${recurring?'del-ask':'del-one'}">Eliminar evento</button><button class="btn primary" data-ev="edit">Editar evento</button>`:''}</div>`;
 evDlg.showModal();}
function instanceId(ev,start){if(ev.allDay)return ev.gid+'_'+dkey(start).replace(/-/g,'');const d=new Date(start);return ev.gid+'_'+d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+'Z';}
function targetId(o,scope){const {ev,start}=o;if(ev.rrule)return scope==='series'?ev.gid:instanceId(ev,start);if(ev.masterId&&scope==='series')return ev.masterId;return ev.gid;}
async function deleteEvent(scope){const o=evOcc;if(!o)return;
 if(!(o.ev.rrule||o.ev.masterId)&&!confirm('¿Eliminar «'+o.ev.title+'» de Google Calendar?'))return;
 try{await gWrite('delete',o.c.gid,targetId(o,scope));evDlg.close();toast(scope==='series'?'Serie eliminada de Google Calendar':'Evento eliminado de Google Calendar');}catch(e){toast(e.message);}}
evDlg.addEventListener('click',e=>{if(e.target===evDlg){evDlg.close();return;}const b=e.target.closest('[data-ev]');if(!b)return;const a=b.dataset.ev;
 if(a==='close')evDlg.close();
 else if(a==='edit'){const o=evOcc;evDlg.close();openEventEdit(o);}
 else if(a==='mk-task'){const o=evOcc;evDlg.close();if(o&&window.__app)window.__app.taskFromEvent(o);}
 else if(a==='del-ask'){byId('evDelAsk').style.display='flex';}
 else if(a==='del-cancel'){byId('evDelAsk').style.display='none';}
 else if(a==='del-one')deleteEvent('one');
 else if(a==='del-series')deleteEvent('series');});

/* ---------- Crear / editar evento de Google ---------- */
const evEdit=byId('evEditDlg');let evCtx=null;
const scopeOf=()=>(document.querySelector('input[name=evScope]:checked')||{}).value||'one';
function toggleTimeFields(){const ad=byId('evAllDay').checked;document.querySelectorAll('#evForm .evTime').forEach(x=>x.hidden=ad);}
function setTimesFields(allDay,start,end){byId('evAllDay').checked=allDay;byId('evSD').value=dkey(start);
 if(allDay){const last=addDays(end,-1);byId('evED').value=dkey(last<start?start:last);byId('evST').value='09:00';byId('evET').value='10:00';}
 else{byId('evED').value=dkey(end);byId('evST').value=fmtTime(start);byId('evET').value=fmtTime(end);}toggleTimeFields();}
function setRep(v,label){const keep=byId('evRep').querySelector('option[value=KEEP]');keep.hidden=v!=='KEEP';keep.textContent='Como ahora: '+(label||'');byId('evRep').value=v;}
function setEvColor(id,cal){byId('evColors').innerHTML=`<label title="Color del calendario"><input type="radio" name="evcol" value="" aria-label="Color del calendario"><span style="background:${hex6(cal&&cal.color)}"></span></label>`+Object.entries(GCOL).map(([k,v])=>`<label title="${v.name}"><input type="radio" name="evcol" value="${k}" aria-label="${v.name}"><span style="background:${v.hex}"></span></label>`).join('');
 const r=document.querySelector(`input[name=evcol][value="${GCOL[id]?id:''}"]`);if(r)r.checked=true;}
function formValues(){return {title:byId('evTitle').value,loc:byId('evLoc').value,desc:byId('evDesc').value,color:(document.querySelector('input[name=evcol]:checked')||{}).value||'',allDay:byId('evAllDay').checked,sd:byId('evSD').value,st:byId('evST').value,ed:byId('evED').value,et:byId('evET').value,rep:byId('evRep').value};}
function applyScope(){const o=evCtx&&evCtx.o;if(!o)return;const {ev}=o;const m=evCtx.master;
 if(scopeOf()==='series'&&m){const ms=m.allDay?parseDkey(m.start):new Date(m.start),me=m.allDay?parseDkey(m.end):new Date(m.end);setTimesFields(m.allDay,ms,me);byId('evRepWrap').hidden=false;setRep('KEEP',describeRule(m.rrule));byId('evAllDay').disabled=true;}
 else{setTimesFields(ev.allDay,o.start,o.end);const rec=!!(ev.rrule||ev.masterId);byId('evRepWrap').hidden=rec;if(!rec)setRep('');byId('evAllDay').disabled=false;}
 if(evCtx.initial){const v=formValues();['allDay','sd','st','ed','et','rep'].forEach(k=>evCtx.initial[k]=v[k]);}}
function openEventEdit(o){const ws=state.calendars.filter(c=>canEditCal(c));if(!ws.length){toast('No hay calendarios de Google en los que puedas escribir');return;}
 const sel=byId('evCal');sel.innerHTML=ws.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');evCtx={o,master:null,initial:null};
 if(!o){byId('evFormTitle').textContent='Nuevo evento';sel.disabled=false;const def=ws.find(c=>c.primary)||ws[0];sel.value=def.id;byId('evScopeWrap').hidden=true;
  const fw=window.__app&&window.__app.state.focus;const base=fw&&weekKey(new Date())!==fw?weekStart(fw):new Date();const h=Math.min(new Date().getHours()+1,22);
  const st=new Date(base.getFullYear(),base.getMonth(),base.getDate(),h,0);setTimesFields(false,st,new Date(st.getTime()+36e5));
  ['evTitle','evLoc','evDesc'].forEach(id=>byId(id).value='');setRep('');setEvColor('',def);byId('evRepWrap').hidden=false;byId('evAllDay').disabled=false;byId('evSave').textContent='Crear evento';}
 else{const {ev,c}=o;byId('evFormTitle').textContent='Editar evento';sel.value=c.id;sel.disabled=true;const rec=!!(ev.rrule||ev.masterId);evCtx.master=masterOf(o);
  byId('evScopeWrap').hidden=!rec||!evCtx.master;document.querySelector('input[name=evScope][value=one]').checked=true;
  byId('evTitle').value=ev.title==='(Sin título)'?'':ev.title;byId('evLoc').value=ev.location||'';byId('evDesc').value=descText(ev.description||'');setEvColor(ev.colorId||'',c);applyScope();byId('evSave').textContent='Guardar cambios';}
 evCtx.initial=formValues();byId('evErr').hidden=true;evEdit.showModal();byId('evTitle').focus();}
function evErr(msg){const el=byId('evErr');el.textContent=msg;el.hidden=false;}
byId('evAllDay').addEventListener('change',toggleTimeFields);
byId('evCancel').onclick=()=>evEdit.close();
document.querySelectorAll('input[name=evScope]').forEach(r=>r.addEventListener('change',applyScope));
byId('evCal').addEventListener('change',()=>{const c=state.calendars.find(x=>x.id===byId('evCal').value);const cur=(document.querySelector('input[name=evcol]:checked')||{}).value||'';setEvColor(cur,c);});
byId('evSD').addEventListener('change',()=>{if(byId('evED').value<byId('evSD').value)byId('evED').value=byId('evSD').value;});
byId('evST').addEventListener('change',()=>{const v=formValues();if(v.sd===v.ed&&v.et<=v.st&&v.st){const [h,m]=v.st.split(':').map(Number);const d=new Date(2000,0,1,h+1,m);if(h<23)byId('evET').value=fmtTime(d);}});
byId('evForm').addEventListener('submit',async e=>{e.preventDefault();if(!evCtx)return;const v=formValues(),i0=evCtx.initial||{},isNew=!evCtx.o;
 if(!v.title.trim()){evErr('Ponle un título al evento.');return;}
 if(!v.sd||!v.ed){evErr('Indica el día de inicio y de fin.');return;}
 let start,end;
 if(v.allDay){if(v.ed<v.sd){evErr('El final no puede ser antes del inicio.');return;}start={date:v.sd};end={date:dkey(addDays(parseDkey(v.ed),1))};if(!isNew&&v.allDay!==i0.allDay){start.dateTime=null;start.timeZone=null;end.dateTime=null;end.timeZone=null;}}
 else{if(!v.st||!v.et){evErr('Indica la hora de inicio y de fin.');return;}if(v.ed+'T'+v.et<v.sd+'T'+v.st){evErr('El final no puede ser antes del inicio.');return;}
  start={dateTime:`${v.sd}T${v.st}:00`,timeZone:TZ};end={dateTime:`${v.ed}T${v.et}:00`,timeZone:TZ};if(!isNew&&v.allDay!==i0.allDay){start.date=null;end.date=null;}}
 const body={};
 if(isNew||v.title!==i0.title)body.summary=v.title.trim();
 if(isNew?v.loc:v.loc!==i0.loc)body.location=v.loc;
 if(isNew?v.desc:v.desc!==i0.desc)body.description=v.desc;
 if(isNew?v.color:v.color!==i0.color)body.colorId=v.color||null;
 if(isNew||['allDay','sd','st','ed','et'].some(k=>v[k]!==i0[k])){body.start=start;body.end=end;}
 if(v.rep!=='KEEP'&&(isNew?v.rep:v.rep!==i0.rep))body.recurrence=v.rep?['RRULE:FREQ='+v.rep]:[];
 if(!isNew&&!Object.keys(body).length){evEdit.close();return;}
 const btn=byId('evSave');btn.disabled=true;byId('evErr').hidden=true;
 try{if(isNew){const c=state.calendars.find(x=>x.id===byId('evCal').value);await gWrite('create',c.gid,null,body);toast('Evento creado en Google Calendar');}
  else{await gWrite('update',evCtx.o.c.gid,targetId(evCtx.o,scopeOf()),body);toast('Cambios guardados en Google Calendar');}
  evEdit.close();}
 catch(ex){evErr(ex.message);}finally{btn.disabled=false;}});

/* ---------- Enlaces con la interfaz ---------- */
function render(){if(window.__app)window.__app.refresh();}
function route(){return {v:'calendarios'};}
function toast(m){if(window.__app)window.__app.toast(m);}
function resetOcc(){OCC=[];}
document.getElementById('fileIcs').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const evs=parseICS(await f.text());state.calendars.push({id:uid(),name:f.name.replace(/\.ics$/i,''),url:'',color:'#6FA8C9',visible:true,events:evs,lastSync:Date.now(),lastError:''});save();render();toast('Calendario importado · '+evs.length+' eventos');}catch(err){toast(err.message);}});
document.getElementById('fileBackup').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const s=JSON.parse(await f.text());if(!s||!Array.isArray(s.tasks))throw 0;if(!confirm('Esto sustituye tus tareas actuales por las de la copia. ¿Continuar?'))return;const keepG=state.calendars.filter(c=>c.google);state=Object.assign(blank(),s);state.calendars=keepG.concat((s.calendars||[]).filter(c=>!c.google));if(window.__app)window.__app.migrate();save();render();toast('Copia importada');}catch(_){toast('Ese archivo no es una copia válida de App Semanal');}});
