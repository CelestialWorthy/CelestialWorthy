const $=s=>document.querySelector(s);
let D=JSON.parse(localStorage.getItem("alcrazhyCommunity")||"{}");
const DUR=10,PX=60;
const B={x:0,y:0,w:0,h:0,scale:100,rot:0,skew:0,opacity:100,blend:"normal",bw:0,bc:"#ffffff",sh:0,start:0,dur:DUR};
let layers=[{id:"profile",type:"profile",name:"Card Profil",...B,...(D.profileFx||{})},...(D.layers||[])];
let sel="profile",t=0,playing=false,prev=0,uid=Date.now();
let mode="kartu";const ui={},list=()=>mode==="kartu"?layers:Object.values(ui);
const cur=()=>list().find(l=>l.id===sel);
const fmt=s=>Math.floor(s/60)+":"+(s%60).toFixed(1).padStart(4,"0");
const COLORS=["#ff3b30","#ff9500","#ffcc00","#34c759","#00c7be","#007aff","#af52de","#ffffff","#8e8e93","#000000","#10b981","#d7b46a"];

/* ---------- render kanvas ---------- */
function elOf(l){
  if(l.type==="profile")return $("#profile");
  let e=document.getElementById("L"+l.id);
  if(!e){e=document.createElement("div");e.id="L"+l.id;e.className="lyr";e.dataset.id=l.id;$("#stage").appendChild(e)}
  return e;
}
function paint(l){
  if(l.sel)return paintUI(l);
  const e=elOf(l),ex=l.type!=="profile";
  const idx=layers.indexOf(l);
  e.style.zIndex=idx>=0?(layers.length-idx):1;
  e.style.display=(t>=l.start&&t<=l.start+l.dur)?"":"none";
  e.style.transform=(ex?"translate(-50%,-50%) ":"")+`translate(${l.x}px,${l.y}px) rotate(${l.rot}deg) skewX(${l.skew}deg) scale(${l.scale/100})`;
  e.style.opacity=l.opacity/100;e.style.mixBlendMode=l.blend;
  e.style.border=l.bw?`${l.bw}px solid ${l.bc}`:"";
  e.style.boxShadow=l.sh?`0 ${l.sh/2}px ${l.sh}px rgba(0,0,0,.65)`:"";
  e.classList.toggle("sel",l.id===sel);
  if(l.type==="profile"){e.style.background=l.fill||"";return}
  e.style.position="absolute";e.style.left="50%";e.style.top="50%";
  if(l.type==="square"||l.type==="circle"){e.style.width=(l.w||120)+"px";e.style.height=(l.h||120)+"px";e.style.background=l.fill||"#27e0a0";e.style.borderRadius=l.type==="circle"?"50%":"8px"}
  if(l.type==="text"){e.textContent=l.text;e.style.color=l.fill||"#fff";e.style.font="700 28px 'Space Grotesk'";e.style.whiteSpace="nowrap"}
  if(l.type==="image"){e.style.width=(l.w||140)+"px";e.style.height=(l.h||140)+"px";e.style.background=`center/contain no-repeat url("${l.src}")`}
}
function loadProfile(){
  $("#pName").textContent=D.name||"Eternal Heaven";
  $("#pHandle").textContent=D.handle||"@veyrath.halgion";
  $("#pBio").textContent=D.bio||"Marga Veyrath Halgion membawa beban tradisi ribuan tahun...";
  $("#pAvatar").src=D.avatar||"https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=300&h=300&fit=crop";
  if(D.banner)$("#pBanner").style.backgroundImage=`url("${D.banner}")`;
}
function paintAll(){layers.forEach(paint);$("#cnt").textContent=layers.length+" layer"}

/* ---------- urutkan layer (atas = depan, bawah = belakang) ---------- */
function applyOrderData(id,toIdx,rebuild){
  if(mode==="kartu"){
    const from=layers.findIndex(x=>x.id===id);
    if(from<0)return false;
    const clamped=Math.max(0,Math.min(layers.length-1,toIdx));
    if(from===clamped)return false;
    const [item]=layers.splice(from,1);
    layers.splice(clamped,0,item);
    paintAll();
    if(rebuild)buildTimeline();
    return true;
  }else{
    const keys=Object.keys(ui);
    const from=keys.indexOf(id);
    if(from<0)return false;
    const clamped=Math.max(0,Math.min(keys.length-1,toIdx));
    if(from===clamped)return false;
    const [k]=keys.splice(from,1);
    keys.splice(clamped,0,k);
    const next={};
    keys.forEach((key,i)=>{
      next[key]=ui[key];
      if(fd){const el=fd.querySelector(ui[key].sel);if(el)el.style.zIndex=keys.length-i}
    });
    Object.keys(ui).forEach(key=>delete ui[key]);
    Object.assign(ui,next);
    buildChips();
    if(rebuild)buildTimeline();
    return true;
  }
}
function moveLayerOrder(id,toIdx){applyOrderData(id,toIdx,true)}
function shiftLayer(dir){
  const l=cur();
  if(!l)return;
  const arr=mode==="kartu"?layers:Object.values(ui);
  const idx=arr.indexOf(l);
  moveLayerOrder(l.id,idx+dir);
  if($("#sheet").classList.contains("on"))sheet("edit");
}

/* ---------- timeline / daftar layer ---------- */
function clipRowHtml(l,i,isCard){
  const icon=isCard?{profile:"👁",square:"⬛",circle:"⚫",text:"Aa",image:"🖼"}[l.type]:(l.hide?"🚫 ":"◻ ");
  const posStyle=isCard?`left:${l.start*PX}px;width:${l.dur*PX}px;top:${6+i*34}px`:`left:8px;width:calc(100% - 16px);top:${6+i*34}px`;
  return `<div class="clip ${l.id===sel?"sel":""}" data-id="${l.id}" style="${posStyle};touch-action:pan-y;transition:top .12s ease">${icon} ${l.name}</div>`;
}
function buildTimeline(){
  if(mode==="kartu"){
    const w=DUR*PX;$("#tlin").style.width=w+60+"px";
    $("#ruler").style.display="";$("#head").style.display="";
    let h="";
    for(let i=0;i<=DUR*2;i++){const h2=i%2;h+=`<div class="tick ${h2?"h":""}" style="left:${i*PX/2}px">${h2?"":fmt(i/2).replace(".0","")}</div>`}
    $("#ruler").innerHTML=h;
    $("#tracks").style.height=layers.length*34+12+"px";
    $("#tracks").innerHTML=layers.map((l,i)=>clipRowHtml(l,i,true)).join("");
    moveHead();
  }else{
    const items=Object.values(ui);
    const w=Math.max(260,$("#tl").clientWidth-16);
    $("#tlin").style.width=w+"px";
    $("#ruler").style.display="none";$("#head").style.display="none";
    $("#tracks").style.height=items.length*34+12+"px";
    $("#tracks").innerHTML=items.map((l,i)=>clipRowHtml(l,i,false)).join("");
  }
}
function moveHead(){$("#head").style.left=t*PX+"px";$("#tNow").textContent=fmt(t)}
function seek(x){const r=$("#ruler").getBoundingClientRect();t=Math.max(0,Math.min(DUR,(x-r.left)/PX));moveHead();layers.forEach(paint)}
$("#ruler").addEventListener("pointerdown",e=>{$("#ruler").setPointerCapture(e.pointerId);seek(e.clientX);playing=false;$("#playBtn").textContent="▶"});
$("#ruler").addEventListener("pointermove",e=>{if(e.buttons)seek(e.clientX)});

/* Geser langsung = scroll daftar / geser waktu | Tahan lalu tarik = tempatkan layer mulus */
function bindTrackDrag(){
  const tracksEl=$("#tracks"),tl=$("#tl");
  const items=()=>mode==="kartu"?layers:Object.values(ui);

  const startDrag=(targetClip,sx,sy)=>{
    const id=targetClip.dataset.id;
    const s0=list().find(x=>x.id===id)?.start||0;
    let armed=false,moved=false,timeMode=false,activeEl=targetClip,originTop=0,baseIndex=0;

    const setActiveSelectionOnly=(targetId)=>{
      sel=targetId;
      tracksEl.querySelectorAll(".clip").forEach(el=>el.classList.toggle("sel",el.dataset.id===sel));
      list().forEach(paint);
      if(mode!=="kartu")buildChips();
    };

    const syncOtherRows=()=>{
      const arr=items();
      arr.forEach((item,idx)=>{
        if(item.id===id)return;
        const rowEl=tracksEl.querySelector(`.clip[data-id="${item.id}"]`);
        if(rowEl)rowEl.style.top=(6+idx*34)+"px";
      });
    };

    const timer=setTimeout(()=>{
      if(moved||timeMode)return;
      armed=true;
      setActiveSelectionOnly(id);
      activeEl=tracksEl.querySelector(`.clip[data-id="${id}"]`)||targetClip;
      baseIndex=items().findIndex(x=>x.id===id);
      originTop=6+baseIndex*34;
      tl.style.overflow="hidden";
      tracksEl.style.touchAction="none";
      tracksEl.querySelectorAll(".clip").forEach(el=>{el.style.touchAction="none"});
      if(navigator.vibrate)navigator.vibrate(20);
      activeEl.style.transition="none";
      activeEl.style.outline="2px solid var(--ac)";
      activeEl.style.boxShadow="0 8px 20px rgba(0,0,0,.6)";
      activeEl.style.zIndex="9";
      activeEl.style.transform="translateY(0px) scale(1.02)";
    },220);

    const onMove=(cx,cy,ev)=>{
      const dx=cx-sx,dy=cy-sy;
      if(!armed){
        if(Math.abs(dy)>8){
          moved=true;
          clearTimeout(timer);
          return;
        }
        if(mode==="kartu"&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){
          timeMode=true;
          clearTimeout(timer);
          setActiveSelectionOnly(id);
        }
      }
      if(armed&&activeEl){
        if(ev&&ev.cancelable)ev.preventDefault();
        const maxTop=(items().length-1)*34+6;
        const clampedTop=Math.max(0,Math.min(maxTop,originTop+dy));
        activeEl.style.transform=`translateY(${clampedTop-originTop}px) scale(1.02)`;
        const targetRow=Math.max(0,Math.min(items().length-1,Math.round((clampedTop-6)/34)));
        if(targetRow!==items().findIndex(x=>x.id===id)){
          if(applyOrderData(id,targetRow,false))syncOtherRows();
        }
      }else if(timeMode){
        const l=items().find(x=>x.id===id),cl=tracksEl.querySelector(`.clip[data-id="${id}"]`);
        if(l&&cl){
          l.start=Math.max(0,Math.min(DUR-l.dur,+(s0+dx/PX).toFixed(1)));
          cl.style.left=l.start*PX+"px";
          paint(l);
        }
      }
    };

    const cleanup=()=>{
      clearTimeout(timer);
      tl.style.overflow="auto";
      tracksEl.style.touchAction="";
      window.removeEventListener("pointermove",pmv);
      window.removeEventListener("pointerup",pup);
      window.removeEventListener("pointercancel",pup);
      window.removeEventListener("touchmove",tmv);
      window.removeEventListener("touchend",tup);
      window.removeEventListener("touchcancel",tup);
    };

    const finish=()=>{
      const wasArmed=armed,wasMoved=moved,wasTime=timeMode;
      cleanup();
      if(wasArmed){
        buildTimeline();
      }else if(!wasMoved&&!wasTime){
        select(id);
      }
    };

    const pmv=ev=>onMove(ev.clientX,ev.clientY,ev);
    const pup=()=>finish();
    const tmv=ev=>{if(ev.touches&&ev.touches[0])onMove(ev.touches[0].clientX,ev.touches[0].clientY,ev)};
    const tup=()=>finish();

    window.addEventListener("pointermove",pmv,{passive:false});
    window.addEventListener("pointerup",pup);
    window.addEventListener("pointercancel",pup);
    window.addEventListener("touchmove",tmv,{passive:false});
    window.addEventListener("touchend",tup);
    window.addEventListener("touchcancel",tup);
  };

  tracksEl.addEventListener("pointerdown",e=>{
    if(e.pointerType==="touch")return;
    const c=e.target.closest(".clip");if(!c)return;
    startDrag(c,e.clientX,e.clientY);
  });

  tracksEl.addEventListener("touchstart",e=>{
    const c=e.target.closest(".clip");if(!c||!e.touches||!e.touches[0])return;
    startDrag(c,e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});
}
bindTrackDrag();
function togglePlay(){playing=!playing;$("#playBtn").textContent=playing?"⏸":"▶";if(playing){if(t>=DUR)t=0;prev=performance.now();requestAnimationFrame(tick)}}
function tick(n){if(!playing)return;t=Math.min(DUR,t+(n-prev)/1000);prev=n;moveHead();layers.forEach(paint);
  const tl=$("#tl"),x=t*PX;if(x>tl.scrollLeft+tl.clientWidth-30)tl.scrollLeft=x-30;
  if(t>=DUR){playing=false;$("#playBtn").textContent="▶"}else requestAnimationFrame(tick)}

/* ---------- pilih & geser di kanvas ---------- */
function select(id){if(sel===id)return;sel=id;list().forEach(paint);buildTimeline();if(mode!=="kartu")buildChips()}
$("#stage").addEventListener("pointerdown",e=>{
  const n=e.target.closest(".lyr");if(!n){return}
  select(n.dataset.id);const l=cur(),sx=e.clientX,sy=e.clientY,x0=l.x,y0=l.y;
  n.setPointerCapture(e.pointerId);
  const mv=ev=>{l.x=Math.round(x0+ev.clientX-sx);l.y=Math.round(y0+ev.clientY-sy);paint(l)};
  n.addEventListener("pointermove",mv);n.addEventListener("pointerup",()=>n.removeEventListener("pointermove",mv),{once:true});
});

/* ---------- sheet properti ---------- */
const SL={move:["Move & Transform",[["x","Geser X",-250,250,"px"],["y","Geser Y",-400,400,"px"],["w","Lebar (0=asli)",0,420,"px"],["h","Tinggi (0=asli)",0,500,"px"],["scale","Skala",20,200,"%"],["rot","Rotasi",-180,180,"°"],["skew","Kemiringan",-45,45,"°"]]],
 border:["Border & Bayangan",[["bw","Tebal Border",0,12,"px"],["sh","Bayangan",0,40,"px"]]],
 blend:["Blending & Opacity",[["opacity","Opacity",0,100,"%"]]]};
function orderControls(l){
  const arr=mode==="kartu"?layers:Object.values(ui);
  const idx=arr.indexOf(l);
  return `<label>Urutan Layer (Atas = Depan, Bawah = Belakang)<span>#${idx+1} dari ${arr.length}</span></label><div style="display:flex;gap:8px;margin-top:4px"><button type="button" class="up" style="margin-top:0;flex:1" onclick="shiftLayer(-1)">↑ Naikkan (Ke Depan)</button><button type="button" class="up" style="margin-top:0;flex:1" onclick="shiftLayer(1)">↓ Turunkan (Ke Belakang)</button></div>`;
}
function sheet(k){
  const s=$("#sheet"),l=cur();let h="";
  const head=t=>`<div class="sh-h"><span>${t}</span><button onclick="closeSheet()">✕</button></div>`;
  if(k==="add")h=head("Tambah Elemen")+`<div class="grid"><button onclick="addLayer('square')"><span>⬛</span>Persegi</button><button onclick="addLayer('circle')"><span>⚫</span>Lingkaran</button><button onclick="addLayer('text')"><span>Aa</span>Teks</button><button onclick="pickImage(addImage)"><span>🖼</span>Gambar</button></div>`;
  else if(SL[k]){h=head(SL[k][0])+SL[k][1].map(([p,n,a,b,u])=>`<label>${n}<span id="v_${p}">${l[p]||0}${u}</span></label><input type="range" min="${a}" max="${b}" value="${l[p]||0}" oninput="setP('${p}',this.value,'${u}')">`).join("");
    if(k==="border")h+=`<label>Warna Border</label><input type="color" value="${l.bc}" oninput="setP('bc',this.value,'',1)" style="width:100%;height:40px;background:none;border:0">`;
    if(k==="blend")h+=`<label>Mode Blending</label><select onchange="setP('blend',this.value,'',1)">${["normal","multiply","screen","overlay","darken","lighten","difference"].map(m=>`<option ${l.blend===m?"selected":""}>${m}</option>`).join("")}</select>`}
  else if(k==="fill")h=head("Color & Fill")+`<div class="sw">${COLORS.map(c=>`<div style="background:${c}" onclick="setP('fill','${c}','',1)"></div>`).join("")}<div style="display:grid;place-items:center;color:#8f97a6" onclick="setP('fill','','',1)">✕</div></div><label>Warna kustom</label><input type="color" oninput="setP('fill',this.value,'',1)" style="width:100%;height:40px;background:none;border:0">`;
  else if(k==="edit"){
    if(l.sel)h=head("Edit "+l.name)+orderControls(l)+(l.ed?`<label>Teks</label><input type="text" value="${(l.text||l.orig||"").replace(/"/g,"&quot;")}" oninput="cur().text=this.value;paint(cur())">`:`<p style="color:var(--mu);font-size:13px">Elemen ini tidak punya teks. Pakai Move & Transform, Fill, atau Border.</p>`);
    else if(l.type==="profile")h=head("Edit Card Profil")+orderControls(l)+`<label>Nama</label><input type="text" value="${D.name||""}" oninput="D.name=this.value;loadProfile()"><label>Handle</label><input type="text" value="${D.handle||""}" oninput="D.handle=this.value;loadProfile()"><label>Bio</label><textarea rows="3" oninput="D.bio=this.value;loadProfile()">${D.bio||""}</textarea><button class="up" onclick="pickImage(d=>{D.banner=d;loadProfile()})">📁 Ganti Banner</button><button class="up" onclick="pickImage(d=>{D.avatar=d;loadProfile()})">📁 Ganti Avatar</button>`;
    else if(l.type==="text")h=head("Edit Teks")+orderControls(l)+`<input type="text" value="${l.text}" oninput="cur().text=this.value;cur().name=this.value;paint(cur())">`;
    else if(l.type==="image")h=head("Edit Gambar")+orderControls(l)+`<button class="up" onclick="pickImage(d=>{cur().src=d;paint(cur())})">📁 Ganti Gambar</button>`;
    else h=head("Edit Bentuk")+orderControls(l)+`<p style="color:var(--mu);font-size:13px">Ubah warna lewat Color &amp; Fill.</p>`}
  s.innerHTML=h;s.classList.add("on");
}
function closeSheet(){$("#sheet").classList.remove("on")}
function setP(p,v,u,raw){const l=cur();l[p]=raw?v:+v;const o=$("#v_"+p);if(o)o.textContent=v+u;paint(l)}

/* ---------- aksi layer ---------- */
function addLayer(type){
  const l={id:"n"+(++uid),type,name:{square:"Persegi",circle:"Lingkaran",text:"Teks Baru"}[type],...B,text:"Teks Baru"};
  layers.unshift(l);sel=l.id;closeSheet();paintAll();buildTimeline();
}
function addImage(d){const l={id:"n"+(++uid),type:"image",name:"Gambar",...B,src:d};layers.unshift(l);sel=l.id;closeSheet();paintAll();buildTimeline()}
function dupLayer(){const l=cur();if(l.sel){Object.assign(l,{...B,fill:"",text:"",hide:false});paint(l);return}if(l.type==="profile")return;const idx=layers.indexOf(l);const c={...l,id:"n"+(++uid),x:l.x+20,y:l.y+20};layers.splice(idx,0,c);sel=c.id;paintAll();buildTimeline()}
function delLayer(){
  const l=cur();if(l.sel){l.hide=!l.hide;paint(l);buildChips();buildTimeline();return}if(l.type==="profile"){alert("Card Profil tidak bisa dihapus.");return}
  elOf(l).remove();layers=layers.filter(x=>x!==l);sel="profile";paintAll();buildTimeline();
}
function pickImage(cb){const f=$("#file");f.value="";f.onchange=()=>{const r=new FileReader();r.onload=()=>cb(r.result);f.files[0]&&r.readAsDataURL(f.files[0])};f.click()}
$("#stage").addEventListener("click",e=>{if(e.target.id==="stage")closeSheet()});

function saveProject(){
  const p=layers.find(x=>x.type==="profile")||layers[0],fx={};Object.keys(B).forEach(k=>fx[k]=p[k]);fx.fill=p.fill;
  D.profileFx=fx;D.layers=layers.filter(x=>x.id!==p.id);D.ui={};Object.values(ui).forEach(l=>{if(uiDirty(l)){const{orig,...o}=l;D.ui[l.id]=o}});
  try{localStorage.setItem("alcrazhyCommunity",JSON.stringify(D))}catch(e){alert("Penyimpanan penuh, coba gambar yang lebih kecil.");return}
  alert("Perubahan berhasil disimpan!");location.href="index.html";
}
loadProfile();paintAll();buildTimeline();
/* ---------- mode Halaman Utama ---------- */
const HAS=typeof UI_TARGETS!=="undefined";
let fd=null;
HAS&&UI_TARGETS.forEach(([k,n,s,tc,ed])=>{ui[k]={id:k,sel:s,name:n,tc,ed,...B,fill:"",text:"",hide:false,...((D.ui&&D.ui[k])||{})}});
HAS&&Object.entries(D.ui||{}).forEach(([k,v])=>{if(!ui[k]&&v&&v.sel)ui[k]={...B,fill:"",text:"",hide:false,...v}});
function paintUI(l){
  if(!fd)return;const e=fd.querySelector(l.sel);if(!e)return;
  if(l.ed&&!l.text&&l.orig!=null)e.textContent=l.orig;
  applyUI(fd,{[l.id]:{...l,hide:false,opacity:l.hide?20:l.opacity}},l.id);
  e.classList.toggle("ui-sel",l.id===sel);
}
function buildChips(){$("#chips").innerHTML=`<button onclick="selParent()">⬆ Induk</button>`+Object.values(ui).map(l=>`<button class="${l.id===sel?"sel":""}" onclick="select('${l.id}')">${l.hide?"🚫 ":""}${l.name}</button>`).join("")}
function cssPath(el){
  const p=[];let anchored=false;
  while(el&&el.nodeType===1&&el!==fd.body){
    if(el.id){p.unshift("#"+CSS.escape(el.id));anchored=true;break}
    let i=1,s=el;while((s=s.previousElementSibling))i++;
    p.unshift(el.tagName.toLowerCase()+":nth-child("+i+")");el=el.parentElement;
  }
  return (anchored?"":"body>")+p.join(">");
}
function mkDyn(el){
  const sel=cssPath(el),id="d"+Math.abs([...sel].reduce((a,c)=>(a*31+c.charCodeAt(0))|0,7));
  if(ui[id])return ui[id];
  const leaf=!el.children.length&&el.textContent.trim().length>0;
  const nm=el.tagName.toLowerCase()+(el.classList[0]?"."+el.classList[0]:"");
  return ui[id]={id,sel,name:nm,tc:leaf?1:0,ed:leaf?1:0,dyn:1,orig:leaf?el.textContent:null,...B,fill:"",text:"",hide:false};
}
function selParent(){
  const l=cur();if(!l||!fd)return;
  const e=fd.querySelector(l.sel),p=e&&e.parentElement;if(!p||p===fd.body)return;
  select((Object.values(ui).find(u=>fd.querySelector(u.sel)===p)||mkDyn(p)).id);
}
function fit(){
  const p=$("#pstage"),f=$("#frame"),W=Math.max(360,Math.min(innerWidth,430)),s=p.clientWidth/W;
  f.style.width=W+"px";
  f.style.height=p.clientHeight/s+"px";
  let H=p.clientHeight/s;
  try{H=Math.max(H,fd.documentElement.scrollHeight)}catch(e){}
  f.style.height=H+"px";
  f.style.transform=`scale(${s})`;
  $("#fw").style.height=H*s+"px";
}
$("#frame").onload=()=>{
  try{fd=$("#frame").contentDocument;fd.body}catch(e){fd=null}
  if(!fd){alert("Halaman utama tidak bisa dimuat di editor. Buka editor lewat hosting (GitHub Pages), bukan file lokal.");return}
  const st=fd.createElement("style");st.textContent=".ui-sel{outline:2px solid #27e0a0!important;outline-offset:2px}";fd.head.appendChild(st);
  Object.values(ui).forEach(l=>{const e=fd.querySelector(l.sel);if(e&&l.ed)l.orig=e.textContent});
  fit();setTimeout(fit,400);
  fd.addEventListener("click",ev=>{if(ev.target.closest("a,button"))ev.preventDefault()},true);
  Object.values(ui).forEach(paint);
  if(mode!=="kartu")buildTimeline();
};
function setMode(m){
  if(!HAS){alert("File tampilan.js belum terunggah di folder yang sama dengan editor.html.");return}
  mode=m;sel=m==="kartu"?"profile":"card";closeSheet();const k=m==="kartu";
  $("#stage").style.display=k?"":"none";$("#pstage").style.display=k?"none":"block";
  $(".play").style.display=k?"":"none";
  $("#tl").style.display="";
  $("#chips").style.display=k?"none":"flex";
  $(".fab").style.display=k?"":"none";$("#mK").classList.toggle("on",k);$("#mH").classList.toggle("on",!k);
  $("#bDup").innerHTML=k?"<i>⧉</i>Duplikat":"<i>↺</i>Reset";$("#bDel").innerHTML=k?"<i>🗑</i>Hapus":"<i>🚫</i>Sembunyikan";
  if(k){paintAll();buildTimeline()}else{fit();buildChips();buildTimeline();list().forEach(paint)}
}
addEventListener("resize",()=>mode!=="kartu"&&fit());

function compressImageFile(file, maxSize, quality, cb) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    const ctx = cv.getContext("2d");
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    cb(cv.toDataURL(mime, quality));
  };
  img.src = url;
}

const avInput = document.getElementById("editAvatarFile");
if (avInput) {
  avInput.addEventListener("change", () => {
    const file = avInput.files[0];
    if (!file) return;
    compressImageFile(file, 360, 0.82, (dataUrl) => {
      data.avatar = dataUrl;
      const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
      saved.avatar = dataUrl;
      localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
      avInput.value = "";
      alert("Avatar diperbarui!");
    });
  });
}

const bnInput = document.getElementById("editBannerFile");
if (bnInput) {
  bnInput.addEventListener("change", () => {
    const file = bnInput.files[0];
    if (!file) return;
    compressImageFile(file, 900, 0.8, (dataUrl) => {
      data.banner = dataUrl;
      const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
      saved.banner = dataUrl;
      localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
      bnInput.value = "";
      alert("Banner diperbarui!");
    });
  });
}

const resetAv = document.getElementById("resetAvatarBtn");
if (resetAv) {
  resetAv.addEventListener("click", () => {
    data.avatar = "";
    const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
    saved.avatar = "";
    localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
    alert("Avatar dikembalikan ke bawaan.");
  });
}

const resetBn = document.getElementById("resetBannerBtn");
if (resetBn) {
  resetBn.addEventListener("click", () => {
    data.banner = "";
    const saved = JSON.parse(localStorage.getItem("alcrazhyCommunity") || "{}");
    saved.banner = "";
    localStorage.setItem("alcrazhyCommunity", JSON.stringify(saved));
    alert("Banner dikembalikan ke bawaan.");
  });
}

// Animasi transisi saat ganti mode, pindah sheet, atau update timeline
const _setMode = setMode;
setMode = function (m) {
  _setMode(m);
  const activeStage = m === "kartu" ? $("#stage") : $("#pstage");
  if (activeStage) {
    activeStage.style.opacity = "0";
    activeStage.style.transform = "scale(0.98)";
    activeStage.style.transition = "opacity 0.25s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)";
    requestAnimationFrame(() => {
      activeStage.style.opacity = "1";
      activeStage.style.transform = "scale(1)";
    });
  }
};

const _buildTimeline = buildTimeline;
buildTimeline = function () {
  _buildTimeline();
  $("#tracks").querySelectorAll(".clip").forEach((el, idx) => {
    el.style.opacity = "0";
    el.style.transitionDelay = `${Math.min(idx, 10) * 25}ms`;
    requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
  });
};

async function adminCommit(saveFn) {
  if (!window.AlcrazhyAuth) {
    alert("Modul firebase-auth.js belum dimuat.");
    return false;
  }
  const loggedIn = await window.AlcrazhyAuth.requireAdminLogin();
  if (!loggedIn) {
    alert("Aksi dibatalkan: harus login admin terlebih dahulu.");
    return false;
  }
  try {
    await saveFn();
    return true;
  } catch (err) {
    alert(err.message || "Gagal menyimpan ke GitHub.");
    return false;
  }
}

setMode("halaman");
