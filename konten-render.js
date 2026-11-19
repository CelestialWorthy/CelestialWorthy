/* Penggambar elemen konten. Dipakai halaman tambah konten & index.html */
(function(){
const P={tri:"polygon(50% 0,100% 100%,0 100%)",star:"polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",arrow:"polygon(0 30%,60% 30%,60% 5%,100% 50%,60% 95%,60% 70%,0 70%)",dia:"polygon(50% 0,100% 50%,50% 100%,0 50%)",pent:"polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)",hex:"polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)",plus:"polygon(35% 0,65% 0,65% 35%,100% 35%,100% 65%,65% 65%,65% 100%,35% 100%,35% 65%,0 65%,0 35%,35% 35%)",trap:"polygon(20% 0,80% 0,100% 100%,0 100%)",para:"polygon(25% 0,100% 0,75% 100%,0 100%)"};
window.KB_SHAPES=[["rect","Persegi","◻"],["rectw","Persegi Panjang","▭"],["round","Persegi Radius","▢"],["circle","Lingkaran","●"],["ellipse","Elips","⬭"],["tri","Segitiga","▲"],["star","Bintang","★"],["arrow","Panah","➤"],["dia","Belah Ketupat","◆"],["pent","Segilima","⬠"],["hex","Segienam","⬡"],["plus","Plus","✚"],["trap","Trapesium","⏢"],["para","Jajar Genjang","▱"]];

function escHtml(s){
  return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

window.linkifyText=function(raw){
  const str=String(raw||"");
  const urlRe=/(https?:\/\/[^\s<]+)/gi;
  let out="",last=0,m;
  while((m=urlRe.exec(str))!==null){
    out+=escHtml(str.slice(last,m.index));
    let href=m[0];
    let trail="";
    while(/[.,!?;:)\]]$/.test(href)){
      trail=href.slice(-1)+trail;
      href=href.slice(0,-1);
    }
    if(href){
      out+=`<a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:#27e0a0;text-decoration:underline;pointer-events:auto;word-break:break-all">${escHtml(href)}</a>`;
    }
    out+=escHtml(trail);
    last=urlRe.lastIndex;
  }
  out+=escHtml(str.slice(last));
  return out.replace(/\n/g,"<br>");
};

window.kbNode=function(b){
  const e=document.createElement("div");e.className="kb";e.dataset.id=b.id;e.style.position="absolute";
  e.append(document.createElement("div"),document.createElement("div"));return e;
};
window.kbPaint=function(e,b){
  const s=e.style,i=e.children[0],t=e.children[1];
  s.left=b.x+"px";s.top=b.y+"px";s.width=b.w+"px";s.height=b.h+"px";
  s.transform=`rotate(${b.rot||0}deg)`;
  s.filter=b.sh?`drop-shadow(0 ${b.sh/2}px ${b.sh}px rgba(0,0,0,.6))`:"";
  if(b.t==="image")i.style.cssText=`width:100%;height:100%;background:center/100% 100% no-repeat url("${b.src}");border-radius:${b.r||0}px`;
  else if(b.t==="shape"){
    const k=b.k,rad=(k==="circle"||k==="ellipse")?"border-radius:50%":P[k]?"":`border-radius:${b.r||0}px`;
    i.style.cssText=`width:100%;height:100%;background:${b.fill};${P[k]?"clip-path:"+P[k]+";":""}${rad};${b.bw&&!P[k]?`box-shadow:inset 0 0 0 ${b.bw}px ${b.bc}`:""}`;
  }else i.style.cssText="display:none";
  const hasUrl=/https?:\/\/[^\s<]+/i.test(b.txt||"");
  if(hasUrl)t.innerHTML=window.linkifyText(b.txt||"");
  else t.textContent=b.txt||"";
  t.style.cssText=(b.t==="text"||b.txt)?`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:4px;overflow-wrap:anywhere;pointer-events:${hasUrl?"auto":"none"};color:${b.tc||"#fff"};font:${b.tw||600} ${b.ts||18}px 'DM Sans',sans-serif;transform:skewX(${b.tk||0}deg);text-shadow:${b.tsh?`0 ${b.tsh/2}px ${b.tsh}px rgba(0,0,0,.7)`:"none"};-webkit-text-stroke:${b.tbw||0}px ${b.tbc||"#000"}`:"display:none";
};
function makeFileLink(x){
  const a=document.createElement("a");
  a.href=x.data;
  a.download=x.name;
  a.textContent="📎 "+x.name+" ("+Math.max(1,Math.round(x.size/1024))+" KB)";
  a.style.cssText="display:block;padding:11px 14px;background:#171c26;border:1px solid #252b36;border-radius:10px;color:#f3f5f8;text-decoration:none;font-size:13px";
  return a;
}
window.renderKonten=function(host,c){
  const W=c.cw||360,H=c.ch||400;
  const o=document.createElement("div");o.style.cssText=`position:relative;width:100%;height:0;padding-bottom:${H/W*100}%;overflow:hidden;background:${c.bg||"transparent"};border-radius:12px`;
  const n=document.createElement("div");n.style.cssText=`position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`;
  (c.blocks||[]).forEach(b=>{const e=kbNode(b);kbPaint(e,b);n.appendChild(e)});
  o.appendChild(n);host.appendChild(o);
  const fit=()=>{n.style.transform=`scale(${o.clientWidth/W})`};fit();setTimeout(fit,60);addEventListener("resize",fit);
  if(c.files&&c.files.length){
    let folders=Array.isArray(c.folders)?c.folders:[];
    if(!folders.length){
      try{
        const db=JSON.parse(localStorage.getItem("alcrazhyCommunity")||"{}");
        if(Array.isArray(db.folders))folders=db.folders;
      }catch(e){}
    }
    const f=document.createElement("div");f.style.cssText="margin-top:14px;display:grid;gap:10px";
    folders.forEach(fld=>{
      const items=c.files.filter(x=>x.folderId===fld.id);
      if(!items.length)return;
      const box=document.createElement("div");
      box.style.cssText="background:#12151d;border:1px solid #252b36;border-radius:12px;padding:10px 12px";
      const head=document.createElement("div");
      head.style.cssText="display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;cursor:pointer;color:#f3f5f8";
      head.innerHTML=`<span>📁 ${escHtml(fld.name)}</span><span style="font-size:11px;color:#8f97a6">${items.length} file · ▲</span>`;
      const body=document.createElement("div");
      body.style.cssText="margin-top:8px;display:grid;gap:8px";
      items.forEach(x=>body.appendChild(makeFileLink(x)));
      let open=true;
      head.onclick=()=>{
        open=!open;
        body.style.display=open?"grid":"none";
        head.lastChild.textContent=`${items.length} file · ${open?"▲":"▼"}`;
      };
      box.append(head,body);
      f.appendChild(box);
    });
    const loose=c.files.filter(x=>!x.folderId);
    if(loose.length){
      const lBox=document.createElement("div");
      lBox.style.cssText="display:grid;gap:8px";
      loose.forEach(x=>lBox.appendChild(makeFileLink(x)));
      f.appendChild(lBox);
    }
    host.appendChild(f);
  }
};
})();
