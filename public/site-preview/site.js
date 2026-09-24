const SUPABASE_URL="https://lyhrwymhzhhxszquxnke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rCJL18_zLNtWH-ON1DTnDA_3quoGH3Q";

const SESSION_KEY="genesis_reader_session_v1";

function accountPath(){
  return location.pathname.startsWith("/site-preview/")?"/site-preview/account/":"/account/";
}
function accountUrl(){return location.origin+accountPath()}
function readStoredSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}
}
function saveSession(s){
  if(!s){localStorage.removeItem(SESSION_KEY);return null}
  const expiresAt=s.expires_at||Math.floor(Date.now()/1000)+(Number(s.expires_in)||3600);
  const value={...s,expires_at:expiresAt};
  localStorage.setItem(SESSION_KEY,JSON.stringify(value));
  return value;
}
function captureAuthHash(){
  const raw=location.hash.startsWith("#")?location.hash.slice(1):"";
  if(!raw)return null;
  const p=new URLSearchParams(raw);
  const access_token=p.get("access_token");
  const refresh_token=p.get("refresh_token");
  if(!access_token||!refresh_token)return null;
  const session=saveSession({
    access_token,refresh_token,
    expires_in:Number(p.get("expires_in")||3600),
    token_type:p.get("token_type")||"bearer",
    type:p.get("type")||null
  });
  history.replaceState({},document.title,location.pathname+location.search);
  return session;
}
async function authRequest(path,{method="POST",body=null,token=null}={}){
  const headers={"apikey":SUPABASE_PUBLISHABLE_KEY,"Content-Type":"application/json","Accept":"application/json"};
  if(token)headers.Authorization="Bearer "+token;
  const r=await fetch(SUPABASE_URL+"/auth/v1/"+path,{method,headers,body:body===null?null:JSON.stringify(body)});
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok)throw new Error(data.msg||data.message||data.error_description||data.error||"Authentication request failed");
  return data;
}
async function refreshSession(session){
  if(!session?.refresh_token)return null;
  try{
    const next=await authRequest("token?grant_type=refresh_token",{body:{refresh_token:session.refresh_token}});
    return saveSession(next);
  }catch{
    saveSession(null);
    return null;
  }
}
async function getSession(){
  const fromHash=captureAuthHash();
  let s=fromHash||readStoredSession();
  if(!s)return null;
  if((Number(s.expires_at)||0)-60<=Math.floor(Date.now()/1000))s=await refreshSession(s);
  return s;
}
async function getAuthUser(session){
  if(!session?.access_token)return null;
  try{return await authRequest("user",{method:"GET",token:session.access_token})}catch{return null}
}
async function rpc(name,params={},accessToken=null){
  const bearer=accessToken||SUPABASE_PUBLISHABLE_KEY;
  const r=await fetch(SUPABASE_URL+"/rest/v1/rpc/"+name,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+bearer,
      "Content-Type":"application/json",
      "Accept":"application/json"
    },
    body:JSON.stringify(params)
  });
  if(!r.ok)throw new Error(await r.text());
  return r.json();
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function firstRow(v){return Array.isArray(v)?v[0]:v}
function textParagraphs(v){
  const parts=String(v||"").trim().split(/\n\s*\n/).filter(Boolean);
  return parts.map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("");
}
function entityCard(x,kind="codex"){
  const fields=x?.revealed_fields&&typeof x.revealed_fields==="object"?Object.keys(x.revealed_fields):[];
  return '<article class="'+kind+'-card"><small>'+esc(x.entity_type||"CODEX")+'</small><h2>'+esc(x.public_name||x.entity_code||"Revealed entry")+'</h2><p>'+esc(x.short_description||"Revealed GENESIS knowledge.")+'</p>'+(fields.length?'<div class="reveal-fields">Revealed fields: '+esc(fields.slice(0,6).join(", "))+'</div>':"")+'</article>';
}


async function initAuthChrome(){
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  document.querySelectorAll("[data-auth-link]").forEach(link=>{
    link.href=accountPath();
    link.textContent=user?"Account":"Sign in";
    link.classList.toggle("signed-in",!!user);
  });
  return {session,user};
}

function showAuthMessage(message,kind="info"){
  const box=document.querySelector("#auth-message");
  if(!box)return;
  box.textContent=message;
  box.className="account-message "+kind;
}

async function initAccount(){
  const guest=document.querySelector("#auth-guest");
  const reader=document.querySelector("#auth-reader");
  const recovery=document.querySelector("#recovery-panel");
  let session=await getSession();
  let user=session?await getAuthUser(session):null;

  const hashType=new URLSearchParams((location.hash||"").replace(/^#/,"")).get("type");
  if(hashType==="recovery"&&session){
    guest?.classList.add("hidden");
    reader?.classList.add("hidden");
    recovery?.classList.remove("hidden");
  }

  const render=async()=>{
    session=await getSession();
    user=session?await getAuthUser(session):null;
    if(!user){
      guest?.classList.remove("hidden");
      reader?.classList.add("hidden");
      recovery?.classList.add("hidden");
      return;
    }
    guest?.classList.add("hidden");
    reader?.classList.remove("hidden");
    document.querySelector("#account-email").textContent=user.email||"";
    try{
      const data=await rpc("api_reader_account",{},session.access_token);
      document.querySelector("#account-display-name").textContent=data?.display_name||"Reader";
      document.querySelector("#profile-display-name").value=data?.display_name||"Reader";
      document.querySelector("#account-credits").textContent=String(data?.support?.credit_balance??0);
      document.querySelector("#account-vip").textContent=data?.support?.vip_active?"Active":"Inactive";
      document.querySelector("#account-badge").textContent=data?.support?.public_badge||"None";
      document.querySelector("#badge-supporter").checked=!!data?.show_supporter_badge;
      document.querySelector("#badge-vip").checked=!!data?.show_vip_badge;
    }catch(e){
      showAuthMessage("Signed in, but account status could not be loaded yet.","error");
    }
  };

  document.querySelector("#signin-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const email=document.querySelector("#signin-email").value.trim();
      const password=document.querySelector("#signin-password").value;
      const data=await authRequest("token?grant_type=password",{body:{email,password}});
      saveSession(data);
      showAuthMessage("Signed in successfully.","success");
      await render();
      await initAuthChrome();
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#signup-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const display_name=document.querySelector("#signup-name").value.trim();
      const email=document.querySelector("#signup-email").value.trim();
      const password=document.querySelector("#signup-password").value;
      const data=await authRequest("signup?redirect_to="+encodeURIComponent(accountUrl()),{
        body:{email,password,data:{display_name}}
      });
      if(data.access_token){
        saveSession(data);
        showAuthMessage("Account created and signed in.","success");
        await render();
        await initAuthChrome();
      }else{
        showAuthMessage("Account created. Check your email to confirm your address, then return here to sign in.","success");
      }
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#forgot-password")?.addEventListener("click",async()=>{
    const email=(document.querySelector("#signin-email")?.value||"").trim();
    if(!email){showAuthMessage("Enter your email in the Sign in box first.","error");return}
    try{
      await authRequest("recover?redirect_to="+encodeURIComponent(accountUrl()),{body:{email}});
      showAuthMessage("If that email is registered, a password-recovery message has been sent.","success");
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#recovery-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session){showAuthMessage("Recovery session expired. Request a new password-recovery email.","error");return}
    try{
      const password=document.querySelector("#recovery-password").value;
      await authRequest("user",{method:"PUT",token:session.access_token,body:{password}});
      showAuthMessage("Password updated. Your reader account is ready.","success");
      recovery?.classList.add("hidden");
      await render();
    }catch(err){showAuthMessage(err.message,"error")}
  });

  document.querySelector("#profile-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session)return;
    try{
      const p_display_name=document.querySelector("#profile-display-name").value.trim();
      await rpc("reader_update_display_name",{p_display_name},session.access_token);
      showAuthMessage("Display name saved.","success");
      await render();
    }catch(err){showAuthMessage("Could not save display name.","error")}
  });

  document.querySelector("#save-badges")?.addEventListener("click",async()=>{
    session=await getSession();
    if(!session)return;
    try{
      await rpc("reader_set_badge_preferences",{
        p_show_supporter:document.querySelector("#badge-supporter").checked,
        p_show_vip:document.querySelector("#badge-vip").checked
      },session.access_token);
      showAuthMessage("Badge preferences saved.","success");
      await render();
    }catch{showAuthMessage("Could not save badge preferences.","error")}
  });

  document.querySelector("#signout-button")?.addEventListener("click",async()=>{
    session=await getSession();
    try{if(session?.access_token)await authRequest("logout",{token:session.access_token})}catch{}
    saveSession(null);
    showAuthMessage("Signed out.","success");
    await render();
    await initAuthChrome();
  });

  await render();
}

async function renderPartCommentComposer(partId,reload){
  const box=document.querySelector("#comment-composer");
  if(!box)return;
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  if(!user){
    box.className="comment-composer disabled-box";
    box.innerHTML='<strong>Reader account required to comment</strong><span><a class="inline-link" href="'+accountPath()+'">Sign in or create an account</a> to post reactions, theories, predictions, praise, or criticism.</span>';
    return;
  }
  box.className="comment-composer active-composer";
  box.innerHTML='<textarea id="comment-body" rows="4" maxlength="3000" placeholder="Share a reaction, theory, or prediction…"></textarea><button id="comment-submit" type="button">Post comment</button><small id="comment-status"></small>';
  document.querySelector("#comment-submit").addEventListener("click",async()=>{
    const body=document.querySelector("#comment-body").value.trim();
    const status=document.querySelector("#comment-status");
    if(!body){status.textContent="Write a comment first.";return}
    try{
      document.querySelector("#comment-submit").disabled=true;
      await rpc("reader_post_part_comment",{p_part_id:partId,p_body:body},session.access_token);
      status.textContent="Posted.";
      await reload();
    }catch{status.textContent="Could not post comment."}
    finally{document.querySelector("#comment-submit").disabled=false}
  });
}

async function activateSupportContact(){
  const form=document.querySelector("#contact-form");
  if(!form)return;
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  const subject=document.querySelector("#contact-subject");
  const body=document.querySelector("#contact-body");
  const button=document.querySelector("#contact-submit");
  if(!user){
    subject.disabled=true;body.disabled=true;button.disabled=true;
    button.textContent="Reader sign-in required";
    return;
  }
  subject.disabled=false;body.disabled=false;button.disabled=false;
  button.textContent="Send message to Admin";
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const s=subject.value.trim(),b=body.value.trim();
    if(!s||!b)return;
    button.disabled=true;button.textContent="Sending…";
    try{
      await rpc("reader_contact_admin",{p_subject:s,p_body:b},session.access_token);
      subject.value="";body.value="";button.textContent="Message sent";
    }catch{button.textContent="Could not send — try again"}
    finally{setTimeout(()=>{button.disabled=false;button.textContent="Send message to Admin"},1500)}
  },{once:true});
}

async function initRead(){
  const releaseMini=document.querySelector("#release-mini");
  try{
    const p=firstRow(await rpc("api_release_policy"));
    releaseMini.textContent=(p?.releases_paused?"PAUSED · ":"")+"Episodes 1–"+(p?.launch_episode_count??10)+" · then 1 "+(p?.ongoing_release_unit??"Part")+" every "+(p?.cycle_hours??8)+" hours";
  }catch{}
  let episodes=[];
  try{episodes=await rpc("api_episode_library")}catch{}
  if(!Array.isArray(episodes)||!episodes.length)return;
  const list=document.querySelector("#episode-list");
  document.querySelector("#episode-count").textContent=episodes.length+" released";
  list.innerHTML=episodes.map((e,i)=>
    '<button class="episode-button" data-episode="'+esc(e.episode_number)+'"><small>EPISODE '+esc(e.episode_number)+'</small><strong>'+esc(e.title)+'</strong></button>'
  ).join("");
  async function openEpisode(number){
    document.querySelectorAll(".episode-button").forEach(b=>b.classList.toggle("active",b.dataset.episode===String(number)));
    const episode=episodes.find(e=>String(e.episode_number)===String(number));
    const head=document.querySelector("#novel-head");
    head.innerHTML='<p class="eyebrow">EPISODE '+esc(number)+'</p><h2>'+esc(episode?.title||"GENESIS")+'</h2><p>'+esc(episode?.summary_public||"Released Final Canon.")+'</p>';
    let parts=[];
    try{parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(number)})}catch{}
    const tabs=document.querySelector("#part-tabs");
    const body=document.querySelector("#novel-body");
    if(!Array.isArray(parts)||!parts.length){
      tabs.innerHTML="";
      body.innerHTML='<div class="empty-state large">No released Parts are available for this Episode yet.</div>';
      return;
    }
    tabs.innerHTML=parts.map((p,i)=>'<button data-part="'+i+'" class="'+(i===0?"active":"")+'">Part '+esc(p.part_number)+'</button>').join("");
    const openPart=async(idx)=>{
      const part=parts[idx];
      tabs.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===idx));
      const access=part.access_mode&&part.access_mode!=="PUBLIC"?' · '+part.access_mode+' EARLY ACCESS':'';
      body.innerHTML='<div class="status-chip">Part '+esc(part.part_number)+' · '+esc(part.title||"")+esc(access)+'</div>'+textParagraphs(part.body_text||"");
      const panel=document.querySelector("#comments-panel");
      const list=document.querySelector("#part-comments");
      panel?.classList.remove("hidden");
      if(list&&part.part_id){
        list.innerHTML='<div class="empty-state">Loading comments…</div>';
        try{
          const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
          if(!Array.isArray(comments)||!comments.length){
            list.innerHTML='<div class="empty-state">No comments yet. Be the first to share a reaction or prediction when reader accounts open.</div>';
          }else{
            list.innerHTML=comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }
        }catch{
          list.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>';
        }
        const reloadComments=async()=>{
          try{
            const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
            list.innerHTML=!Array.isArray(comments)||!comments.length
              ?'<div class="empty-state">No comments yet. Be the first to share a reaction or prediction.</div>'
              :comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }catch{list.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>'}
        };
        await renderPartCommentComposer(part.part_id,reloadComments);
      }
      window.scrollTo({top:0,behavior:"smooth"});
    };
    tabs.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>openPart(i)));
    openPart(0);
  }
  list.querySelectorAll(".episode-button").forEach(b=>b.addEventListener("click",()=>openEpisode(b.dataset.episode)));
  openEpisode(episodes[0].episode_number);
}

async function loadWorld(type){
  const grid=document.querySelector("#world-grid");
  grid.innerHTML='<div class="empty-state large">Loading revealed '+esc(type)+' records…</div>';
  try{
    let rows=[];
    if(type==="equipment"){
      const [w,a]=await Promise.all([
        rpc("api_entity_search",{p_type:"weapon",p_query:null,p_limit:12}),
        rpc("api_entity_search",{p_type:"armor",p_query:null,p_limit:12})
      ]);
      rows=[...(Array.isArray(w)?w:[]),...(Array.isArray(a)?a:[])].slice(0,18);
    }else{
      rows=await rpc("api_entity_search",{p_type:type,p_query:null,p_limit:18});
    }
    if(!Array.isArray(rows)||!rows.length){
      grid.innerHTML='<div class="empty-state large">No '+esc(type)+' records have been revealed by released Parts yet.</div>';
      return;
    }
    grid.innerHTML=rows.map(x=>entityCard(x,"world")).join("");
  }catch(e){
    grid.innerHTML='<div class="empty-state large">World preview is temporarily unavailable.</div>';
  }
}
function initWorld(){
  const buttons=[...document.querySelectorAll("[data-world-type]")];
  buttons.forEach(b=>b.addEventListener("click",()=>{
    buttons.forEach(x=>x.classList.toggle("active",x===b));
    loadWorld(b.dataset.worldType);
  }));
  loadWorld("map");
}

async function loadCodex(){
  const results=document.querySelector("#codex-results");
  const type=document.querySelector("#codex-type").value||null;
  const query=document.querySelector("#codex-search").value.trim()||null;
  results.innerHTML='<div class="empty-state large">Searching revealed database…</div>';
  try{
    const rows=await rpc("api_entity_search",{p_type:type,p_query:query,p_limit:60});
    if(!Array.isArray(rows)||!rows.length){
      results.innerHTML='<div class="empty-state large">No revealed Codex records match this search.</div>';
      return;
    }
    results.innerHTML=rows.map(x=>entityCard(x,"codex")).join("");
  }catch{
    results.innerHTML='<div class="empty-state large">Codex is temporarily unavailable.</div>';
  }
}
function initCodex(){
  document.querySelector("#codex-search-button").addEventListener("click",loadCodex);
  document.querySelector("#codex-type").addEventListener("change",loadCodex);
  document.querySelector("#codex-search").addEventListener("keydown",e=>{if(e.key==="Enter")loadCodex()});
  loadCodex();
}


async function initHome(){
  const countdown=document.querySelector("#cycle-countdown");
  const label=document.querySelector("#cycle-next-time");
  if(!countdown||!label)return;

  let nextAt=null;
  let timer=null;

  const formatNext=(date)=>new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit",hour12:true,
    month:"short",day:"numeric"
  }).format(date)+" PHT";

  const tick=()=>{
    if(!nextAt)return;
    const ms=nextAt.getTime()-Date.now();
    if(ms<=0){
      clearInterval(timer);
      loadCycle();
      return;
    }
    const total=Math.floor(ms/1000);
    const h=String(Math.floor(total/3600)).padStart(2,"0");
    const m=String(Math.floor((total%3600)/60)).padStart(2,"0");
    const s=String(total%60).padStart(2,"0");
    countdown.textContent=h+":"+m+":"+s;
  };

  const loadCycle=async()=>{
    try{
      const clock=firstRow(await rpc("api_release_clock"));
      const raw=clock?.next_cycle_at;
      if(!raw)throw new Error("No cycle");
      nextAt=new Date(raw);
      label.textContent="Next · "+formatNext(nextAt)+" · 8-hour cycle";
      tick();
      timer=setInterval(tick,1000);
    }catch{
      countdown.textContent="8 HOURS";
      label.textContent="Genesis cycle · Asia/Manila";
    }
  };

  await loadCycle();
}

const page=document.body.dataset.page;
await initAuthChrome();
if(page==="home")await initHome();
if(page==="read")await initRead();
if(page==="world")initWorld();
if(page==="codex")initCodex();
if(page==="fan")await initFan();
if(page==="support")await initSupport();
if(page==="account")await initAccount();

async function initFan(){
  const feed=document.querySelector("#fan-feed");
  try{
    const rows=await rpc("api_fan_feed",{p_limit:30,p_offset:0});
    if(!Array.isArray(rows)||!rows.length){
      feed.innerHTML='<div class="empty-state large">No Fan Page posts yet. Reader uploads are prepared but remain disabled during preview.</div>';
      return;
    }
    feed.innerHTML=rows.map(p=>'<article class="fan-post"><div class="fan-media">Image stored privately</div><div class="fan-copy"><div class="fan-author"><strong>'+esc(p.display_name||"Reader")+'</strong>'+(p.badge?'<span class="reader-badge '+(p.badge==="VIP"?"vip":"")+'">'+esc(p.badge)+'</span>':'')+'</div><p>'+esc(p.caption||"")+'</p></div></article>').join("");
  }catch{
    feed.innerHTML='<div class="empty-state large">Fan Page is temporarily unavailable.</div>';
  }
}

async function initSupport(){
  const notice=document.querySelector("#support-status");
  await activateSupportContact();
  try{
    const data=await rpc("api_support_catalog");
    const s=data?.settings||{};
    if(notice){
      const enabled=!!s.payments_enabled||!!s.pure_support_enabled||!!s.share_rewards_enabled;
      notice.innerHTML='<strong>'+(enabled?'Support services active':'Preview mode')+'</strong><span>'+
        (enabled?'Available support features follow the limits shown below.':'Payments, pure support, and share rewards are intentionally disabled until final testing and provider setup.')+
        '</span>';
    }
  }catch{}
}
