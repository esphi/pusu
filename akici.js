// PUSU akıcılık katmanı: sayfa geçişleri, kayan sekme çizgisi, akan sayılar, arayüz sesleri, menüde paralaks, hesap düğmesi.
// Oyunun kendi kodu değiştirilmez; DOM izlenir ve üstüne davranış eklenir.
const ayar = () => { try { return JSON.parse(localStorage.getItem("pusu.ayar") || "{}") || {}; } catch { return {}; } };
const menuAcik = () => { const m = document.querySelector("#menu"), h = document.querySelector("#hud"); if (!m || m.hidden || (h && !h.hidden)) return false; const cs = getComputedStyle(m); return cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.01; };

// ---------- arayüz sesleri (sentez; dosya yok)
let ax = null;
const sesSev = () => { const a = ayar(); return Math.max(0, Math.min(1, ((a.sesArayuz ?? 60) / 100))); };
const ses = (tur) => {
  const v = sesSev(); if (!v) return;
  try {
    ax ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ax.state === "suspended") ax.resume();
    const t = ax.currentTime, g = ax.createGain(), o = ax.createOscillator(), f = ax.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = tur === "tik" ? 5000 : 3200;
    o.connect(f); f.connect(g); g.connect(ax.destination);
    if (tur === "tik") { o.type = "sine"; o.frequency.setValueAtTime(1900, t); o.frequency.exponentialRampToValueAtTime(1400, t + 0.03); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045); o.start(t); o.stop(t + 0.05); }
    else { o.type = "triangle"; o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.08); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.11 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11); o.start(t); o.stop(t + 0.12);
      const n = ax.createBufferSource(), b = ax.createBuffer(1, ax.sampleRate * 0.03, ax.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); n.buffer = b; const g2 = ax.createGain(); g2.gain.value = 0.05 * v; n.connect(f); n.start(t); }
  } catch {}
};
let sonHover = null;
document.addEventListener("pointerover", (e) => {
  const b = e.target.closest?.("#menu button, #menu .bt, .perde button, #menu nav button, #menu .anT");
  if (b && b !== sonHover && !b.disabled && menuAcik()) { sonHover = b; ses("tik"); }
  if (!b) sonHover = null;
}, { passive: true });
document.addEventListener("pointerdown", (e) => { const b = e.target.closest?.("#menu button, #menu .bt, .perde button"); if (b && !b.disabled) ses("tiklat"); }, { passive: true });

// ---------- kayan sekme çizgisi
const cizgiGuncelle = () => {
  const nav = document.querySelector("#menu header.ub nav"); if (!nav) return;
  let c = nav.querySelector(".akis-cizgi"); if (!c) { c = document.createElement("span"); c.className = "akis-cizgi"; nav.append(c); }
  const on = nav.querySelector("button.on"); if (!on) { c.style.opacity = 0; return; }
  c.style.opacity = 1; c.style.width = on.offsetWidth * 0.6 + "px"; c.style.transform = `translateX(${on.offsetLeft + on.offsetWidth * 0.2}px)`;
};

// ---------- sayfa geçişi: #menu sınıfı (p-ana, p-env...) ya da ana içerik değişince sıralı giriş
let sonSayfa = "", sahneZ = 0;
const sahne = () => { const m = document.querySelector("#menu"); if (!m) return; m.classList.remove("akis-sahne"); void m.offsetWidth; m.classList.add("akis-sahne"); clearTimeout(sahneZ); sahneZ = setTimeout(() => m.classList.remove("akis-sahne"), 900); };

// ---------- akan sayılar (pul): oyun üst çubuğu yeniden çizse de son değerden akar
let sonPul = null, akisT = 0;
const pulAk = (el) => {
  const tn = [...el.childNodes].find((n) => n.nodeType === 3 && /\d/.test(n.nodeValue)); if (!tn) return;
  if (el.dataset.akis === "1") return;
  const yeni = +tn.nodeValue.replace(/[^\d]/g, "") || 0;
  if (sonPul == null || sonPul === yeni) { sonPul = yeni; return; }
  const eski = sonPul; sonPul = yeni; const t0 = performance.now(), sure = 700, id = ++akisT;
  el.classList.add("akis-pul");
  const adim = (t) => { if (id !== akisT) return; const q = Math.min(1, (t - t0) / sure), e = 1 - Math.pow(1 - q, 4); el.dataset.akis = "1"; tn.nodeValue = Math.round(eski + (yeni - eski) * e).toLocaleString("tr-TR"); if (q < 1) requestAnimationFrame(adim); else { el.dataset.akis = ""; setTimeout(() => el.classList.remove("akis-pul"), 300); } };
  requestAnimationFrame(adim);
};

// ---------- hesap düğmesi
const pop = (x, y, html, isler) => {
  document.querySelector(".akis-pop")?.remove();
  const p = document.createElement("div"); p.className = "akis-pop"; p.innerHTML = html; document.body.append(p);
  p.style.top = y + "px"; p.style.left = Math.max(12, x - p.offsetWidth) + "px";
  const kapat = () => { p.remove(); removeEventListener("pointerdown", dis, true); };
  const dis = (e) => { if (!p.contains(e.target)) kapat(); };
  setTimeout(() => addEventListener("pointerdown", dis, true));
  p.addEventListener("click", (e) => { const b = e.target.closest("button[data-is]"); if (!b) return; kapat(); isler[b.dataset.is]?.(); });
};
const hesapDugme = () => {
  const ubS = document.querySelector("#menu header.ub .ubS"); if (!ubS || ubS.querySelector(".akis-hesap")) return;
  const H = window.PUSU_HESAP; if (!H) return;
  const b = document.createElement("button"); b.type = "button"; b.className = "akis-hesap" + (H.misafir ? " misafir" : "");
  b.innerHTML = `<i></i>${H.misafir ? "Misafir" : "Hesap"}`;
  b.onclick = (e) => {
    const r = b.getBoundingClientRect();
    if (H.misafir) pop(r.right, r.bottom + 8, `<b>Misafir oynuyorsun</b><small>İlerlemen yalnızca bu tarayıcıda. Hesap açarsan her cihazdan devam edersin; yeni hesap sıfırdan başlar.</small><div class="akis-pb"><button data-is="vaz">Vazgeç</button><button class="ana" data-is="ac">Hesap aç</button></div>`,
      { ac: () => { localStorage.removeItem("pusu_misafir"); location.reload(); } });
    else pop(r.right, r.bottom + 8, `<b>${String(H.ad || "").replace(/[<>&"]/g, "")}</b><small>İlerlemen hesabına kaydediliyor.</small><div class="akis-pb"><button data-is="vaz">Kapat</button><button class="ana" data-is="cik">Çıkış yap</button></div>`,
      { cik: () => H.cikis() });
  };
  ubS.insertBefore(b, ubS.querySelector(".ubI") || null);
};

// ---------- menüde paralaks
let px = 0, py = 0, hx = 0, hy = 0;
addEventListener("pointermove", (e) => { hx = e.clientX / innerWidth - 0.5; hy = e.clientY / innerHeight - 0.5; }, { passive: true });
const dongu = () => {
  const acik = menuAcik(), k = document.querySelector("canvas#k");
  document.body.classList.toggle("akis-menu", acik);
  if (k) {
    if (acik) { px += (hx - px) * 0.06; py += (hy - py) * 0.06; k.style.transform = `translate3d(${(-px * 14).toFixed(2)}px,${(-py * 9).toFixed(2)}px,0) scale(1.025)`; }
    else if (k.style.transform) k.style.transform = "";
  }
  requestAnimationFrame(dongu);
};
requestAnimationFrame(dongu);

// ---------- DOM izleme (yalnızca menü; oyun içi HUD değişikliklerine dokunmaz)
let bekleyen = false, izlenen = null;
const tara = () => {
  bekleyen = false;
  const m = document.querySelector("#menu"); if (!m || !menuAcik()) return;
  const sayfa = m.className.split(/\s+/).find((c) => c.startsWith("p-")) || "";
  const ic = m.querySelector(":scope > :not(header)");
  const imza = sayfa + "|" + (ic ? ic.tagName + "." + ic.className : "");
  if (imza !== sonSayfa) { sonSayfa = imza; sahne(); }
  cizgiGuncelle(); hesapDugme();
  const p = m.querySelector(".ubP"); p && pulAk(p);
};
const gozcu = new MutationObserver(() => { if (!bekleyen) { bekleyen = true; requestAnimationFrame(tara); } });
const bagla = () => { const m = document.querySelector("#menu"); if (m && m !== izlenen) { gozcu.disconnect(); gozcu.observe(m, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class"] }); izlenen = m; tara(); } };
setInterval(bagla, 1000); bagla();
// perdeler (envanter, kasalar, ayarlar...): her görünüşte giriş animasyonu
const perdeAc = (p) => { p.classList.remove("akis-ac"); void p.offsetWidth; p.classList.add("akis-ac"); clearTimeout(p._akisZ); p._akisZ = setTimeout(() => p.classList.remove("akis-ac"), 800); };
const perdeGor = new WeakMap();
new MutationObserver((L) => {
  for (const k of L) {
    if (k.type === "childList") for (const n of k.addedNodes) { if (n.nodeType === 1 && n.classList.contains("perde")) { perdeGor.set(n, !n.hidden); perdeAc(n); } }
    else if (k.target.classList?.contains("perde")) { const g = !k.target.hidden; if (g && !perdeGor.get(k.target)) perdeAc(k.target); perdeGor.set(k.target, g); }
  }
}).observe(document.body, { childList: true, attributes: true, attributeFilter: ["hidden"], subtree: true });
addEventListener("resize", () => cizgiGuncelle());
