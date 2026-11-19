/* Penerap tampilan hasil editor. Dipakai editor & (opsional) index.html */
(function(){
if(/[?&]reset-ui/.test(location.search)){try{const d=JSON.parse(localStorage.getItem("alcrazhyCommunity")||"{}");delete d.ui;localStorage.setItem("alcrazhyCommunity",JSON.stringify(d))}catch(e){}location.replace(location.pathname);return}
// [kunci, nama, selector, teks?(fill=warna teks), bisa diedit teksnya?]
const T=[["name","Nama","#communityName",1,1],["handle","Handle","#communityHandle",1,1],["bio","Bio","#communityBio",1,1],
["btn1","Tombol Lihat Konten",".primary-btn",0,1],["btn2","Tombol Bagikan","#shareButton",0,1],
["avatar","Avatar",".avatar-wrap",0,0],["cover","Banner","#coverImage",0,0],["card","Card Profil",".profile-card",0,0],
["heading","Kotak Judul",".profile-heading",0,0],["tabs","Tab Menu",".tabs",0,0],["top","Topbar",".topbar",0,0],["bottom","Menu Bawah",".bottom-nav",0,0]];
window.UI_TARGETS=T;
window.uiDirty=l=>!!l&&!!(l.x||l.y||l.w||l.h||l.rot||l.skew||l.scale!=100||l.opacity!=100||l.blend!="normal"||l.bw||l.sh||l.fill||l.text||l.hide);
window.applyUI=function(doc,ui,only){
  Object.keys(ui||{}).forEach(k=>{
    if(only&&only!==k)return;
    const l=ui[k],e=l&&l.sel&&doc.querySelector(l.sel);if(!e||e===doc.body||e===doc.documentElement||e.matches("main,.page"))return;
    const tc=l.tc;
    e.style.width=l.w?l.w+"px":"";
    e.style.height=l.h?l.h+"px":"";
    if(l.w||l.h)e.style.maxWidth="none";
    e.style.transform=(l.x||l.y||l.rot||l.skew||l.scale!=100)?`translate(${l.x}px,${l.y}px) rotate(${l.rot}deg) skewX(${l.skew}deg) scale(${l.scale/100})`:"";
    e.style.opacity=l.opacity!=100?l.opacity/100:"";
    e.style.mixBlendMode=l.blend!="normal"?l.blend:"";
    e.style.border=l.bw?`${l.bw}px solid ${l.bc}`:"";
    e.style.boxShadow=l.sh?`0 ${l.sh/2}px ${l.sh}px rgba(0,0,0,.65)`:"";
    e.style.display=l.hide?"none":"";
    if(tc)e.style.color=l.fill||"";
    else if(l.fill)e.style.backgroundColor=l.fill;
    if(l.text)e.textContent=l.text;
  });
};
// Otomatis jalan di halaman utama (jika <script src="tampilan.js"> dipasang di index.html)
if(window.parent===window&&document.getElementById("mainBody")){
  try{applyUI(document,(JSON.parse(localStorage.getItem("alcrazhyCommunity")||"{}")).ui)}catch(e){}
}
})();
