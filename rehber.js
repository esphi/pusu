// PUSU yeni oyuncu rehberi: (1) menü turu — spot ışığı + açıklama kartı, (2) antrenmanda adım adım görevler.
// Durum: localStorage "pusu_rehber" = yeni → oyun → bitti. ?rehber=1 ile baştan başlatılır.
const ls = { al: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, yaz: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
if (new URLSearchParams(location.search).has("rehber")) ls.yaz("pusu_rehber", "yeni");
const ses = (t) => window.PUSU_AKIS?.ses?.(t);
const menuAcik = () => { const m = document.querySelector("#menu"), h = document.querySelector("#hud"); if (!m || (h && !h.hidden)) return false; const cs = getComputedStyle(m); return cs.display !== "none" && cs.visibility !== "hidden"; };
const oyunda = () => { const h = document.querySelector("#hud"); return h && !h.hidden; };
const el = (h) => { const d = document.createElement("div"); d.innerHTML = h.trim(); return d.firstChild; };

// ================= 1) menü turu
const ADIMLAR = [
  { s: "#oynaB", b: "Oyna", t: "Mod ve haritayı seç, oda kur. Oda kodunu arkadaşlarına at, 5v5'e kadar birlikte oynayın." },
  { s: "#kodF", b: "Arkadaşının odası", t: "Arkadaşın oda kurduysa kodunu buraya yaz ve Katıl'a bas." },
  { s: "#menu header.ub nav button[data-u=env]", b: "Envanter", t: "Silah skinlerin, bıçakların, eldivenlerin ve karakterlerin burada. Kuşanmak için tıkla." },
  { s: "#menu header.ub nav button[data-u=kasa]", b: "Kasalar", t: "Maçlardan kazandığın pullarla kasa aç; şansın varsa destan bir skin düşer." },
  { s: "#menu .anGv", b: "Görevler", t: "Görevleri bitirdikçe seviye atlarsın. İlerlemen hesabına kaydedilir." },
  { s: "#antr", b: "Hazırsan başlayalım", t: "Botlara karşı kısa bir antrenmanda temel hareketleri birlikte deneyelim.", son: 1 },
];
let tur = null;
const turBaslat = () => {
  if (tur) return;
  const isik = el('<div class="rh-isik"></div>'), kart = el('<div class="rh-kart" role="dialog" aria-live="polite"></div>'), tik = el('<div class="rh-tikla"></div>');
  document.body.append(tik, isik, kart);
  let i = 0;
  const kapat = (durum) => { ls.yaz("pusu_rehber", durum); isik.classList.add("rh-cik"); kart.classList.add("rh-cik"); setTimeout(() => { isik.remove(); kart.remove(); tik.remove(); tur = null; }, 380); removeEventListener("resize", yerlestir); };
  const yerlestir = () => {
    const a = ADIMLAR[i], hedef = document.querySelector(a.s);
    if (!hedef) { if (++i >= ADIMLAR.length) return kapat("oyun"); return yerlestir(); }
    const r = hedef.getBoundingClientRect(), pay = 8;
    Object.assign(isik.style, { left: r.left - pay + "px", top: r.top - pay + "px", width: r.width + pay * 2 + "px", height: r.height + pay * 2 + "px" });
    kart.innerHTML = `<div class="rh-ust"><span>${i + 1} / ${ADIMLAR.length}</span><button class="rh-atla" data-is="atla">Turu geç</button></div>
      <b>${a.b}</b><p>${a.t}</p>
      <div class="rh-nokta">${ADIMLAR.map((_, k) => `<i class="${k === i ? "on" : k < i ? "gec" : ""}"></i>`).join("")}</div>
      <div class="rh-dug">${i ? '<button data-is="geri">Geri</button>' : ""}${a.son ? '<button data-is="sonra">Sonra</button><button class="ana" data-is="antr">Antrenmana git</button>' : '<button class="ana" data-is="ileri">İleri</button>'}</div>`;
    const kw = 330, sag = r.right + 18 + kw < innerWidth, x = sag ? r.right + 18 : Math.max(16, r.left - kw - 18), y = Math.min(Math.max(16, r.top), innerHeight - kart.offsetHeight - 16);
    Object.assign(kart.style, { left: x + "px", top: y + "px" });
    kart.dataset.yon = sag ? "sag" : "sol";
    kart.classList.remove("rh-gir"); void kart.offsetWidth; kart.classList.add("rh-gir");
  };
  kart.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-is]"); if (!b) return;
    const is = b.dataset.is;
    if (is === "ileri") { i++; yerlestir(); } else if (is === "geri") { i = Math.max(0, i - 1); yerlestir(); }
    else if (is === "atla" || is === "sonra") kapat(is === "sonra" ? "oyun" : "bitti");
    else if (is === "antr") { kapat("oyun"); setTimeout(() => document.querySelector("#antr")?.click(), 120); }
  });
  // arka plana tıklama turu ilerletir; hedefin kendisine tıklamak serbest
  tik.addEventListener("click", () => { if (!ADIMLAR[i].son) { i++; ses("tik"); yerlestir(); } });
  addEventListener("resize", yerlestir);
  tur = { yerlestir };
  requestAnimationFrame(() => { isik.classList.add("rh-gor"); yerlestir(); });
};

// ================= 2) antrenman görevleri
const GOREV = [
  { id: "bak", t: "Fareyle etrafına bak", k: "Fare" },
  { id: "yuru", t: "Yürü", k: "W A S D" },
  { id: "zipla", t: "Zıpla", k: "Boşluk" },
  { id: "egil", t: "Eğil", k: "Ctrl" },
  { id: "ates", t: "Ateş et (5 kez)", k: "Sol tık" },
  { id: "sarjor", t: "Şarjör değiştir", k: "R" },
  { id: "silah", t: "Silah değiştir", k: "1 · 2 · 3" },
  { id: "satin", t: "Satın alma menüsünü aç", k: "B" },
  { id: "les", t: "Bir botu vur", k: "" },
];
let pano = null;
const sayac = { bak: 0, yuru: 0, ates: 0, silah: new Set(), lesBas: null };
const bitti = new Set();
const isaretle = (id) => {
  if (bitti.has(id) || !pano) return; bitti.add(id); ses("tiklat");
  const sat = pano.querySelector(`[data-g="${id}"]`); sat?.classList.add("tamam");
  pano.querySelector(".rh-cubuk i").style.width = (bitti.size / GOREV.length) * 100 + "%";
  pano.querySelector(".rh-say").textContent = `${bitti.size} / ${GOREV.length}`;
  const sira = GOREV.find((g) => !bitti.has(g.id)); pano.querySelectorAll(".rh-g").forEach((s) => s.classList.toggle("simdi", s.dataset.g === sira?.id));
  if (bitti.size === GOREV.length) setTimeout(final, 700);
};
const final = () => {
  ls.yaz("pusu_rehber", "bitti");
  pano?.classList.add("rh-cik"); setTimeout(() => { pano?.remove(); pano = null; }, 400);
  const k = el(`<div class="rh-final"><div class="rh-rozet">✓</div><b>Hazırsın!</b><p>Temel hareketleri öğrendin. Şimdi bir oda kur, kodu arkadaşlarına at.</p></div>`);
  document.body.append(k); ses("tiklat"); setTimeout(() => k.classList.add("rh-cik"), 4200); setTimeout(() => k.remove(), 4700);
};
const panoKur = () => {
  pano = el(`<div class="rh-pano"><div class="rh-pb"><span>İLK ADIMLAR</span><b class="rh-say">0 / ${GOREV.length}</b><button class="rh-x" title="Rehberi kapat">×</button></div>
    <div class="rh-cubuk"><i></i></div>
    <ul>${GOREV.map((g, i) => `<li class="rh-g${i ? "" : " simdi"}" data-g="${g.id}"><span class="rh-tk"></span><em>${g.t}</em>${g.k ? `<kbd>${g.k}</kbd>` : ""}</li>`).join("")}</ul></div>`);
  pano.querySelector(".rh-x").onclick = () => { ls.yaz("pusu_rehber", "bitti"); pano.remove(); pano = null; };
  document.body.append(pano);
};
// girdi algılama (tuş atamaları varsayılan kabul edilir)
const basili = new Set(); let sonT = performance.now();
addEventListener("keydown", (e) => {
  if (!pano || !oyunda()) return;
  basili.add(e.code);
  if (e.code === "Space") isaretle("zipla");
  if (e.code === "ControlLeft" || e.code === "ControlRight" || e.code === "KeyC") isaretle("egil");
  if (e.code === "KeyR") isaretle("sarjor");
  if (/^Digit[1-5]$/.test(e.code)) { sayac.silah.add(e.code); if (sayac.silah.size >= 2) isaretle("silah"); }
}, true);
addEventListener("keyup", (e) => basili.delete(e.code), true);
addEventListener("mousemove", (e) => { if (pano && document.pointerLockElement) { sayac.bak += Math.abs(e.movementX) + Math.abs(e.movementY); if (sayac.bak > 2500) isaretle("bak"); } }, true);
addEventListener("mousedown", (e) => { if (pano && e.button === 0 && document.pointerLockElement && oyunda()) { if (++sayac.ates >= 5) isaretle("ates"); } }, true);
const lesOku = () => {
  const t = document.querySelector("#talim"); if (t && !t.hidden) { const m = t.innerText.match(/Le[şs]\s*(\d+)/i); if (m) return +m[1]; }
  // talim paneli yoksa (bota karşı 1v1 vb.) leş akışında adımızın geçtiği satırlar
  let ad = ""; try { ad = JSON.parse(localStorage.getItem("pusu.ayar") || "{}").ad || ""; } catch {}
  const ak = document.querySelector("#akis"); if (!ak || !ad) return null;
  return [...ak.children].filter((c) => c.textContent.trim().startsWith(ad)).length;
};

// ================= ana döngü
const dongu = () => {
  const d = ls.al("pusu_rehber"), t = performance.now(), dt = (t - sonT) / 1000; sonT = t;
  if (d === "yeni" && menuAcik() && !tur && !document.querySelector(".perde:not([hidden])") && document.querySelector("#oynaB")) setTimeout(() => ls.al("pusu_rehber") === "yeni" && menuAcik() && turBaslat(), 900);
  if (d === "oyun" && oyunda()) {
    if (!pano) panoKur();
    if (["KeyW", "KeyA", "KeyS", "KeyD"].some((k) => basili.has(k))) { sayac.yuru += dt; if (sayac.yuru > 1.5) isaretle("yuru"); }
    const al = document.querySelector("#alis"); if (al && !al.hidden) isaretle("satin");
    const l = lesOku(); if (l != null) { if (sayac.lesBas == null) sayac.lesBas = l; else if (l > sayac.lesBas) isaretle("les"); }
    pano?.classList.remove("rh-gizli");
  } else pano?.classList.add("rh-gizli");
  setTimeout(dongu, 120);
};
dongu();
