const SUPABASE_URL="https://lyhrwymhzhhxszquxnke.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_rCJL18_zLNtWH-ON1DTnDA_3quoGH3Q";

const SESSION_KEY="genesis_reader_session_v1";
const TIER_EXP_THRESHOLD=2000;
const READ_STATE_KEY="genesis_reader_exact_progress_v2";
const NOTIFICATION_READ_KEY="genesis_notification_read_v1";

function sitePath(path){
  const clean=String(path||"/").startsWith("/")?String(path||"/"):"/"+String(path||"");
  return location.pathname.startsWith("/site-preview/")?"/site-preview"+clean:clean;
}
function readerUrl(episode=null,part=null){
  const u=new URL(sitePath("/read/"),location.origin);
  if(episode!==null&&episode!==undefined&&episode!=="")u.searchParams.set("episode",String(episode));
  if(part!==null&&part!==undefined&&part!=="")u.searchParams.set("part",String(part));
  return u.pathname+u.search;
}
function mapDetailUrl(slug){
  const u=new URL(sitePath("/world/map/"),location.origin);
  if(slug)u.searchParams.set("slug",String(slug));
  return u.pathname+u.search;
}
function codexEntityUrl(type,name){
  const u=new URL(sitePath("/codex/"),location.origin);
  if(type)u.searchParams.set("type",String(type));
  if(name)u.searchParams.set("q",String(name));
  return u.pathname+u.search;
}
function readLocalProgress(){
  try{return JSON.parse(localStorage.getItem(READ_STATE_KEY)||"null")}catch{return null}
}
function saveLocalProgress(value){
  try{localStorage.setItem(READ_STATE_KEY,JSON.stringify({...value,last_seen_at:new Date().toISOString()}))}catch{}
}
function extractAccountProgress(data){
  const p=data?.reading_progress||data?.latest_read||{};
  const episode=Number(
    p.episode_number??p.latest_episode_number??data?.latest_episode_number??data?.highest_episode_read??0
  );
  const part=Number(
    p.part_number??p.latest_part_number??data?.latest_part_number??0
  );
  if(!episode||!part)return null;
  return {
    episode_number:episode,
    part_number:part,
    part_id:p.part_id??p.latest_part_id??data?.latest_part_id??null,
    progress_pct:Number(p.progress_pct??p.percent??data?.latest_read_progress??0)||0,
    episode_title:p.episode_title??null,
    title:p.part_title??p.title??null,
    source:"account"
  };
}
function formatPhtDate(value){
  if(!value)return "";
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "";
  return new Intl.DateTimeFormat("en-PH",{timeZone:"Asia/Manila",month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true}).format(d)+" PHT";
}

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
async function loadRewardManifest(){
  try{
    const r=await fetch("/assets/v27/rewards/reward-manifest.json",{cache:"no-store"});
    if(!r.ok)throw new Error("manifest unavailable");
    const data=await r.json();
    return Array.isArray(data?.first_upload_batch)?data.first_upload_batch:[];
  }catch{return []}
}
function rewardTypeLabel(v){return String(v||"PICTURE_CARD").replaceAll("_"," ")}
function rewardCardHtml(item,{owned=false,quantity=0,eligible=true,compact=false}={}){
  const file=item?.filename||(item?.image_url||item?.preview_url||"").split("/").pop();
  const src=item?.preview_url||item?.image_url||(file?"/assets/v27/rewards/"+file:"");
  const title=item?.title||"GENESIS Reward";
  const rarity=item?.rarity||"REWARD";
  const type=item?.type||item?.asset_type||"PICTURE_CARD";
  const state=owned?"earned":(eligible?"available":"locked");
  const portrait=/CHARACTER_PICTURE|MOBILE_WALLPAPER/.test(String(type||""));
  return '<article class="reward-state-card '+state+(portrait?" portrait":"")+(compact?" compact":"")+'">'+
    '<div class="reward-state-art">'+(src?'<img src="'+esc(src)+'" alt="'+esc(title)+'">':'')+
    (!owned?'<span class="reward-lock">'+(eligible?"◇":"🔒")+'</span>':'')+'</div>'+
    '<div class="reward-state-copy"><small>'+esc(rarity)+' · '+esc(rewardTypeLabel(type))+'</small>'+
    '<strong>'+esc(title)+'</strong>'+
    '<span>'+(owned?("Earned"+(quantity>1?" ×"+quantity:"")):(eligible?"Available in random draw":"Locked by story progress"))+'</span></div>'+
    '</article>';
}
async function edgeFunction(name,body,accessToken){
  const r=await fetch(SUPABASE_URL+"/functions/v1/"+name,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_PUBLISHABLE_KEY,
      "Authorization":"Bearer "+accessToken,
      "Content-Type":"application/json",
      "Accept":"application/json"
    },
    body:JSON.stringify(body||{})
  });
  const text=await r.text();
  let data={};
  try{data=text?JSON.parse(text):{}}catch{data={message:text}}
  if(!r.ok)throw new Error(data.detail||data.error||data.message||"Request failed");
  return data;
}

function stableIndex(seed,length){
  const s=String(seed||"");
  let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0)%Math.max(1,length);
}
function entityVisual(type,seed=""){
  const t=String(type||"").toLowerCase();
  const pick=(label,icon,arts)=>({label,icon,art:arts[stableIndex(seed||t,arts.length)]});
  if(t==="monster")return pick("BESTIARY","✦",[
    "/assets/v27/rewards/young-gnawer.webp",
    "/assets/v27/rewards/beginner-hunt.webp",
    "/assets/v27/rewards/flavio-nico-early-party.webp"
  ]);
  if(t==="map"||t==="region"||t==="location")return pick("ATLAS","◎",[
    "/assets/v27/rewards/early-genesis-world-panorama.webp",
    "/assets/v27/rewards/starter-town-safe-zone.webp",
    "/assets/v25/releases/release-city.png"
  ]);
  if(t==="weapon"||t==="armor"||t==="equipment"||t==="accessory")return pick("ARMORY","⚔",[
    "/assets/v25/releases/release-duel.png",
    "/assets/v27/rewards/genesis-awakening.webp",
    "/assets/v27/rewards/beginner-hunt.webp"
  ]);
  if(t==="material")return pick("MATERIALS","◆",[
    "/assets/v27/rewards/starter-town-safe-zone.webp",
    "/assets/v27/rewards/beginner-hunt.webp",
    "/assets/v25/destinations/destination-codex.png"
  ]);
  if(t==="class"||t==="profession"||t==="skill")return pick("PATH","✧",[
    "/assets/v25/destinations/destination-codex.png",
    "/assets/v27/rewards/flavio-reyes.webp",
    "/assets/v27/rewards/maya-villareal.webp",
    "/assets/v27/rewards/nico-salazar.webp"
  ]);
  if(t==="quest")return pick("QUEST","◇",[
    "/assets/v25/releases/release-city.png",
    "/assets/v27/rewards/flavio-nico-early-party.webp",
    "/assets/v27/rewards/starter-town-safe-zone.webp"
  ]);
  if(t==="npc")return pick("PEOPLE","♙",[
    "/assets/v27/rewards/flavio-reyes.webp",
    "/assets/v27/rewards/maya-villareal.webp",
    "/assets/v27/rewards/nico-salazar.webp",
    "/assets/v25/destinations/destination-fanpage.png"
  ]);
  if(t==="shop")return pick("TRADE","¤",[
    "/assets/v25/destinations/destination-support.png",
    "/assets/v27/rewards/starter-town-safe-zone.webp"
  ]);
  if(t==="faction")return pick("FACTIONS","♜",[
    "/assets/v25/destinations/destination-world.png",
    "/assets/v25/destinations/destination-codex.png",
    "/assets/v27/rewards/early-genesis-world-panorama.webp"
  ]);
  return pick("ARCHIVE","▣",[
    "/assets/v27/rewards/genesis-awakening.webp",
    "/assets/v27/rewards/flavio-early-cast-wallpaper.webp"
  ]);
}

function entityCard(x,kind="codex"){
  const fields=x?.revealed_fields&&typeof x.revealed_fields==="object"?Object.keys(x.revealed_fields):[];
  const type=String(x?.entity_type||"codex");
  const v=entityVisual(type,x?.entity_code||x?.public_name||type);
  const title=x?.public_name||x?.entity_code||"Revealed entry";
  const desc=x?.short_description||"Revealed GENESIS knowledge.";
  const fieldChips=fields.slice(0,4).map(f=>'<span>'+esc(f.replaceAll("_"," "))+'</span>').join("");
  return '<article class="'+kind+'-card v28-entity-card" data-entity-type="'+esc(type.toLowerCase())+'">'+
    '<div class="entity-art" style="background-image:linear-gradient(180deg,rgba(2,8,14,.04),rgba(2,8,14,.82)),url(\''+esc(v.art)+'\')">'+
      '<span class="entity-symbol">'+esc(v.icon)+'</span><span class="entity-category">'+esc(v.label)+'</span>'+
    '</div>'+
    '<div class="entity-copy"><small>'+esc(type.toUpperCase())+'</small><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p>'+
    (fieldChips?'<div class="reveal-fields">'+fieldChips+'</div>':'<div class="entity-safe-note">Spoiler-safe revealed record</div>')+
    '</div></article>';
}


async function initAuthChrome(){
  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  document.querySelectorAll("[data-auth-link]").forEach(link=>{
    link.href=accountPath();
    link.classList.toggle("signed-in",!!user);
    const label=user?"Reader account":"Sign in";
    link.setAttribute("aria-label",label);
    link.setAttribute("title",label);
    if(link.classList.contains("profile-orb")){
      let img=link.querySelector("img");
      if(!img){
        img=document.createElement("img");
        link.replaceChildren(img);
      }
      img.src=user?.user_metadata?.avatar_url||"/assets/genesis-official-logo-64.png";
      img.alt="";
      link.dataset.accountState=user?"signed-in":"signed-out";
    }else{
      link.textContent = user ? "Account" : "Sign in";
    }
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
    const verified=!!(user.email_confirmed_at||user.confirmed_at);
    const verifyBadge=document.querySelector("#email-verification-badge");
    const verifyCopy=document.querySelector("#email-verification-copy");
    const resendVerify=document.querySelector("#resend-verification");
    if(verifyBadge){
      verifyBadge.textContent=verified?"Verified":"Verification pending";
      verifyBadge.className="security-status "+(verified?"verified":"pending");
    }
    if(verifyCopy)verifyCopy.textContent=verified
      ?"Your email address is verified for this GENESIS account."
      :"Confirm your email address to fully secure your GENESIS account.";
    if(resendVerify)resendVerify.classList.toggle("hidden",verified);

    try{
      const data=await rpc("api_reader_account",{},session.access_token);
      document.querySelector("#account-display-name").textContent=data?.display_name||"Reader";
      document.querySelector("#profile-display-name").value=data?.display_name||"Reader";
      document.querySelector("#account-credits").textContent=String(data?.support?.credit_balance??0)+" Parts";
      document.querySelector("#account-vip").textContent=data?.support?.vip_active?"Active":"Inactive";
      document.querySelector("#account-badge").textContent=data?.support?.public_badge||"None";
      document.querySelector("#badge-supporter").checked=!!data?.show_supporter_badge;
      document.querySelector("#badge-vip").checked=!!data?.show_vip_badge;
      const totalExp=Number(data?.reader_exp??data?.total_exp??0),tier=Math.floor(totalExp/TIER_EXP_THRESHOLD)+1,within=totalExp%TIER_EXP_THRESHOLD;
      document.querySelector("#profile-tier-badge").textContent="Tier "+tier;
      document.querySelector("#profile-exp-total").textContent=totalExp.toLocaleString()+" EXP";
      document.querySelector("#profile-next-tier").textContent=(TIER_EXP_THRESHOLD-within).toLocaleString()+" to next Tier";
      document.querySelector("#profile-exp-bar").style.width=Math.min(100,within/TIER_EXP_THRESHOLD*100)+"%";
      document.querySelector("#profile-title-badge").textContent=data?.reader_title||data?.support?.public_badge||"GENESIS Adventurer";
      document.querySelector("#profile-latest-read").textContent=data?.latest_read_label||data?.reading_progress?.latest_label||"Not started";
      document.querySelector("#profile-parts-read").textContent=String(data?.parts_read??data?.reading_progress?.parts_read??0);
      document.querySelector("#profile-episodes-complete").textContent=String(data?.episodes_completed??data?.reading_progress?.episodes_completed??0);
      document.querySelector("#profile-joined").textContent=data?.created_at?new Date(data.created_at).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"}):"—";
      document.querySelector("#profile-collection-count").textContent=String(data?.collection_count??0)+" Unlocked";
      const collectionGrid=document.querySelector("#profile-collection-grid");
      if(collectionGrid){
        let rewards=[];
        try{
          const collection=await rpc("api_reader_collectibles_v1",{},session.access_token);
          rewards=Array.isArray(collection)?collection:(Array.isArray(collection?.items)?collection.items:[]);
        }catch{}
        if(!rewards.length){
          const manifest=await loadRewardManifest();
          rewards=manifest.map((x,i)=>({...x,owned:i<Math.min(Number(data?.collection_count??0),manifest.length),quantity:i<Number(data?.collection_count??0)?1:0,eligible:true}));
        }
        collectionGrid.innerHTML=rewards.slice(0,10).map(x=>rewardCardHtml(x,{
          owned:!!(x.owned||Number(x.quantity)>0),
          quantity:Number(x.quantity||0),
          eligible:x.eligible!==false,
          compact:true
        })).join("")||'<div class="reward-vault-empty">No collectible rewards available yet.</div>';
      }
      const pendingDraws=Number(data?.pending_reward_draws??0);
      const pendingEl=document.querySelector("#profile-pending-draws");
      if(pendingEl)pendingEl.textContent=pendingDraws+" Reward Draw"+(pendingDraws===1?"":"s")+" Ready";
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

  document.querySelector("#resend-verification")?.addEventListener("click",async()=>{
    session=await getSession();
    user=session?await getAuthUser(session):null;
    const email=(user?.email||"").trim();
    if(!email){showAuthMessage("No account email is available.","error");return}
    const button=document.querySelector("#resend-verification");
    const original=button?.textContent||"Resend verification email";
    try{
      if(button){button.disabled=true;button.textContent="Sending verification…"}
      await authRequest("resend?redirect_to="+encodeURIComponent(accountUrl()),{
        body:{type:"signup",email}
      });
      showAuthMessage("Verification email sent. Check your inbox and spam folder.","success");
    }catch(err){
      showAuthMessage(err.message||"Could not resend the verification email.","error");
    }finally{
      if(button){button.disabled=false;button.textContent=original}
    }
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

  document.querySelector("#change-password-form")?.addEventListener("submit",async e=>{
    e.preventDefault();
    session=await getSession();
    if(!session){showAuthMessage("Your session expired. Sign in again before changing your password.","error");return}
    const password=document.querySelector("#change-password")?.value||"";
    const confirm=document.querySelector("#change-password-confirm")?.value||"";
    if(password.length<8){showAuthMessage("Use at least 8 characters for your new password.","error");return}
    if(password!==confirm){showAuthMessage("The two password fields do not match.","error");return}
    const submit=e.currentTarget.querySelector("button[type='submit']");
    try{
      if(submit){submit.disabled=true;submit.textContent="Updating password…"}
      await authRequest("user",{method:"PUT",token:session.access_token,body:{password}});
      e.currentTarget.reset();
      showAuthMessage("Password changed successfully.","success");
    }catch(err){
      showAuthMessage(err.message||"Could not update your password.","error");
    }finally{
      if(submit){submit.disabled=false;submit.textContent="Update password"}
    }
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
  const forms=[...document.querySelectorAll("#contact-form,[data-support-contact]")];
  if(!forms.length)return;
  const session=await getSession();
  const user=session?await getAuthUser(session):null;

  forms.forEach(form=>{
    const subject=form.querySelector("#contact-subject,[data-contact-subject]");
    const body=form.querySelector("#contact-body,[data-contact-body]");
    const button=form.querySelector("#contact-submit,[data-contact-submit]");
    if(!subject||!body||!button)return;

    if(!user){
      subject.disabled=true;body.disabled=true;button.disabled=true;
      button.textContent="Reader sign-in required";
      return;
    }

    subject.disabled=false;body.disabled=false;button.disabled=false;
    button.textContent="Send message to Admin";
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const subjectText=subject.value.trim(),bodyText=body.value.trim();
      if(!subjectText||!bodyText)return;
      button.disabled=true;button.textContent="Sending…";
      try{
        await rpc("reader_contact_admin",{p_subject:subjectText,p_body:bodyText},session.access_token);
        subject.value="";body.value="";button.textContent="Message sent";
      }catch{button.textContent="Could not send — try again"}
      finally{setTimeout(()=>{button.disabled=false;button.textContent="Send message to Admin"},1500)}
    },{once:true});
  });
}

async function initRead(){
  const releaseMini=document.querySelector("#release-mini");
  try{
    const clock=firstRow(await rpc("api_public_release_state_v1"));
    paintReleaseState(document.querySelector("#reader-release-state"),clock);
    if(releaseMini){
      const mode=clock?.releases_paused?"PAUSED · ":clock?.launch_authorized===false?"PRE-LAUNCH · ":"";
      releaseMini.textContent=mode+"3 Parts · 8:00 AM / 2:00 PM / 8:00 PM · Mon–Sat · Sunday rest";
    }
  }catch{
    try{
      const p=firstRow(await rpc("api_release_policy"));
      if(releaseMini)releaseMini.textContent=(p?.releases_paused?"PAUSED · ":"")+"3 Parts · 8:00 AM / 2:00 PM / 8:00 PM · Mon–Sat · Sunday rest";
    }catch{}
  }

  let episodes=[];
  try{episodes=await rpc("api_episode_library")}catch{}

  const episodeList=document.querySelector("#episode-list");
  const episodeSelect=document.querySelector("#reader-episode-select");
  const partSelect=document.querySelector("#reader-part-select");
  const episodeCount=document.querySelector("#episode-count");
  const tabs=document.querySelector("#part-tabs");
  const body=document.querySelector("#novel-body");
  const prevButton=document.querySelector("#reader-prev");
  const nextButton=document.querySelector("#reader-next");

  if(!Array.isArray(episodes)||!episodes.length){
    if(episodeCount)episodeCount.textContent="No public Episodes";
    if(episodeSelect){
      episodeSelect.innerHTML='<option>No released Episodes yet</option>';
      episodeSelect.disabled=true;
    }
    if(partSelect){
      partSelect.innerHTML='<option>No released Parts yet</option>';
      partSelect.disabled=true;
    }
    if(prevButton)prevButton.disabled=true;
    if(nextButton)nextButton.disabled=true;
    return;
  }

  const params=new URLSearchParams(location.search);
  const startFromBeginning=params.get("start")==="1";
  const local=startFromBeginning?null:readLocalProgress();
  const handoff=document.querySelector("#reader-start-handoff");
  if(handoff)handoff.classList.toggle("hidden",!startFromBeginning);
  let requestedEpisode=Number(startFromBeginning?episodes[0].episode_number:(params.get("episode")||local?.episode_number||episodes[0].episode_number));
  let requestedPart=Number(startFromBeginning?0:(params.get("part")||local?.part_number||0));
  if(!episodes.some(e=>Number(e.episode_number)===requestedEpisode))requestedEpisode=Number(episodes[0].episode_number);

  if(episodeCount)episodeCount.textContent=episodes.length+" released";
  if(episodeList){
    episodeList.innerHTML=episodes.map(e=>
      '<button class="episode-button" data-episode="'+esc(e.episode_number)+'"><small>EPISODE '+esc(e.episode_number)+'</small><strong>'+esc(e.title)+'</strong></button>'
    ).join("");
  }
  if(episodeSelect){
    episodeSelect.innerHTML=episodes.map(e=>
      '<option value="'+esc(e.episode_number)+'">Episode '+String(e.episode_number).padStart(3,"0")+' — '+esc(e.title||"GENESIS")+'</option>'
    ).join("");
    episodeSelect.disabled=false;
  }

  let currentEpisodeNumber=null;
  let currentParts=[];
  let currentPartIndex=0;
  let currentOpenPart=null;

  const refreshNavButtons=()=>{
    if(!currentParts.length){
      if(prevButton)prevButton.disabled=true;
      if(nextButton)nextButton.disabled=true;
      return;
    }
    const episodeIndex=episodes.findIndex(e=>Number(e.episode_number)===Number(currentEpisodeNumber));
    const hasPrev=currentPartIndex>0||episodeIndex>0;
    const hasNext=currentPartIndex<currentParts.length-1||episodeIndex<episodes.length-1;
    if(prevButton)prevButton.disabled=!hasPrev;
    if(nextButton)nextButton.disabled=!hasNext;
  };

  async function openEpisode(number,preferredPart=null,{restore=true}={}){
    currentEpisodeNumber=Number(number);
    document.querySelectorAll(".episode-button").forEach(b=>b.classList.toggle("active",b.dataset.episode===String(number)));
    if(episodeSelect)episodeSelect.value=String(number);

    const episode=episodes.find(e=>String(e.episode_number)===String(number));
    const head=document.querySelector("#novel-head");
    if(head){
      head.innerHTML='<p class="eyebrow">EPISODE '+esc(number)+'</p><h2>'+esc(episode?.title||"GENESIS")+'</h2><p>'+esc(episode?.summary_public||"Published story.")+'</p>';
    }

    let parts=[];
    try{parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(number)})}catch{}
    currentParts=Array.isArray(parts)?parts:[];

    if(!currentParts.length){
      if(tabs)tabs.innerHTML="";
      if(body)body.innerHTML='<div class="empty-state large reader-empty-state"><strong>No released Parts yet.</strong><span>This Episode does not have a published Part available yet.</span></div>';
      if(partSelect){
        partSelect.innerHTML='<option>No released Parts yet</option>';
        partSelect.disabled=true;
      }
      currentPartIndex=0;
      currentOpenPart=null;
      refreshNavButtons();
      return;
    }

    let initialIndex=0;
    if(preferredPart){
      const found=currentParts.findIndex(p=>Number(p.part_number)===Number(preferredPart));
      if(found>=0)initialIndex=found;
    }

    if(tabs){
      tabs.innerHTML=currentParts.map((p,i)=>'<button data-part="'+i+'" class="'+(i===initialIndex?"active":"")+'">Part '+esc(p.part_number)+'</button>').join("");
    }
    if(partSelect){
      partSelect.disabled=false;
      partSelect.innerHTML=currentParts.map((p,i)=>
        '<option value="'+i+'">Part '+String(p.part_number).padStart(3,"0")+(p.title?' — '+esc(p.title):'')+'</option>'
      ).join("");
      partSelect.value=String(initialIndex);
    }

    const openPart=async(idx,{restore=true}={})=>{
      const part=currentParts[idx];if(!part)return;
      currentPartIndex=idx;
      currentOpenPart=openPart;
      if(tabs)tabs.querySelectorAll("button").forEach((b,i)=>b.classList.toggle("active",i===idx));
      if(partSelect)partSelect.value=String(idx);
      const access=part.access_mode&&part.access_mode!=="PUBLIC"?' · '+part.access_mode+' EARLY ACCESS':'';
      if(body)body.innerHTML='<div class="status-chip">Part '+esc(part.part_number)+' · '+esc(part.title||"")+esc(access)+'</div>'+textParagraphs(part.body_text||"");
      history.replaceState({},document.title,location.pathname+"?episode="+encodeURIComponent(number)+"&part="+encodeURIComponent(part.part_number));

      const previous=readLocalProgress();
      const same=previous&&Number(previous.episode_number)===Number(number)&&Number(previous.part_number)===Number(part.part_number);
      const state={
        episode_number:Number(number),
        episode_title:episode?.title||"GENESIS",
        part_number:Number(part.part_number),
        part_id:part.part_id||null,
        title:part.title||episode?.title||"GENESIS",
        progress_pct:same?Number(previous.progress_pct||0):0,
        source:"reader"
      };
      saveLocalProgress(state);
      window.__GENESIS_ACTIVE_READING_STATE=state;
      refreshNavButtons();

      const panel=document.querySelector("#comments-panel"),commentList=document.querySelector("#part-comments");
      panel?.classList.remove("hidden");
      if(commentList&&part.part_id){
        const reloadComments=async()=>{
          try{
            const comments=await rpc("api_part_comments",{p_part_id:part.part_id});
            commentList.innerHTML=!Array.isArray(comments)||!comments.length
              ?'<div class="empty-state">No comments yet. Be the first to share a reaction or prediction.</div>'
              :comments.map(c=>'<article class="comment-card"><div class="comment-meta"><strong>'+esc(c.display_name||"Reader")+'</strong>'+(c.badge?'<span class="reader-badge '+(c.badge==="VIP"?"vip":"")+'">'+esc(c.badge)+'</span>':'')+'<small>'+esc(new Date(c.created_at).toLocaleString())+'</small></div><div>'+esc(c.body)+'</div></article>').join("");
          }catch{commentList.innerHTML='<div class="empty-state">Comments are temporarily unavailable.</div>'}
        };
        commentList.innerHTML='<div class="empty-state">Loading comments…</div>';
        await reloadComments();
        await renderPartCommentComposer(part.part_id,reloadComments);
      }

      if(restore&&same&&Number(previous.progress_pct)>0){
        setTimeout(()=>{
          const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
          window.scrollTo({top:max*Math.min(100,Math.max(0,Number(previous.progress_pct)))/100,behavior:"auto"});
        },80);
      }else if(innerWidth<=820){
        document.querySelector("#novel-panel")?.scrollIntoView({block:"start",behavior:"auto"});
      }else{
        window.scrollTo({top:0,behavior:"auto"});
      }
    };

    if(tabs)tabs.querySelectorAll("button").forEach((b,i)=>b.addEventListener("click",()=>openPart(i,{restore:true})));
    await openPart(initialIndex,{restore});
  }

  const navigateRelative=async(delta)=>{
    if(!currentParts.length)return;
    const target=currentPartIndex+delta;
    if(target>=0&&target<currentParts.length){
      await currentOpenPart?.(target,{restore:false});
      return;
    }
    const episodeIndex=episodes.findIndex(e=>Number(e.episode_number)===Number(currentEpisodeNumber));
    const targetEpisodeIndex=episodeIndex+(delta>0?1:-1);
    if(targetEpisodeIndex<0||targetEpisodeIndex>=episodes.length)return;
    const targetEpisode=episodes[targetEpisodeIndex];
    if(delta>0){
      await openEpisode(targetEpisode.episode_number,null,{restore:false});
      return;
    }
    let previousParts=[];
    try{previousParts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(targetEpisode.episode_number)})}catch{}
    const last=Array.isArray(previousParts)&&previousParts.length?previousParts[previousParts.length-1]:null;
    await openEpisode(targetEpisode.episode_number,last?.part_number||null,{restore:false});
  };

  episodeList?.querySelectorAll(".episode-button").forEach(b=>b.addEventListener("click",async()=>{
    await openEpisode(b.dataset.episode,null,{restore:true});
    document.querySelector(".reader-shell")?.classList.remove("mobile-library-open");
  }));
  episodeSelect?.addEventListener("change",()=>openEpisode(episodeSelect.value,null,{restore:false}));
  partSelect?.addEventListener("change",()=>currentOpenPart?.(Number(partSelect.value),{restore:false}));
  prevButton?.addEventListener("click",()=>navigateRelative(-1));
  nextButton?.addEventListener("click",()=>navigateRelative(1));

  await openEpisode(requestedEpisode,requestedPart||null,{restore:!startFromBeginning});
}

function atlasArt(seed=""){
  const v=entityVisual("map",seed);
  return v?.art||"/assets/v27/rewards/early-genesis-world-panorama.webp";
}
function atlasFieldText(value){
  if(value===null||value===undefined)return "—";
  if(typeof value==="string")return value;
  if(typeof value==="number"||typeof value==="boolean")return String(value);
  if(Array.isArray(value))return value.map(atlasFieldText).join(", ");
  try{return JSON.stringify(value)}catch{return String(value)}
}
function atlasPrettyKey(key){
  return String(key||"").replaceAll("_"," ").replace(/\b\w/g,m=>m.toUpperCase());
}
function atlasVisibleFields(fields={}){
  const relationKeys=new Set([
    "connections","connected_maps","routes","monsters","monster_ids","bestiary","encounters",
    "npcs","npc_ids","people","shops","shop_ids","services","region","map_type","atlas_art_url"
  ]);
  return Object.entries(fields&&typeof fields==="object"?fields:{})
    .filter(([key])=>!relationKeys.has(key))
    .slice(0,18);
}
function atlasMapCard(map){
  const art=map?.art?.url||atlasArt(map?.slug||map?.entity_code||map?.public_name);
  const placeholder=map?.art?.status!=="READY";
  const fields=atlasVisibleFields(map?.revealed_fields||{});
  const chips=fields.slice(0,3).map(([k,v])=>'<span title="'+esc(atlasFieldText(v))+'">'+esc(atlasPrettyKey(k))+'</span>').join("");
  return '<a class="atlas-map-card'+(placeholder?' is-placeholder':'')+'" href="'+esc(mapDetailUrl(map?.slug))+'">'+
    '<div class="atlas-map-card-art" style="background-image:linear-gradient(180deg,rgba(4,10,17,.04),rgba(4,10,17,.88)),url(\''+esc(art)+'\')">'+
      '<span class="atlas-map-state">'+esc(map?.reveal_state||"DISCOVERED")+'</span>'+
      (placeholder?'<span class="atlas-art-pending">ART PENDING</span>':'')+
    '</div>'+
    '<div class="atlas-map-card-copy">'+
      '<small>'+esc(map?.region||"Discovered World")+' · '+esc(map?.map_type||"MAP")+'</small>'+
      '<h2>'+esc(map?.public_name||"Revealed map")+'</h2>'+
      '<p>'+esc(map?.short_description||"A location revealed through the published story.")+'</p>'+
      (chips?'<div class="atlas-field-chips">'+chips+'</div>':'')+
      '<span class="atlas-open-link">Open map database →</span>'+
    '</div>'+
  '</a>';
}
function renderAtlasRegions(maps){
  const filter=document.querySelector("#atlas-region-filter");
  if(!filter)return;
  const regions=[...new Set(maps.map(x=>x.region||"Discovered World"))].sort((a,b)=>a.localeCompare(b));
  if(regions.length<=1){filter.innerHTML="";return;}
  filter.innerHTML='<button type="button" class="active" data-atlas-region="">All</button>'+
    regions.map(r=>'<button type="button" data-atlas-region="'+esc(r)+'">'+esc(r)+'</button>').join("");
  filter.querySelectorAll("[data-atlas-region]").forEach(button=>button.addEventListener("click",()=>{
    filter.querySelectorAll("[data-atlas-region]").forEach(x=>x.classList.toggle("active",x===button));
    const wanted=button.dataset.atlasRegion||"";
    document.querySelectorAll(".atlas-region-group").forEach(group=>{
      group.classList.toggle("hidden",!!wanted&&group.dataset.region!==wanted);
    });
  }));
}
function renderAtlasBoard(maps,contract){
  const board=document.querySelector("#atlas-board");
  const status=document.querySelector("#atlas-status");
  if(!board)return;
  if(status)status.textContent=(contract?.reader_safe_count??maps.length)+" map"+((contract?.reader_safe_count??maps.length)===1?"":"s")+" revealed";
  if(!maps.length){
    board.innerHTML='<div class="atlas-fog-state">'+
      '<div class="atlas-fog-orb">?</div>'+
      '<strong>The Atlas is still under full fog-of-war.</strong>'+
      '<p>This place has not been revealed by the published story yet. The Atlas will open it when readers reach that discovery.</p>'+
      '<span class="atlas-fog-rule">Backend existence ≠ reader visibility</span>'+
    '</div>';
    const filter=document.querySelector("#atlas-region-filter");if(filter)filter.innerHTML="";
    return;
  }
  const groups=new Map();
  maps.forEach(map=>{
    const region=map.region||"Discovered World";
    if(!groups.has(region))groups.set(region,[]);
    groups.get(region).push(map);
  });
  board.innerHTML=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([region,items])=>
    '<section class="atlas-region-group" data-region="'+esc(region)+'">'+
      '<div class="atlas-region-head"><div><small>REGION</small><strong>'+esc(region)+'</strong></div><span>'+items.length+' revealed</span></div>'+
      '<div class="atlas-map-grid">'+items.map(atlasMapCard).join("")+'</div>'+
    '</section>'
  ).join("");
  renderAtlasRegions(maps);
}
async function loadAtlasIndex(query=null){
  const board=document.querySelector("#atlas-board");
  if(board)board.innerHTML='<div class="atlas-fog-state"><div class="atlas-fog-orb">⌁</div><strong>Charting the revealed Atlas…</strong><p>Revealed locations are being gathered.</p></div>';
  try{
    const raw=await rpc("api_atlas_map_index_v1",{p_query:query||null,p_limit:100});
    const data=firstRow(raw)||raw||{};
    const maps=Array.isArray(data?.maps)?data.maps:[];
    renderAtlasBoard(maps,data);
  }catch(error){
    if(board)board.innerHTML='<div class="atlas-fog-state error-state"><div class="atlas-fog-orb">!</div><strong>Atlas data is temporarily unavailable.</strong><p>'+esc(error.message||"The Atlas could not be reached.")+'</p></div>';
    const status=document.querySelector("#atlas-status");if(status)status.textContent="Unavailable";
  }
}
function initWorld(){
  const input=document.querySelector("#atlas-search");
  const run=()=>loadAtlasIndex(input?.value.trim()||null);
  document.querySelector("#atlas-search-button")?.addEventListener("click",run);
  document.querySelector("#atlas-clear-button")?.addEventListener("click",()=>{
    if(input)input.value="";
    loadAtlasIndex(null);
  });
  input?.addEventListener("keydown",e=>{if(e.key==="Enter")run()});
  loadAtlasIndex(null);
}

function atlasRelatedCard(item,kind){
  const type=kind==="connections"?"map":(item?.entity_type||kind.replace(/s$/,""));
  const art=item?.art?.url||entityVisual(type,item?.entity_code||item?.slug||item?.public_name)?.art||atlasArt(item?.slug);
  const href=kind==="connections"
    ?mapDetailUrl(item?.slug)
    :codexEntityUrl(type,item?.public_name);
  return '<a class="atlas-related-card is-placeholder" href="'+esc(href)+'">'+
    '<div class="atlas-related-art" style="background-image:linear-gradient(180deg,rgba(4,10,17,.08),rgba(4,10,17,.92)),url(\''+esc(art)+'\')"><span>ART PENDING</span></div>'+
    '<div><small>'+esc(type.toUpperCase())+'</small><strong>'+esc(item?.public_name||item?.entity_code||"Revealed entry")+'</strong><p>'+esc(item?.short_description||"Related revealed record.")+'</p></div>'+
  '</a>';
}
function renderMapRelation(kind,allowed,items){
  const root=document.querySelector("#map-"+kind);
  const gate=document.querySelector("#map-"+kind+"-gate");
  if(gate)gate.textContent=allowed?"REVEALED":"FOG-GATED";
  if(!root)return;
  if(!allowed){
    root.innerHTML='<div class="atlas-relation-fog"><strong>Relationship still hidden</strong><p>This map may already have '+esc(kind)+' exists beyond the current story reveal and remains hidden for now.</p></div>';
    return;
  }
  if(!Array.isArray(items)||!items.length){
    root.innerHTML='<div class="empty-state">No revealed '+esc(kind)+' are currently attached to this map.</div>';
    return;
  }
  root.innerHTML=items.map(x=>atlasRelatedCard(x,kind)).join("");
}
function renderMapFields(fields){
  const root=document.querySelector("#map-revealed-fields");
  if(!root)return;
  const rows=atlasVisibleFields(fields||{});
  if(!rows.length){
    root.innerHTML='<div class="empty-state">The map identity is revealed, but no additional map fields have been released yet.</div>';
    return;
  }
  root.innerHTML=rows.map(([key,value])=>
    '<div class="map-field-card"><small>'+esc(atlasPrettyKey(key))+'</small><strong>'+esc(atlasFieldText(value))+'</strong></div>'
  ).join("");
}
async function initMapDetail(){
  const params=new URLSearchParams(location.search);
  const slug=params.get("slug")||"";
  const locked=document.querySelector("#map-locked-state");
  const content=document.querySelector("#map-detail-content");
  if(!slug){
    locked?.classList.remove("hidden");
    if(content)content.classList.add("hidden");
    document.querySelector("#map-detail-name").textContent="Unknown Atlas location";
    return;
  }
  try{
    const raw=await rpc("api_atlas_map_detail_v1",{p_slug:slug});
    const data=firstRow(raw)||raw;
    if(!data?.map){
      locked?.classList.remove("hidden");
      if(content)content.classList.add("hidden");
      document.querySelector("#map-detail-name").textContent="Fog-of-war";
      document.querySelector("#map-detail-description").textContent="This Atlas location is not spoiler-safe yet.";
      return;
    }
    const map=data.map;
    document.title=(map.public_name||"Map")+" — GENESIS Atlas";
    document.querySelector("#map-breadcrumb-name").textContent=map.public_name||"Map";
    document.querySelector("#map-detail-region").textContent=(map.region||"Discovered World").toUpperCase();
    document.querySelector("#map-detail-name").textContent=map.public_name||"Revealed map";
    document.querySelector("#map-detail-description").textContent=map.short_description||"A location revealed through the published story.";
    document.querySelector("#map-detail-type").textContent=map.map_type||"MAP";
    document.querySelector("#map-detail-state").textContent=map.reveal_state||"DISCOVERED";
    document.querySelector("#map-detail-code").textContent=map.entity_code||"—";
    const artRoot=document.querySelector("#map-detail-art");
    const artUrl=map?.art?.url||atlasArt(map.slug||map.entity_code);
    if(artRoot){
      artRoot.style.backgroundImage="linear-gradient(180deg,rgba(2,7,12,.12),rgba(2,7,12,.72)),url('"+String(artUrl).replaceAll("'","%27")+"')";
      artRoot.classList.toggle("is-placeholder",map?.art?.status!=="READY");
      const mark=artRoot.querySelector(".map-placeholder-mark");
      if(mark)mark.innerHTML=map?.art?.status==="READY"?"REVEALED<br><strong>ARTWORK</strong>":"MAP ART<br><strong>PENDING</strong>";
    }
    renderMapFields(map.revealed_fields||{});
    const gates=data.cross_link_gates||{};
    renderMapRelation("connections",!!gates.connections,data.connections);
    renderMapRelation("monsters",!!gates.monsters,data.monsters);
    renderMapRelation("npcs",!!gates.npcs,data.npcs);
    renderMapRelation("shops",!!gates.shops,data.shops);
  }catch(error){
    locked?.classList.remove("hidden");
    if(content)content.classList.add("hidden");
    document.querySelector("#map-detail-name").textContent="Atlas unavailable";
    document.querySelector("#map-detail-description").textContent=error.message||"The Atlas could not be reached.";
  }
}

async function loadCodex(){
  const results=document.querySelector("#codex-results");
  const type=document.querySelector("#codex-type").value||null;
  const query=document.querySelector("#codex-search").value.trim()||null;
  results.innerHTML='<div class="empty-state large">Searching the revealed archive…</div>';
  try{
    const rows=await rpc("api_entity_search_v2",{p_type:type,p_query:query,p_limit:60});
    const count=document.querySelector("#codex-result-count");
    if(!Array.isArray(rows)||!rows.length){
      if(count)count.textContent="0 revealed results";
      const v=entityVisual(type||"codex");
      results.innerHTML='<div class="v28-empty-discovery codex-empty"><div class="empty-art" style="background-image:linear-gradient(180deg,rgba(2,8,14,.12),rgba(2,8,14,.94)),url(\''+esc(v.art)+'\')"></div><div><small>REVEALED ARCHIVE</small><strong>The Codex is still waiting for this discovery.</strong><p>Try another category, or return as more of the world is revealed through the story.</p></div></div>';
      return;
    }
    if(count)count.textContent=rows.length+" revealed result"+(rows.length===1?"":"s");
    results.innerHTML=rows.map(x=>entityCard(x,"codex")).join("");
  }catch{
    results.innerHTML='<div class="empty-state large">Codex is temporarily unavailable.</div>';
  }
}
function initCodex(){
  const params=new URLSearchParams(location.search);
  const q=params.get("q");
  const requestedType=params.get("type");
  if(q&&document.querySelector("#codex-search"))document.querySelector("#codex-search").value=q;
  if(requestedType&&document.querySelector("#codex-type")){
    const select=document.querySelector("#codex-type");
    const valid=[...select.options].some(o=>o.value===requestedType);
    if(valid)select.value=requestedType;
  }
  document.querySelector("#codex-search-button")?.addEventListener("click",loadCodex);
  document.querySelector("#codex-type")?.addEventListener("change",loadCodex);
  document.querySelector("#codex-search")?.addEventListener("keydown",e=>{if(e.key==="Enter")loadCodex()});
  document.querySelectorAll("[data-codex-chip]").forEach(button=>button.addEventListener("click",()=>{
    document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x===button));
    const select=document.querySelector("#codex-type"); if(select)select.value=button.dataset.codexChip||"";
    loadCodex();
  }));
  document.querySelectorAll("[data-codex-jump]").forEach(button=>button.addEventListener("click",()=>{
    const value=button.dataset.codexJump||"";
    const select=document.querySelector("#codex-type"); if(select)select.value=value;
    document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x.dataset.codexChip===value));
    loadCodex();
    document.querySelector(".codex-console")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  const currentType=document.querySelector("#codex-type")?.value||"";
  document.querySelectorAll("[data-codex-chip]").forEach(x=>x.classList.toggle("active",x.dataset.codexChip===currentType));
  loadCodex();
}





function closeGlobalFlyouts(){
  const search=document.querySelector("#global-search-panel");
  const notifications=document.querySelector("#notification-panel");
  const backdrop=document.querySelector("#global-flyout-backdrop");
  search?.setAttribute("hidden","");
  notifications?.setAttribute("hidden","");
  backdrop?.setAttribute("hidden","");
  document.querySelector("#global-search-input")?.setAttribute("aria-expanded","false");
  document.querySelector("#notification-button")?.setAttribute("aria-expanded","false");
}
function openFlyout(el,button){
  closeGlobalFlyouts();
  el?.removeAttribute("hidden");
  document.querySelector("#global-flyout-backdrop")?.removeAttribute("hidden");
  button?.setAttribute("aria-expanded","true");
}
async function searchGenesisPublic(query){
  const q=String(query||"").trim();
  if(q.length<2)return [];
  const [episodesRaw,entitiesRaw]=await Promise.allSettled([
    rpc("api_episode_library"),
    rpc("api_entity_search_v2",{p_type:null,p_query:q,p_limit:18})
  ]);
  const episodes=episodesRaw.status==="fulfilled"&&Array.isArray(episodesRaw.value)
    ?episodesRaw.value.filter(e=>String(e.title||"").toLowerCase().includes(q.toLowerCase())||String(e.summary_public||"").toLowerCase().includes(q.toLowerCase())||String(e.episode_number)===q).slice(0,6)
    :[];
  const entities=entitiesRaw.status==="fulfilled"&&Array.isArray(entitiesRaw.value)?entitiesRaw.value.slice(0,18):[];
  return [
    ...episodes.map(e=>({
      kind:"Story",
      title:"Episode "+e.episode_number+" · "+(e.title||"GENESIS"),
      detail:e.summary_public||"Published story.",
      href:readerUrl(e.episode_number,null)
    })),
    ...entities.map(x=>({
      kind:String(x.entity_type||"Codex").replaceAll("_"," "),
      title:x.public_name||x.entity_code||"Revealed entry",
      detail:x.short_description||"Revealed Codex record.",
      href:sitePath("/codex/")+"?q="+encodeURIComponent(x.public_name||x.entity_code||q)
    }))
  ].slice(0,20);
}
function initGlobalSearch(){
  const input=document.querySelector("#global-search-input");
  const panel=document.querySelector("#global-search-panel");
  const results=document.querySelector("#global-search-results");
  if(!input||!panel||!results)return;
  let timer=null,token=0;
  const run=()=>{
    clearTimeout(timer);
    const q=input.value.trim();
    if(q.length<2){
      results.innerHTML='<div class="flyout-empty">Type at least 2 characters to search released story and revealed Codex records.</div>';
      if(q.length===0)closeGlobalFlyouts();
      return;
    }
    openFlyout(panel,input);
    results.innerHTML='<div class="flyout-empty">Searching GENESIS…</div>';
    const mine=++token;
    timer=setTimeout(async()=>{
      try{
        const rows=await searchGenesisPublic(q);
        if(mine!==token)return;
        results.innerHTML=rows.length?rows.map(x=>
          '<a class="global-result" href="'+esc(x.href)+'"><small>'+esc(x.kind.toUpperCase())+'</small><strong>'+esc(x.title)+'</strong><span>'+esc(x.detail)+'</span></a>'
        ).join(""):'<div class="flyout-empty">No revealed GENESIS records match “'+esc(q)+'”.</div>';
      }catch{
        if(mine===token)results.innerHTML='<div class="flyout-empty">Search is temporarily unavailable.</div>';
      }
    },180);
  };
  input.addEventListener("input",run);
  input.addEventListener("focus",()=>{if(input.value.trim().length>=2)run()});
  input.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closeGlobalFlyouts();input.blur()}
    if(e.key==="Enter"){
      const first=results.querySelector("a");
      if(first)location.href=first.href;
    }
  });
  document.querySelector("[data-close-search]")?.addEventListener("click",closeGlobalFlyouts);
}

function getReadNotificationIds(){
  try{return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_READ_KEY)||"[]"))}catch{return new Set()}
}
function saveReadNotificationIds(ids){
  try{localStorage.setItem(NOTIFICATION_READ_KEY,JSON.stringify([...ids].slice(-200)))}catch{}
}
async function readPublicReleaseAuthority(){
  let releaseState=null;
  try{releaseState=firstRow(await rpc("api_public_release_state_v1"))}catch{}
  const authoritativeAt=releaseState?.next_publish_at?new Date(releaseState.next_publish_at):null;
  const authoritativeValid=authoritativeAt&&!Number.isNaN(authoritativeAt.getTime())&&authoritativeAt.getTime()>Date.now();
  if(authoritativeValid)return {releaseState,authoritativeAt};
  if(releaseState?.launch_authorized&&!releaseState?.releases_paused){
    return {releaseState,authoritativeAt:null};
  }
  return {releaseState,authoritativeAt:null};
}

async function buildNotificationFeed(){
  const items=[];
  try{
    const {releaseState:state}=await readPublicReleaseAuthority();
    if(state?.releases_paused){
      items.push({id:"release-paused",kind:"Release",title:"Story releases are paused",detail:"New Parts will appear here when releases resume.",href:sitePath("/read/"),time:"SYSTEM"});
    }else if(state?.next_part&&state?.next_publish_at){
      const p=state.next_part;
      items.push({id:"next-"+(p.part_key||p.episode_number+"-"+p.part_number)+"-"+state.next_publish_at,kind:"Release",title:"Next Part scheduled",detail:"Episode "+p.episode_number+" · Part "+String(p.part_number).padStart(3,"0")+" · "+formatPhtDate(state.next_publish_at),href:sitePath("/read/"),time:"UPCOMING"});
    }
  }catch{}
  try{
    const episodes=await rpc("api_episode_library");
    if(Array.isArray(episodes)){
      for(const ep of episodes.slice(0,3)){
        let parts=[];
        try{parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(ep.episode_number)})}catch{}
        if(!Array.isArray(parts))continue;
        for(const p of parts.slice(-3).reverse()){
          items.push({
            id:"release-"+(p.part_id||ep.episode_number+"-"+p.part_number),
            kind:"New Part",
            title:"Episode "+ep.episode_number+" · Part "+String(p.part_number).padStart(3,"0"),
            detail:p.title||ep.title||"Published Part",
            href:readerUrl(ep.episode_number,p.part_number),
            time:formatPhtDate(p.publish_at||p.published_at||p.released_at)||"RELEASED"
          });
        }
      }
    }
  }catch{}
  items.push({id:"reader-quest-v1",kind:"Reader Quest",title:"Reader rewards are active",detail:"Reading, sharing and support can earn EXP and collectible rewards.",href:sitePath("/quests/"),time:"ACTIVE"});
  return items.slice(0,10);
}
async function initNotifications(){
  const button=document.querySelector("#notification-button");
  const panel=document.querySelector("#notification-panel");
  const list=document.querySelector("#notification-list");
  const badge=document.querySelector("#notification-badge");
  if(!button||!panel||!list||!badge)return;
  let feed=await buildNotificationFeed();
  const paint=()=>{
    const read=getReadNotificationIds();
    const unread=feed.filter(x=>!read.has(x.id)).length;
    badge.textContent=String(Math.min(99,unread));
    badge.classList.toggle("hidden",unread===0);
    list.innerHTML=feed.length?feed.map(x=>{
      const isRead=read.has(x.id);
      return '<a class="notification-item '+(isRead?"read":"unread")+'" data-notification-id="'+esc(x.id)+'" href="'+esc(x.href)+'"><span class="notification-dot"></span><div><small>'+esc(x.kind)+' · '+esc(x.time)+'</small><strong>'+esc(x.title)+'</strong><p>'+esc(x.detail)+'</p></div></a>';
    }).join(""):'<div class="flyout-empty">No notifications yet.</div>';
    list.querySelectorAll("[data-notification-id]").forEach(a=>a.addEventListener("click",()=>{
      const next=getReadNotificationIds();next.add(a.dataset.notificationId);saveReadNotificationIds(next);
    }));
  };
  paint();
  button.addEventListener("click",()=>{
    if(panel.hasAttribute("hidden"))openFlyout(panel,button);else closeGlobalFlyouts();
  });
  document.querySelector("[data-close-notifications]")?.addEventListener("click",closeGlobalFlyouts);
  document.querySelector("#notification-mark-all")?.addEventListener("click",()=>{
    const read=getReadNotificationIds();feed.forEach(x=>read.add(x.id));saveReadNotificationIds(read);paint();
  });
}
function initMobileHomeNav(){
  const button=document.querySelector(".v2-mobile-menu");
  const nav=document.querySelector(".v2-primary-nav");
  if(!button||!nav)return;
  const drawer=document.createElement("div");
  drawer.className="v2-mobile-drawer";
  drawer.innerHTML=
    '<div class="mobile-drawer-head"><strong>GENESIS</strong><button type="button" aria-label="Close navigation">×</button></div>'+
    '<label class="mobile-drawer-search"><span class="v25-icon i-search" aria-hidden="true"></span><input type="search" placeholder="Search GENESIS…" autocomplete="off"></label>'+
    '<div class="mobile-drawer-search-results"></div><nav>'+nav.innerHTML+'</nav>';
  const backdrop=document.createElement("button");
  backdrop.type="button";backdrop.className="v2-mobile-drawer-backdrop";backdrop.setAttribute("aria-label","Close navigation");
  document.body.append(backdrop,drawer);
  const searchInput=drawer.querySelector(".mobile-drawer-search input");
  const searchResults=drawer.querySelector(".mobile-drawer-search-results");
  let searchTimer=null,searchToken=0;
  const close=()=>{document.body.classList.remove("v2-menu-open");button.setAttribute("aria-expanded","false")};
  const open=()=>{closeGlobalFlyouts();document.body.classList.add("v2-menu-open");button.setAttribute("aria-expanded","true")};
  button.setAttribute("aria-expanded","false");
  button.addEventListener("click",()=>document.body.classList.contains("v2-menu-open")?close():open());
  drawer.querySelector(".mobile-drawer-head button")?.addEventListener("click",close);
  backdrop.addEventListener("click",close);
  drawer.querySelectorAll("nav a").forEach(a=>a.addEventListener("click",close));
  searchInput?.addEventListener("input",()=>{
    clearTimeout(searchTimer);
    const q=searchInput.value.trim();
    if(q.length<2){searchResults.innerHTML="";return}
    const mine=++searchToken;
    searchResults.innerHTML='<div class="mobile-search-empty">Searching…</div>';
    searchTimer=setTimeout(async()=>{
      try{
        const rows=await searchGenesisPublic(q);
        if(mine!==searchToken)return;
        searchResults.innerHTML=rows.length?rows.slice(0,8).map(x=>
          '<a href="'+esc(x.href)+'"><small>'+esc(x.kind.toUpperCase())+'</small><strong>'+esc(x.title)+'</strong></a>'
        ).join(""):'<div class="mobile-search-empty">No revealed matches.</div>';
      }catch{
        if(mine===searchToken)searchResults.innerHTML='<div class="mobile-search-empty">Search unavailable.</div>';
      }
    },180);
  });
}
function initAmbientOverlay(){
  if(!document.body.classList.contains("web-ds-v2"))return;
  if(document.querySelector(".genesis-ambient-overlay"))return;
  const layer=document.createElement("div");
  layer.className="genesis-ambient-overlay";
  layer.setAttribute("aria-hidden","true");
  layer.innerHTML='<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
  document.body.append(layer);
}
function initUnifiedPublicFrames(){
  if(!document.body.classList.contains("unified-public-page"))return;
  const selectors=[
    ".reader-commandbar",".game-rail",".game-manuscript",".reader-tools-panel",
    ".world-hero",".world-sidebar",".world-map-stage",
    ".codex-header",".codex-console",
    ".fan-hero",".fan-feed-shell",
    ".manga-hero",".support-hero",".support-intro-card",
    ".profile-hero-card",".quest-hero"
  ];
  for(const el of document.querySelectorAll(selectors.join(","))){
    if(el.querySelector(":scope > .unified-corner"))continue;
    for(const pos of ["tl","tr","bl","br"]){
      const corner=document.createElement("i");
      corner.className="unified-corner "+pos;
      corner.setAttribute("aria-hidden","true");
      el.appendChild(corner);
    }
  }
}

async function initSiteChrome(){
  document.querySelector("#global-flyout-backdrop")?.addEventListener("click",closeGlobalFlyouts);
  addEventListener("keydown",e=>{if(e.key==="Escape")closeGlobalFlyouts()});
  initGlobalSearch();
  await initNotifications();
  initMobileHomeNav();
  initAmbientOverlay();
  initUnifiedPublicFrames();
}

function releaseStateFromClock(clock){
  const now=Date.now();
  const paused=!!clock?.releases_paused;
  if(clock?.launch_authorized===false)return {code:"PRE-LAUNCH",className:"awaiting",detail:"Public launch is not authorized yet"};
  const publishAt=clock?.next_publish_at?new Date(clock.next_publish_at):null;
  const cycleAt=clock?.next_cycle_at?new Date(clock.next_cycle_at):null;
  if(paused)return {code:"PAUSED",className:"paused",detail:"Public releases are temporarily paused"};
  if(publishAt&&publishAt.getTime()<now-60000)return {code:"DELAYED",className:"delayed",detail:"Next canonical Part is delayed — later Parts will not skip it"};
  if(!publishAt&&cycleAt)return {code:"AWAITING VERIFIED PART",className:"awaiting",detail:"Waiting for the next verified canonical Part"};
  if(publishAt)return {code:"SCHEDULED",className:"scheduled",detail:"Next canonical Part is queued"};
  return {code:"AWAITING",className:"awaiting",detail:"Release queue is waiting for verified content"};
}
function paintReleaseState(el,clock){
  if(!el)return;
  const state=releaseStateFromClock(clock);
  el.className="release-state-banner"+(el.classList.contains("compact")?" compact":"")+" "+state.className;
  el.innerHTML='<span class="state-dot"></span><strong>'+esc(state.code)+'</strong><small>'+esc(state.detail)+'</small>';
}


function paintSystemNotices(releaseState,accountData=null){
  const list=document.querySelector(".notice-list");
  if(!list)return;
  const releaseTitle=releaseState?.releases_paused?"Release queue paused":releaseState?.launch_authorized===false?"Story launch in preparation":"Three-Part Release Cycle";
  const releaseCopy=releaseState?.releases_paused
    ?"No public Part will release while the queue is paused."
    :releaseState?.launch_authorized===false
      ?"The public Reader will open when the first Part is ready to publish."
      :"Monday–Saturday · 8:00 AM, 2:00 PM and 8:00 PM PHT · Sunday rest.";
  const accessCopy=accountData
    ?"Your Tier, EXP, rewards, and reading progress stay connected to your reader profile."
    :"Sign in to keep your progress, rewards, and reading position together across visits.";
  list.innerHTML=
    '<div><span class="notice-icon gold"><i class="v25-icon i-release" aria-hidden="true"></i></span><p><strong>'+esc(releaseTitle)+'</strong><small>'+esc(releaseCopy)+'</small></p><time>LIVE</time></div>'+
    '<div><span class="notice-icon cyan"><i class="v25-icon i-quest" aria-hidden="true"></i></span><p><strong>Reader Quest System</strong><small>Read, share, support and claim eligible rewards through the protected reader account.</small></p><time>ACTIVE</time></div>'+
    '<div><span class="notice-icon violet"><i class="v25-icon i-profile" aria-hidden="true"></i></span><p><strong>Reader continuity</strong><small>'+esc(accessCopy)+'</small></p><time>SAFE</time></div>';
}
let homeEpisodesPromise=null;
async function getHomeEpisodes({refresh=false}={}){
  if(refresh)homeEpisodesPromise=null;
  if(!homeEpisodesPromise){
    homeEpisodesPromise=rpc("api_episode_library")
      .then(rows=>Array.isArray(rows)?rows:[])
      .catch(()=>[]);
  }
  return homeEpisodesPromise;
}

async function collectLatestParts(episodes,limit=3){
  const rows=[];
  const scope=(Array.isArray(episodes)?[...episodes]:[])
    .sort((a,b)=>Number(b.episode_number||0)-Number(a.episode_number||0))
    .slice(0,8);
  for(const ep of scope){
    let parts=[];
    try{parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(ep.episode_number)})}catch{}
    if(!Array.isArray(parts))continue;
    for(const p of parts){
      rows.push({...p,episode_number:Number(ep.episode_number),episode_title:ep.title||"GENESIS"});
    }
    if(rows.length>=Math.max(limit*3,24))break;
  }
  rows.sort((a,b)=>{
    const ad=new Date(a.publish_at||a.published_at||a.released_at||0).getTime();
    const bd=new Date(b.publish_at||b.published_at||b.released_at||0).getTime();
    if(ad!==bd)return bd-ad;
    if(a.episode_number!==b.episode_number)return b.episode_number-a.episode_number;
    return Number(b.part_number||0)-Number(a.part_number||0);
  });
  return rows.slice(0,limit);
}
function latestPartCard(part,index){
  const when=formatPhtDate(part.publish_at||part.published_at||part.released_at)||"Released";
  return '<a class="release-tile v2-release-tile release-art-'+(index+1)+'" href="'+esc(readerUrl(part.episode_number,part.part_number))+'">'+
    '<div class="release-thumb"></div><div class="release-info"><small>EPISODE '+esc(part.episode_number)+' · PART '+String(part.part_number).padStart(3,"0")+'</small>'+
    '<strong>'+esc(part.title||part.episode_title||"GENESIS")+'</strong><span>'+esc(when)+(index===0?' · NEW':'')+'</span></div></a>';
}

const HOME_RELEASE_SLOTS=["08:00","14:00","20:00"];

function validDate(value){
  if(!value)return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d;
}
function phtParts(value){
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime()))return null;
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"Asia/Manila",
    year:"numeric",month:"2-digit",day:"2-digit",
    weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"
  }).formatToParts(d);
  const out={};
  for(const part of parts)if(part.type!=="literal")out[part.type]=part.value;
  return out;
}
function phtDateKey(value){
  const p=phtParts(value);
  return p?p.year+"-"+p.month+"-"+p.day:"";
}
function phtMinuteOfDay(value){
  const p=phtParts(value);
  return p?Number(p.hour)*60+Number(p.minute):-1;
}
function slotForPhtTime(value){
  const minute=phtMinuteOfDay(value);
  if(minute<0)return null;
  const slots=[[8*60,"08:00"],[14*60,"14:00"],[20*60,"20:00"]];
  let chosen=null;
  for(const [slotMinute,key] of slots){
    if(minute>=slotMinute)chosen=key;
  }
  return chosen;
}
function releasePartIdentity(part){
  const episode=Number(part?.episode_number);
  const number=Number(part?.part_number);
  if(!Number.isInteger(episode)||episode<1||!Number.isInteger(number)||number<1)return null;
  return {episode_number:episode,part_number:number};
}
function releasePartLabel(part){
  const p=releasePartIdentity(part);
  return p?"Episode "+String(p.episode_number).padStart(3,"0")+" · Part "+String(p.part_number).padStart(3,"0"):"Next verified Part";
}
function formatCountdown(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const hours=Math.floor(total/3600);
  const minutes=Math.floor((total%3600)/60);
  const seconds=total%60;
  return String(hours).padStart(2,"0")+" : "+String(minutes).padStart(2,"0")+" : "+String(seconds).padStart(2,"0");
}
function formatPhtClock(value){
  return new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true
  }).format(value);
}
function formatPhtLongDate(value){
  return new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",weekday:"short",month:"short",day:"numeric",year:"numeric"
  }).format(value).toUpperCase();
}

async function fetchHomeReleaseAuthority(){
  let primary=null,clock=null;
  try{primary=firstRow(await rpc("api_public_release_state_v1"))}catch{}
  try{clock=firstRow(await rpc("api_release_clock_v2"))}catch{}
  if(!primary&&!clock)throw new Error("RELEASE_AUTHORITY_UNAVAILABLE");
  return {...(clock||{}),...(primary||{}),timezone:"Asia/Manila"};
}

function normalizeHomeReleaseModel(raw,recentParts=[]){
  const serverNow=validDate(raw?.server_now||raw?.current_time||raw?.now);
  const clockOffset=serverNow?serverNow.getTime()-Date.now():0;
  const now=new Date(Date.now()+clockOffset);
  const nextPublish=validDate(raw?.next_publish_at);
  const nextCycle=validDate(raw?.next_cycle_at);
  const nextPart=releasePartIdentity(raw?.next_part);
  const launchAuthorized=typeof raw?.launch_authorized==="boolean"?raw.launch_authorized:false;
  const paused=typeof raw?.releases_paused==="boolean"?raw.releases_paused:true;
  const todayKey=phtDateKey(now);
  const phtNow=phtParts(now);
  const sunday=phtNow?.weekday==="Sun";

  const publicParts=(Array.isArray(recentParts)?recentParts:[])
    .filter(part=>{
      const published=validDate(part?.publish_at||part?.published_at||part?.released_at);
      return published&&published.getTime()<=now.getTime();
    })
    .sort((a,b)=>{
      const ad=validDate(a.publish_at||a.published_at||a.released_at)?.getTime()||0;
      const bd=validDate(b.publish_at||b.published_at||b.released_at)?.getTime()||0;
      return bd-ad;
    });
  const latestPart=publicParts[0]||null;
  const latestPublishedAt=latestPart?validDate(latestPart.publish_at||latestPart.published_at||latestPart.released_at):null;
  const publishedSlots=new Set();
  for(const part of publicParts){
    const published=validDate(part.publish_at||part.published_at||part.released_at);
    if(!published||phtDateKey(published)!==todayKey)continue;
    const slot=slotForPhtTime(published);
    if(slot)publishedSlots.add(slot);
  }

  let state="AWAITING_VERIFIED_PART";
  if(!launchAuthorized)state="PRE_LAUNCH";
  else if(paused)state="PAUSED";
  else if(nextPublish&&nextPublish.getTime()<now.getTime()-60000)state="DELAYED";
  else if(latestPublishedAt&&now.getTime()-latestPublishedAt.getTime()<=90000)state="RELEASED";
  else if(sunday&&(!nextPublish||phtDateKey(nextPublish)!==todayKey))state="REST_DAY";
  else if(nextPublish&&nextPublish.getTime()>now.getTime()&&nextPart)state="SCHEDULED";

  return {
    state,
    clockOffset,
    now,
    nextPublish,
    nextCycle,
    nextPart,
    nextPartLabel:releasePartLabel(nextPart),
    latestPart,
    latestPartLabel:releasePartLabel(latestPart),
    publishedSlots
  };
}

function homeSlotState(model,slot){
  if(model.state==="PRE_LAUNCH")return {state:"paused",label:"CLOSED"};
  if(model.state==="PAUSED")return {state:"paused",label:"PAUSED"};
  if(model.state==="REST_DAY")return {state:"paused",label:"REST"};
  if(model.publishedSlots.has(slot))return {state:"released",label:"✓ RELEASED"};

  const nextSlot=model.nextPublish?slotForPhtTime(model.nextPublish):null;
  if(nextSlot===slot){
    if(model.state==="DELAYED")return {state:"delayed",label:"DELAYED"};
    if(model.state==="SCHEDULED")return {state:"next",label:"NEXT"};
  }

  const nowMinutes=phtMinuteOfDay(new Date(Date.now()+model.clockOffset));
  const slotMinutes=Number(slot.slice(0,2))*60;
  if(slotMinutes>nowMinutes)return {state:"upcoming",label:"UPCOMING"};
  return {state:"unknown",label:"—"};
}

function formatHomeReleaseTime(value){
  const d=validDate(value);
  if(!d)return "—";
  return new Intl.DateTimeFormat("en-PH",{
    timeZone:"Asia/Manila",hour:"numeric",minute:"2-digit",hour12:true
  }).format(d).toUpperCase()+" PHT";
}
function setHomeCountdown(ms,{released=false,delayed=false}={}){
  const h=document.querySelector("#home-countdown-hours");
  const m=document.querySelector("#home-countdown-minutes");
  const s=document.querySelector("#home-countdown-seconds");
  if(!h||!m||!s)return;
  if(released){h.textContent="00";m.textContent="00";s.textContent="LIVE";return}
  if(delayed){h.textContent="--";m.textContent="--";s.textContent="!!";return}
  if(!Number.isFinite(ms)||ms<0){h.textContent="--";m.textContent="--";s.textContent="--";return}
  const total=Math.max(0,Math.floor(ms/1000));
  h.textContent=String(Math.floor(total/3600)).padStart(2,"0");
  m.textContent=String(Math.floor((total%3600)/60)).padStart(2,"0");
  s.textContent=String(total%60).padStart(2,"0");
}

function renderHomeReleaseModel(model){
  const command=document.querySelector("#home-release-command");
  if(!command)return;
  command.dataset.releaseState=model.state;

  const stateEl=document.querySelector("#home-release-state");
  const timeEl=document.querySelector("#home-release-time");
  const partEl=document.querySelector("#home-release-part");
  const detail=document.querySelector("#home-release-detail");

  const nextTime=model.nextPublish?formatHomeReleaseTime(model.nextPublish):"8 AM · 2 PM · 8 PM";
  const stateCopy={
    PRE_LAUNCH:["STORY LAUNCH IN PREPARATION","8 AM · 2 PM · 8 PM","The first published Part will open here when launch begins."],
    PAUSED:["RELEASES PAUSED","QUEUE PROTECTED","No public Part releases while paused."],
    DELAYED:["NEXT RELEASE DELAYED",nextTime,model.nextPartLabel],
    RELEASED:["NEW PART AVAILABLE","AVAILABLE NOW",model.latestPartLabel],
    REST_DAY:["SUNDAY · REST DAY",model.nextPublish?nextTime:"NEXT RELEASE MONDAY",model.nextPart?model.nextPartLabel:"Official weekly rest day."],
    SCHEDULED:["NEXT RELEASE",nextTime,model.nextPartLabel],
    AWAITING_VERIFIED_PART:["NEXT RELEASE PENDING","8 AM · 2 PM · 8 PM","The next Part will appear here once its schedule is confirmed."],
    API_ERROR:["OFFICIAL RELEASE CYCLE","8 AM · 2 PM · 8 PM","Live countdown appears when the next Part is scheduled."]
  };
  const copy=stateCopy[model.state]||stateCopy.AWAITING_VERIFIED_PART;
  if(stateEl)stateEl.textContent=copy[0];
  if(timeEl)timeEl.textContent=copy[1];
  if(partEl)partEl.textContent=copy[2];
  if(detail){
    detail.textContent=model.state==="DELAYED"
      ?"Later Parts will wait until the delayed Part is released."
      :model.state==="REST_DAY"
        ?"Sunday rest · release cycle resumes on the next valid slot."
        :model.state==="API_ERROR"
          ?"3 Parts · Monday–Saturday"
          :"3 Parts · Monday–Saturday";
  }

  if((model.state==="SCHEDULED"||model.state==="REST_DAY")&&model.nextPublish){
    setHomeCountdown(model.nextPublish.getTime()-(Date.now()+model.clockOffset));
  }else if(model.state==="RELEASED"){
    setHomeCountdown(0,{released:true});
  }else if(model.state==="DELAYED"){
    setHomeCountdown(0,{delayed:true});
  }else{
    setHomeCountdown(NaN);
  }

  document.querySelectorAll("[data-release-slot]").forEach(el=>{
    const value=homeSlotState(model,el.dataset.releaseSlot);
    el.classList.remove("is-released","is-next","is-upcoming","is-delayed","is-paused","is-unknown");
    el.classList.add("is-"+value.state);
    const label=el.querySelector("span");
    if(label)label.textContent=value.label;
  });
}

async function initHomeReleaseOverlay(){
  const command=document.querySelector("#home-release-command");
  if(!command)return;

  let model=null;
  let checking=false;
  let refreshTimer=null;

  const recentParts=async(refresh=false)=>{
    const episodes=await getHomeEpisodes({refresh});
    if(!episodes.length)return [];
    return collectLatestParts(episodes,24);
  };

  const refresh=async({refreshEpisodes=false}={})=>{
    if(checking)return;
    checking=true;
    try{
      const [authority,parts]=await Promise.all([
        fetchHomeReleaseAuthority(),
        recentParts(refreshEpisodes)
      ]);
      model=normalizeHomeReleaseModel(authority,parts);
      renderHomeReleaseModel(model);
    }catch{
      model={
        state:"API_ERROR",
        clockOffset:0,
        nextPublish:null,
        nextPart:null,
        publishedSlots:new Set()
      };
      renderHomeReleaseModel(model);
    }finally{
      checking=false;
    }
  };

  const tick=()=>{
    if(!model)return;
    const correctedNow=new Date(Date.now()+(model?.clockOffset||0));
    if((model.state==="SCHEDULED"||model.state==="REST_DAY")&&model.nextPublish){
      const remaining=model.nextPublish.getTime()-correctedNow.getTime();
      if(remaining>0){
        setHomeCountdown(remaining);
      }else if(!checking){
        const stateEl=document.querySelector("#home-release-state");
        if(stateEl)stateEl.textContent="CHECKING RELEASE…";
        setHomeCountdown(0);
        refresh({refreshEpisodes:true}).then(()=>initHome());
      }
    }
  };

  await refresh();
  tick();
  const tickTimer=window.setInterval(tick,1000);
  refreshTimer=window.setInterval(()=>refresh(),60000);
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")refresh();
  });
  addEventListener("pagehide",()=>{
    clearInterval(tickTimer);
    if(refreshTimer)clearInterval(refreshTimer);
  },{once:true});
}

async function initHomeAccessPanel(){
  const guest=document.querySelector("#home-access-guest");
  const reader=document.querySelector("#home-access-reader");
  if(!guest||!reader)return;

  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  if(!session||!user){
    guest.hidden=false;
    reader.hidden=true;
    return;
  }

  let data=null;
  try{data=await rpc("api_reader_account_v3",{},session.access_token)}catch{}
  if(!data){
    try{data=await rpc("api_reader_account",{},session.access_token)}catch{}
  }
  if(!data){
    guest.hidden=false;
    reader.hidden=true;
    return;
  }

  const totalExp=Number(data?.reader_exp??data?.total_exp??0)||0;
  const threshold=Number(data?.tier_exp_threshold??TIER_EXP_THRESHOLD)||TIER_EXP_THRESHOLD;
  const tier=Number(data?.tier)||Math.floor(totalExp/threshold)+1;
  const within=Number(data?.exp_into_tier);
  const expInto=Number.isFinite(within)?within:(totalExp%threshold);
  const expToNext=Number(data?.exp_to_next_tier);
  const nextTier=Number.isFinite(expToNext)?expToNext:Math.max(0,threshold-expInto);
  const advance=Math.max(0,Number(data?.support?.credit_balance??data?.support?.advance_credit_balance??0)||0);
  const supportLabel=data?.support?.vip_active
    ?"VIP Active"
    :(data?.support?.public_badge||"Standard");
  const progress=data?.latest_read_label||data?.reading_progress?.latest_label||"Not started";
  const collectibles=Math.max(0,Number(data?.collection_count??0)||0);
  const title=data?.reader_title||data?.support?.public_badge||"GENESIS Adventurer";

  const set=(id,value)=>{const el=document.querySelector(id);if(el)el.textContent=value};
  const avatar=document.querySelector("#home-access-avatar");
  if(avatar)avatar.src=user?.user_metadata?.avatar_url||"/assets/genesis-official-logo-64.png";

  set("#home-access-name",data?.display_name||user?.user_metadata?.display_name||"Reader");
  set("#home-access-title",title);
  set("#home-access-tier","Tier "+tier);
  set("#home-access-exp-total",expInto.toLocaleString()+" / "+threshold.toLocaleString()+" EXP");
  set("#home-access-next-tier","Next Tier in "+nextTier.toLocaleString());
  set("#home-access-advance",advance+" Part"+(advance===1?"":"s")+" Ahead");
  set("#home-access-support",supportLabel);
  set("#home-access-reader-exp",totalExp.toLocaleString()+" EXP");
  set("#home-access-progress",progress);
  set("#home-access-collectibles",collectibles+" Unlocked");

  const fill=document.querySelector("#home-access-exp-fill");
  if(fill)fill.style.width=Math.min(100,Math.max(0,expInto/threshold*100))+"%";

  guest.hidden=true;
  reader.hidden=false;
}

async function initHome(){
  const episodes=await getHomeEpisodes();
  const latestGrid=document.querySelector("#home-latest-releases");
  const announcements=document.querySelector("#home-announcements");
  const readingEpisode=document.querySelector("#home-reading-episode");
  const readingTitle=document.querySelector("#home-reading-title");
  const readingSummary=document.querySelector("#home-reading-summary");
  const readingArt=document.querySelector("#home-reading-art");
  const readingContinue=document.querySelector("#home-reading-continue");
  const readingEpisodeLink=document.querySelector("#home-reading-view-episode");

  const relativeAge=value=>{
    const d=validDate(value);
    if(!d)return "";
    const seconds=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
    if(seconds<60)return "now";
    if(seconds<3600)return Math.floor(seconds/60)+"m ago";
    if(seconds<86400)return Math.floor(seconds/3600)+"h ago";
    return Math.floor(seconds/86400)+"d ago";
  };
  const epLabel=(episode,part)=>"EPISODE "+String(episode).padStart(3,"0")+" · PART "+String(part).padStart(3,"0");

  if(!episodes.length){
    if(readingEpisode)readingEpisode.textContent="STORY PRE-LAUNCH";
    if(readingTitle)readingTitle.textContent="Begin your journey";
    if(readingSummary)readingSummary.textContent="The Reader is ready. Your exact progress will appear here once the first Part is published.";
    if(readingContinue){
      readingContinue.href="/site-preview/read/";
      readingContinue.innerHTML='<span aria-hidden="true">▣</span> Open Reader';
    }
    if(readingEpisodeLink){
      readingEpisodeLink.hidden=true;
      readingEpisodeLink.setAttribute("aria-hidden","true");
    }
    if(latestGrid)latestGrid.innerHTML=
      '<div class="deck-prelaunch-state"><span class="deck-prelaunch-mark" aria-hidden="true">✦</span><div><small>RELEASE ARCHIVE</small><strong>The first adventure is being prepared.</strong><p>After launch, the newest published Parts will appear here automatically.</p></div><a href="/site-preview/read/">Open Reader ›</a></div>';
    if(announcements)announcements.innerHTML=
      '<div class="deck-announcement-row"><span class="deck-announcement-icon">◆</span><p><strong>Story launch in preparation</strong><small>The Reader is ready for the first published Part.</small></p><time>Soon</time></div>'+
      '<div class="deck-announcement-row"><span class="deck-announcement-icon">◷</span><p><strong>Official release cycle</strong><small>8:00 AM · 2:00 PM · 8:00 PM · Monday–Saturday</small></p><time>PHT</time></div>'+
      '<a class="deck-announcement-row" href="/site-preview/account/"><span class="deck-announcement-icon">◇</span><p><strong>Prepare your reader profile</strong><small>Sign in now to keep progress, EXP, rewards, and your collection together.</small></p><time>Open</time></a>';
    return;
  }

  const latestParts=await collectLatestParts(episodes,3);
  if(latestGrid){
    latestGrid.innerHTML=latestParts.length?latestParts.map((part,index)=>{
      const when=formatPhtDate(part.publish_at||part.published_at||part.released_at)||"Released";
      const label=epLabel(part.episode_number,part.part_number);
      const title=part.title||part.episode_title||"GENESIS";
      return '<a class="deck-release-card deck-release-card-'+(index+1)+'" href="'+readerUrl(part.episode_number,part.part_number)+'">'+
        '<span class="deck-release-thumb" aria-hidden="true"></span>'+
        '<span class="deck-release-copy"><small>'+esc(label)+'</small><strong>'+esc(title)+'</strong><em>'+esc(when)+'</em></span>'+
        '<b aria-hidden="true">›</b></a>';
    }).join(""):'<a class="deck-release-card is-loading" href="/site-preview/read/"><span>No public release is available yet.</span></a>';
  }

  let readingTarget=null;
  let hasProgress=false;
  const local=typeof readLocalProgress==="function"?readLocalProgress():null;
  if(local?.episode_number){
    try{
      const ep=episodes.find(e=>Number(e.episode_number)===Number(local.episode_number));
      const parts=await rpc("api_episode_parts_for_reader",{p_episode_number:Number(local.episode_number)});
      const match=Array.isArray(parts)?parts.find(p=>Number(p.part_number)===Number(local.part_number)):null;
      if(match){
        readingTarget={...match,episode_title:ep?.title,summary_public:match?.summary_public||ep?.summary_public};
        hasProgress=true;
      }
    }catch{}
  }
  if(!readingTarget&&latestParts[0]){
    const ep=episodes.find(e=>Number(e.episode_number)===Number(latestParts[0].episode_number));
    readingTarget={...latestParts[0],episode_title:latestParts[0].episode_title||ep?.title,summary_public:latestParts[0].summary_public||ep?.summary_public};
  }

  if(readingTarget){
    const href=hasProgress?readerUrl(readingTarget.episode_number,readingTarget.part_number):"/site-preview/read/?start=1";
    const episodeHref=readerUrl(readingTarget.episode_number,readingTarget.part_number);
    if(readingEpisode)readingEpisode.textContent=epLabel(readingTarget.episode_number,readingTarget.part_number);
    if(readingTitle)readingTitle.textContent=readingTarget.title||readingTarget.episode_title||"GENESIS";
    if(readingSummary)readingSummary.textContent=readingTarget.summary_public||"Continue the published story and pick up exactly where you left off.";
    if(readingArt)readingArt.href=episodeHref;
    if(readingContinue){
      readingContinue.href=href;
      readingContinue.innerHTML='<span aria-hidden="true">▣</span> '+(hasProgress?"Continue Reading":"Start Reading");
    }
    if(readingEpisodeLink)readingEpisodeLink.href=episodeHref;
  }

  if(announcements){
    const latest=latestParts[0]||null;
    const latestRow=latest
      ?'<a class="deck-announcement-row" href="'+readerUrl(latest.episode_number,latest.part_number)+'"><span class="deck-announcement-icon">⌂</span><p><strong>Latest public release</strong><small>'+esc(epLabel(latest.episode_number,latest.part_number))+' · '+esc(latest.title||latest.episode_title||"GENESIS")+'</small></p><time>'+esc(relativeAge(latest.publish_at||latest.published_at||latest.released_at)||"Released")+'</time></a>'
      :'<div class="deck-announcement-row"><span class="deck-announcement-icon">⌂</span><p><strong>No public Part yet</strong><small>The reader will update after a verified release.</small></p><time>System</time></div>';
    announcements.innerHTML=
      latestRow+
      '<div class="deck-announcement-row"><span class="deck-announcement-icon">◷</span><p><strong>Official release cycle</strong><small>8:00 AM · 2:00 PM · 8:00 PM · Monday–Saturday</small></p><time>PHT</time></div>'+
      '<a class="deck-announcement-row" href="/site-preview/support/"><span class="deck-announcement-icon">◇</span><p><strong>Support GENESIS</strong><small>Reader support, access, and account options.</small></p><time>Open</time></a>';
  }
}

function initReaderControls(){
  const shell=document.querySelector(".reader-shell");
  const body=document.querySelector("#novel-body");
  const backdrop=document.querySelector("#reader-drawer-backdrop");
  if(!shell||!body)return;

  const closeDrawers=()=>{
    shell.classList.remove("mobile-library-open","mobile-tools-open");
    backdrop?.setAttribute("hidden","");
    document.querySelector("#reader-library-toggle")?.setAttribute("aria-expanded","false");
    document.querySelector("#reader-tools-toggle")?.setAttribute("aria-expanded","false");
  };
  const openDrawer=(type)=>{
    if(innerWidth>820)return;
    shell.classList.toggle(type==="library"?"mobile-library-open":"mobile-tools-open");
    if(type==="library")shell.classList.remove("mobile-tools-open");
    else shell.classList.remove("mobile-library-open");
    const open=shell.classList.contains(type==="library"?"mobile-library-open":"mobile-tools-open");
    if(open)backdrop?.removeAttribute("hidden");else backdrop?.setAttribute("hidden","");
    document.querySelector("#reader-library-toggle")?.setAttribute("aria-expanded",String(shell.classList.contains("mobile-library-open")));
    document.querySelector("#reader-tools-toggle")?.setAttribute("aria-expanded",String(shell.classList.contains("mobile-tools-open")));
  };
  const bind=(id,fn)=>document.querySelector(id)?.addEventListener("click",fn);

  bind("#reader-library-toggle",()=>{ if(innerWidth<=820)openDrawer("library"); else shell.classList.toggle("library-collapsed") });
  bind("#reader-tools-toggle",()=>{ if(innerWidth<=820)openDrawer("tools"); else shell.classList.toggle("tools-collapsed") });
  bind("#reader-library-close",closeDrawers);
  bind("#reader-tools-close",closeDrawers);
  bind("#reader-drawer-backdrop",closeDrawers);
  addEventListener("resize",()=>{if(innerWidth>820)closeDrawers()});

  bind("#reader-fullscreen",async()=>{
    shell.classList.toggle("fullscreen-reader");
    try{
      if(shell.classList.contains("fullscreen-reader"))await document.documentElement.requestFullscreen?.();
      else if(document.fullscreenElement)await document.exitFullscreen?.();
    }catch{}
  });

  const fs=document.querySelector("#font-size-range"),ls=document.querySelector("#line-height-range"),rw=document.querySelector("#reader-width-range");
  fs?.addEventListener("input",()=>{body.style.fontSize=fs.value+"px";document.querySelector("#font-size-label").textContent=fs.value+"px"});
  ls?.addEventListener("input",()=>{body.style.lineHeight=ls.value;document.querySelector("#line-height-label").textContent=Number(ls.value).toFixed(2)});
  rw?.addEventListener("input",()=>{body.style.maxWidth=rw.value+"px";document.querySelector("#reader-width-label").textContent=rw.value+"px"});

  let progressTimer=null;
  const updateProgress=()=>{
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const pct=Math.min(100,Math.max(0,scrollY/max*100));
    const fill=document.querySelector("#reader-progress-fill");if(fill)fill.style.width=pct+"%";
    const pos=document.querySelector("#reader-position");if(pos)pos.textContent=Math.round(pct)+"% read";
    clearTimeout(progressTimer);
    progressTimer=setTimeout(()=>{
      const state=window.__GENESIS_ACTIVE_READING_STATE;
      if(state){state.progress_pct=Math.round(pct*10)/10;saveLocalProgress(state)}
    },350);
  };
  addEventListener("scroll",updateProgress,{passive:true});
  updateProgress();
}

function initCinematicHeroMedia(){
  const media=document.querySelector(".cinematic-hero-media");
  if(!media||media.dataset.videoEnabled!=="true")return;
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  if(navigator.connection?.saveData)return;

  const useMobile=innerWidth<=900;
  const src=useMobile?media.dataset.videoMobile:media.dataset.videoDesktop;
  if(!src)return;

  const video=document.createElement("video");
  video.className="cinematic-hero-video";
  video.muted=true;
  video.autoplay=true;
  video.loop=true;
  video.playsInline=true;
  video.preload="metadata";
  video.poster="/assets/master-key-art-split-world-v1.webp?v=20260930-hq";
  video.src=src;

  video.addEventListener("canplay",()=>{
    media.classList.add("has-video");
    video.play().catch(()=>{});
  },{once:true});
  video.addEventListener("error",()=>{
    media.classList.remove("has-video");
    video.remove();
  },{once:true});

  media.prepend(video);
}

const page=document.body.dataset.page;
await initAuthChrome();
await initSiteChrome();
if(page==="home"){initCinematicHeroMedia();await Promise.all([initHomeReleaseOverlay(),initHomeAccessPanel()]);await initHome();}
if(page==="read"){await initRead();initReaderControls();}
if(page==="world")initWorld();
if(page==="map-detail")await initMapDetail();
if(page==="codex")initCodex();
if(page==="fan")await initFan();
if(page==="support")await initSupport();
if(page==="account")await initAccount();
if(page==="quests")await initQuests();

async function initFan(){
  const feed=document.querySelector("#fan-feed");
  try{
    const rows=await rpc("api_fan_feed",{p_limit:30,p_offset:0});
    if(!Array.isArray(rows)||!rows.length){
      feed.innerHTML='<div class="empty-state large">No Fan Page posts yet. Community posting is currently closed; the approved feed remains read-only until moderation uploads open.</div>';
      return;
    }
    feed.innerHTML=rows.map(p=>'<article class="fan-post"><div class="fan-media">Image stored privately</div><div class="fan-copy"><div class="fan-author"><strong>'+esc(p.display_name||"Reader")+'</strong>'+(p.badge?'<span class="reader-badge '+(p.badge==="VIP"?"vip":"")+'">'+esc(p.badge)+'</span>':'')+'</div><p>'+esc(p.caption||"")+'</p></div></article>').join("");
  }catch{
    feed.innerHTML='<div class="empty-state large">Fan Page is temporarily unavailable.</div>';
  }
}

async function initQuests(){
  const button=document.querySelector("#reward-draw-button");
  const result=document.querySelector("#reward-draw-result");
  const vaultGrid=document.querySelector("#reward-vault-grid");
  if(!button)return;

  const manifest=await loadRewardManifest();
  if(vaultGrid&&manifest.length){
    vaultGrid.innerHTML=manifest.map(x=>rewardCardHtml(x,{owned:false,quantity:0,eligible:true})).join("");
  }

  const session=await getSession();
  const user=session?await getAuthUser(session):null;
  if(!user||!session){
    const cta=document.querySelector("#reward-cta");
    if(cta)cta.classList.add("signed-out");
    button.disabled=false;
    button.textContent="Sign In & Open Reward Vault";
    button.addEventListener("click",()=>{location.href=accountPath()+"?next=quests"});
    return;
  }

  let pending=0;
  let accountData=null;
  try{
    const data=await rpc("api_reader_account_v3",{},session.access_token);
    accountData=data;
    pending=Number(data?.pending_reward_draws??0);
  }catch{
    try{
      const data=await rpc("api_reader_account",{},session.access_token);
      const totalExp=Number(data?.reader_exp??data?.total_exp??0);
      const tier=Math.floor(totalExp/TIER_EXP_THRESHOLD)+1;
      pending=Math.max(0,tier-1-Number(data?.collection_count??0));
    }catch{}
  }

  if(vaultGrid){
    let rewards=[];
    try{
      const collection=await rpc("api_reader_collectibles_v1",{},session.access_token);
      rewards=Array.isArray(collection)?collection:(Array.isArray(collection?.items)?collection.items:[]);
    }catch{}
    if(!rewards.length){
      const manifest=await loadRewardManifest();
      const highest=Number(accountData?.highest_episode_read??999);
      rewards=manifest.map(x=>({...x,owned:false,quantity:0,eligible:Number(x.min_episode??0)<=highest}));
    }
    vaultGrid.innerHTML=rewards.map(x=>rewardCardHtml(x,{
      owned:!!(x.owned||Number(x.quantity)>0),
      quantity:Number(x.quantity||0),
      eligible:x.eligible!==false
    })).join("")||'<div class="reward-vault-empty">Reward pool unavailable.</div>';
  }

  const paint=()=>{
    button.disabled=pending<=0;
    button.textContent=pending>0
      ?("Claim Random Reward · "+pending+" Ready")
      :"No reward draw available yet";
  };
  paint();

  button.addEventListener("click",async()=>{
    if(pending<=0)return;
    const original=button.textContent;
    button.disabled=true;
    button.textContent="Drawing reward…";
    try{
      const draw=await rpc("reader_draw_collectible_v1",{},session.access_token);
      if(draw?.status==="DRAWN"){
        pending=Math.max(0,pending-1);
        if(result){
          result.classList.remove("hidden");
          result.innerHTML=
            '<div class="reward-result-card">'+
            (draw.preview_url||draw.image_url?'<img src="'+esc(draw.preview_url||draw.image_url)+'" alt="">':'')+
            '<div><small>'+esc(draw.rarity||"REWARD")+'</small>'+
            '<strong>'+esc(draw.title||"GENESIS Reward")+'</strong>'+
            '<span>'+esc(String(draw.asset_type||"PICTURE_CARD").replaceAll("_"," "))+'</span></div></div>';
        }
        paint();
      }else{
        pending=0;
        paint();
        if(result){
          result.classList.remove("hidden");
          result.textContent=draw?.status==="NO_ELIGIBLE_COLLECTIBLE"
            ?"Your draw is ready, but no spoiler-safe reward is eligible yet."
            :"No reward draw is currently available.";
        }
      }
    }catch{
      button.disabled=false;
      button.textContent=original;
      if(result){
        result.classList.remove("hidden");
        result.textContent="Reward drawing is not enabled on the live backend yet.";
      }
    }
  });
}

async function initSupport(){
  const notices=[...document.querySelectorAll("#support-status,[data-support-status]")];
  const paintSupportNotice=(html)=>notices.forEach(n=>{n.innerHTML=html});
  await activateSupportContact();

  const params=new URLSearchParams(location.search);
  const paymentReturn=params.get("payment");
  if(paymentReturn==="success"&&notices.length){
    paintSupportNotice('<strong>Payment submitted</strong><span>PayMongo returned you to GENESIS. Advance access is granted only after the signed payment webhook is confirmed.</span>');
  }else if(paymentReturn==="cancelled"&&notices.length){
    paintSupportNotice('<strong>Checkout cancelled</strong><span>No reward is granted for an incomplete PayMongo checkout.</span>');
  }

  try{
    const data=await rpc("api_support_catalog");
    const s=data?.settings||{};
    const providerReady=!!s.payment_provider_enabled;
    const testMode=String(s.payment_provider_mode||"").toUpperCase()==="TEST";
    const testAllowed=Array.isArray(s.test_allowed_rule_keys)?s.test_allowed_rule_keys:[];
    const session=await getSession();
    const user=session?await getAuthUser(session):null;

    if(notices.length&&!paymentReturn){
      const enabled=providerReady&&(!!s.payments_enabled||!!s.pure_support_enabled||!!s.share_rewards_enabled);
      paintSupportNotice('<strong>'+(enabled?(testMode?'PayMongo TEST MODE active':'Secure PayMongo checkout ready'):'PayMongo preparation mode')+'</strong><span>'+
        (enabled
          ?(testMode
            ?'Testing only — no GENESIS live entitlement sales are active. Do not scan a QR Ph test code with a real banking or e-wallet app; use PayMongo\'s test simulation controls.'
            :'Payments are verified server-side before credits, VIP, or Supporter eligibility are granted.')
          :'PayMongo is selected and wired, but collection remains disabled until merchant keys, webhook signing, and test-mode verification pass.')+
        '</span>');
    }

    const startCheckout=async(button,ruleKey,amountPhp=null)=>{
      if(!user||!session){
        location.href=accountPath()+"?next=support";
        return;
      }
      const original=button.textContent;
      button.disabled=true;
      button.textContent="Opening secure checkout…";
      try{
        const result=await edgeFunction("paymongo-create-checkout",{
          rule_key:ruleKey,
          amount_php:amountPhp
        },session.access_token);
        if(!result?.checkout_url)throw new Error("Checkout URL missing");
        location.href=result.checkout_url;
      }catch(e){
        button.disabled=false;
        button.textContent=original;
        if(notices.length)paintSupportNotice('<strong>Checkout unavailable</strong><span>'+esc(String(e.message||e))+'</span>');
      }
    };

    document.querySelectorAll("[data-paymongo-rule]").forEach(button=>{
      const ruleKey=button.dataset.paymongoRule;
      const pure=ruleKey==="PURE_SUPPORT_ANY";
      const featureEnabled=pure?!!s.pure_support_enabled:!!s.payments_enabled;
      const testRuleAllowed=!testMode||testAllowed.includes(ruleKey);
      const ready=providerReady&&featureEnabled&&testRuleAllowed;

      button.disabled=!ready;
      button.textContent=ready
        ?(user
          ?(testMode?(pure?"TEST Give through PayMongo":"TEST Pay with PayMongo"):(pure?"Give through PayMongo":"Pay with PayMongo"))
          :"Sign in to continue")
        :(testMode&&!testRuleAllowed?"Locked until next test phase":"PayMongo not live yet");

      if(pure){
        document.querySelectorAll("#pure-support-amount,[data-pure-support-amount]").forEach(amount=>{amount.disabled=!ready});
      }

      if(ready){
        button.addEventListener("click",()=>{
          const amountInput=pure?(button.closest(".support-mobile-card,.support-system-card")?.querySelector("[data-pure-support-amount],#pure-support-amount")||document.querySelector("#pure-support-amount,[data-pure-support-amount]")):null;
          const amount=pure?Number(amountInput?.value||0):null;
          if(pure&&(!Number.isFinite(amount)||amount<1)){
            if(notices.length)paintSupportNotice('<strong>Enter an amount</strong><span>Pure support starts at ₱1 and grants no Advance Parts or VIP.</span>');
            return;
          }
          startCheckout(button,ruleKey,amount);
        });
      }
    });
  }catch(e){
    if(notices.length&&!paymentReturn){
      paintSupportNotice('<strong>Support status unavailable</strong><span>Payment collection remains closed.</span>');
    }
  }
}
