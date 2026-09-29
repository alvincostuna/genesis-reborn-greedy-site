const KEY="genesis_admin_reader_font_px_v1";
const query=new URLSearchParams(location.search);
const partId=query.get("part");
const requested=query.get("stage")||"best";
const body=document.querySelector("#reader-body");
const title=document.querySelector("#part-title");
const key=document.querySelector("#part-key");
const controls=document.querySelector("#reader-controls");
const fontLabel=document.querySelector("#font-label");
const prevButton=document.querySelector("#reader-prev");
const nextButton=document.querySelector("#reader-next");
const stageButton=document.querySelector("#stage-button");
let items=[];
let currentIndex=-1;
let currentStage="best";

async function api(path){
  const r=await fetch(path,{
    credentials:"same-origin",
    cache:"no-store",
    headers:{Accept:"application/json","Cache-Control":"no-cache","Pragma":"no-cache"}
  });
  const p=await r.json().catch(()=>null);
  if(!r.ok||!p?.ok)throw new Error(p?.error?.message||("Request failed ("+r.status+")"));
  return p.data;
}
function clamp(n){return Math.max(10,Math.min(24,n))}
function setFont(n){
  n=clamp(Number(n)||18);
  body.style.fontSize=n+"px";
  fontLabel.textContent=n+"px";
  try{localStorage.setItem(KEY,String(n))}catch{}
}
function closeReader(){
  if(history.length>1)history.back();
  else location.href="/admin/?view=manuscripts";
}
async function loadStage(stage){
  const data=await api("/admin/api/manuscripts/"+encodeURIComponent(partId)+"/versions/"+stage);
  if(data?.status&&data.status!=="OK")throw new Error("Version not available");
  body.textContent=data?.body_text||"";
  currentStage=stage;
  stageButton.textContent=stage==="final"?"Final Canon":stage==="stage2"?"Stage 2":"Stage 1";
  document.title=(key.textContent?key.textContent+" — ":"")+"GENESIS Admin Reader";
}
function updateNav(){
  prevButton.disabled=currentIndex<=0;
  nextButton.disabled=currentIndex<0||currentIndex>=items.length-1;
}
function goRelative(delta){
  const target=items[currentIndex+delta];
  if(!target)return;
  const stage=currentStage==="best"?"best":currentStage;
  location.href="/admin/read/?part="+encodeURIComponent(target.production_part_id)+"&stage="+encodeURIComponent(stage);
}
async function init(){
  if(!partId){body.textContent="Missing manuscript Part.";return;}
  try{
    const list=await api("/admin/api/manuscripts?limit=200&_ts="+Date.now());
    items=(list?.items||[]).slice().sort((a,b)=>
      String(a.part_key||"").localeCompare(String(b.part_key||""),undefined,{numeric:true,sensitivity:"base"})
    );
    currentIndex=items.findIndex(x=>x.production_part_id===partId);
    const item=currentIndex>=0?items[currentIndex]:null;
    if(item){
      key.textContent=item.part_key||"GENESIS ADMIN";
      title.textContent=item.title||"Manuscript";
    }
    updateNav();
  }catch{}

  const stages=requested==="best"?["final","stage2","stage1"]:[requested];
  let loaded=false,lastError=null;
  for(const stage of stages){
    try{await loadStage(stage);loaded=true;break}catch(error){lastError=error}
  }
  if(!loaded)body.textContent=lastError?.message||"Manuscript unavailable.";
}
document.querySelector("#reader-close").addEventListener("click",closeReader);
prevButton.addEventListener("click",()=>goRelative(-1));
nextButton.addEventListener("click",()=>goRelative(1));
document.querySelector("#reader-font").addEventListener("click",()=>{
  const open=controls.hasAttribute("hidden");
  if(open){controls.removeAttribute("hidden");document.body.classList.add("controls-open")}
  else{controls.setAttribute("hidden","");document.body.classList.remove("controls-open")}
});
document.querySelector("#font-down").addEventListener("click",()=>setFont(parseInt(fontLabel.textContent,10)-2));
document.querySelector("#font-up").addEventListener("click",()=>setFont(parseInt(fontLabel.textContent,10)+2));
stageButton.addEventListener("click",async()=>{
  const order=["stage1","stage2","final"];
  const start=Math.max(0,order.indexOf(currentStage));
  for(let i=1;i<=order.length;i++){
    const next=order[(start+i)%order.length];
    try{await loadStage(next);break}catch{}
  }
});
try{setFont(Number(localStorage.getItem(KEY)||18))}catch{setFont(18)}
init();
