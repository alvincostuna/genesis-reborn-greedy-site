const KEY="genesis_admin_mobile_font_px_v3";
const q=new URLSearchParams(location.search);
const partId=q.get("part");
const requested=q.get("stage")||"best";
const body=document.querySelector("#reader-body");
const title=document.querySelector("#part-title");
const key=document.querySelector("#part-key");
const controls=document.querySelector("#reader-controls");
const fontLabel=document.querySelector("#font-label");

async function api(path){
  const r=await fetch(path,{credentials:"same-origin",headers:{Accept:"application/json"}});
  const p=await r.json().catch(()=>null);
  if(!r.ok||!p?.ok)throw new Error(p?.error?.message||("Request failed ("+r.status+")"));
  return p.data;
}
function clamp(n){return Math.max(26,Math.min(48,n))}
function setFont(n){
  n=clamp(Number(n)||36);
  body.style.fontSize=n+"px";
  fontLabel.textContent=n+"px";
  try{localStorage.setItem(KEY,String(n))}catch{}
}
function closeReader(){
  if(history.length>1) history.back();
  else location.href="/admin/?view=manuscripts";
}
async function loadStage(stage){
  const data=await api("/admin/api/manuscripts/"+encodeURIComponent(partId)+"/versions/"+stage);
  if(data?.status&&data.status!=="OK")throw new Error("Version not available");
  body.textContent=data?.body_text||"";
  document.querySelector("#stage-button").textContent=stage==="final"?"Final":stage==="stage2"?"Stage 2":"Stage 1";
  document.title=(key.textContent?key.textContent+" — ":"")+"GENESIS Admin Reader";
  return true;
}
async function init(){
  if(!partId){body.textContent="Missing manuscript Part.";return;}
  try{
    const list=await api("/admin/api/manuscripts?q="+encodeURIComponent(partId));
    const item=(list?.items||[]).find(x=>x.production_part_id===partId)||(list?.items||[])[0];
    if(item){
      key.textContent=item.part_key||"GENESIS ADMIN";
      title.textContent=item.title||"Manuscript";
    }
  }catch{}

  const stages=requested==="best"?["final","stage2","stage1"]:[requested];
  let loaded=false,lastErr=null;
  for(const s of stages){
    try{await loadStage(s);loaded=true;break}catch(e){lastErr=e}
  }
  if(!loaded)body.textContent=lastErr?.message||"Manuscript unavailable.";
}
document.querySelector("#reader-close").addEventListener("click",closeReader);
document.querySelector("#reader-font").addEventListener("click",()=>{
  const open=controls.hasAttribute("hidden");
  if(open){controls.removeAttribute("hidden");document.body.classList.add("controls-open")}
  else{controls.setAttribute("hidden","");document.body.classList.remove("controls-open")}
});
document.querySelector("#font-down").addEventListener("click",()=>setFont(parseInt(fontLabel.textContent,10)-2));
document.querySelector("#font-up").addEventListener("click",()=>setFont(parseInt(fontLabel.textContent,10)+2));
document.querySelector("#stage-button").addEventListener("click",async()=>{
  const order=["stage1","stage2","final"];
  const label=document.querySelector("#stage-button").textContent;
  const cur=label==="Stage 1"?"stage1":label==="Stage 2"?"stage2":"final";
  for(let i=1;i<=3;i++){
    const next=order[(order.indexOf(cur)+i)%3];
    try{await loadStage(next);break}catch{}
  }
});
try{setFont(Number(localStorage.getItem(KEY)||36))}catch{setFont(36)}
if("serviceWorker" in navigator){navigator.serviceWorker.register("/admin/sw.js",{scope:"/admin/"}).catch(()=>{})}
init();
