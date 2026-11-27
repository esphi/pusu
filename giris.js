// PUSU açılış + giriş katmanı. Oyun (oyun.js) ancak giriş/misafir seçildikten sonra yüklenir.
// Hesaplı oyuncuda tarayıcıdaki "pusu." anahtarları (ayar, depo, istatistik...) Supabase'teki kayıtla eşitlenir.
import AYAR from "./hesap_ayar.js";

const OYUN = window.PUSU_OYUN || "oyun.js";
const SB_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
const HESAP_ACIK = !!(AYAR.url && AYAR.anahtar);
const ls = {
  al: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  yaz: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} },
};
const kayitAnahtarlari = () => { const L = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("pusu.")) L.push(k); } } catch {} return L.sort(); };
const yerelKayit = () => Object.fromEntries(kayitAnahtarlari().map((k) => [k, ls.al(k)]));
const kayitYukle = (v) => { for (const k of kayitAnahtarlari()) ls.yaz(k, null); for (const [k, d] of Object.entries(v || {})) if (k.startsWith("pusu.") && typeof d === "string") ls.yaz(k, d); };
// ilerleme anahtarları (yeni hesapta sıfırlanır); ayarlar (ayar, nis, ses, seslab) korunur
const ILERLEME = ["pusu.depo", "pusu.iler", "pusu.ist", "pusu.kap", "pusu.ajanY", "pusu.sonOda", "pusu.bomba_paket"];
const sifirdanBasla = () => {
  if (ILERLEME.some((k) => ls.al(k) != null)) ls.yaz("pusu_yerel_yedek", JSON.stringify(yerelKayit()));
  for (const k of ILERLEME) ls.yaz(k, null);
  let a = {}; try { a = JSON.parse(ls.al("pusu.ayar") || "{}") || {}; } catch {}
  a.menuM = 1; a.mz2 = 1; ls.yaz("pusu.ayar", JSON.stringify(a));
  ls.yaz("pusu_rehber", "yeni");
};
const adiAyaraYaz = (ad) => { let a = {}; try { a = JSON.parse(ls.al("pusu.ayar") || "{}") || {}; } catch {} a.ad = ad; ls.yaz("pusu.ayar", JSON.stringify(a)); };
// kullanıcı adı → Supabase'in istediği e-posta (gerçek e-posta istemiyoruz)
const eposta = (ad) => "u" + [...new TextEncoder().encode(ad.trim().toLocaleLowerCase("tr"))].map((b) => b.toString(16).padStart(2, "0")).join("") + "@pusu.oyun";
const AD_RE = /^[a-zA-Z0-9_çğıöşüÇĞİÖŞÜ]{3,16}$/;
const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

let sb = null;
const sbAl = async () => (sb ||= (await import(SB_CDN)).createClient(AYAR.url, AYAR.anahtar, { auth: { persistSession: true, storageKey: "pusu_oturum" } }));

// ---------- arayüz
const IK = {
  nisan: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="16" cy="16" r="10.5"/><circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none"/><path d="M16 1.5v8M16 22.5v8M1.5 16h8M22.5 16h8" stroke-linecap="round"/></svg>',
  oynat: '<svg viewBox="0 0 24 24"><path d="M6 3.5v17l14-8.5z" fill="currentColor"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
  simsek: '<svg viewBox="0 0 24 24"><path d="M13.5 2L4 13.5h6.5L9 22l10-12h-6.6z" fill="currentColor"/></svg>',
  takim: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7.5" r="3.6"/><path d="M1.8 20c.4-4.2 3.3-6.8 7.2-6.8s6.8 2.6 7.2 6.8z"/><circle cx="17" cy="8.5" r="2.9" opacity=".75"/><path d="M15.8 13.6c3.6-.4 6.1 1.8 6.5 5.6h-4.6c-.2-2.2-.9-4.1-1.9-5.6z" opacity=".75"/></svg>',
  kupa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 3h12v2h3.2v2.6c0 3-2 5.1-4.8 5.4-.9 1.7-2.4 2.8-4.4 3.1V19h4v2.5H8V19h4v-2.9c-2-.3-3.5-1.4-4.4-3.1C4.8 12.7 2.8 10.6 2.8 7.6V5H6zm0 4H4.8v.6c0 1.6.8 2.8 2 3.3C6.3 10 6 8.6 6 7zm12 0c0 1.6-.3 3-.8 3.9 1.2-.5 2-1.7 2-3.3V7z"/></svg>',
  kisi: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.5" r="4.3"/><path d="M3.5 21c.5-5 4-8 8.5-8s8 3 8.5 8z"/></svg>',
  gir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M4 12h11M11 8l4 4-4 4"/></svg>',
  bilgi: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 10.5v6.5M12 7v.2" stroke="#16120a" stroke-width="2.6" stroke-linecap="round"/></svg>',
  tam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M4 4l5.5 5.5M20 4l-5.5 5.5M20 20l-5.5-5.5M4 20l5.5-5.5"/></svg>',
  geri: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
};
const HARITALAR = [["kasaba", "Kasaba"], ["carsi", "Kapalıçarşı"], ["han", "Taşhan"], ["istasyon", "İstasyon"], ["depo", "Depo"], ["gobek", "Göbek-Taşı"], ["teras", "Teras"], ["kahvalti", "Kahvaltı-99"], ["taki", "Takı-Töreni"], ["aktuel", "Aktüel-Cuma"], ["masaustu", "Masaüstü-XP"]];
const kok = document.createElement("div");
kok.id = "giris";
kok.innerHTML = `
  <div class="g-arka"><i></i></div><div class="g-gunes"></div><div class="g-ton"></div>
  <div class="g-sis"><i></i><i></i></div><canvas class="g-kivilcim"></canvas><div class="g-kum"></div>
  <header class="g-bar-ust">
    <div class="g-marka"><span class="g-ik">${IK.nisan}</span><b>PUSU</b></div>
    <div class="g-ust-sag"><button class="g-ikon" data-is="tam" title="Tam ekran" aria-label="Tam ekran">${IK.tam}</button></div>
  </header>
  <main class="g-sol">
    <div class="g-ust"><i></i><span>TAKTİK NİŞANCI · TARAYICIDA</span><i></i></div>
    <h1 class="g-logo"><img src="kapak/logo.webp" alt="PUSU" draggable="false"><span class="g-parla"></span></h1>
    <p class="g-slogan">Oda kur, kodu at, arkadaşlarınla 5v5'e kadar kapış.<br>İndirme yok, tamamen tarayıcıda.</p>
    <ul class="g-rozet"><li>${IK.simsek}<span>11 HARİTA</span></li><li>${IK.takim}<span>32 DESTAN SKİN</span></li><li>${IK.kupa}<span>BOTLARLA ANTRENMAN</span></li></ul>
    <div class="g-eylem"></div>
  </main>
  <aside class="g-harita" aria-label="Haritalar">
    <div class="g-h-bas"><span class="g-ik">${IK.bilgi}</span><div><b>PUSU Dünyasına Hoş Geldin!</b><small>Stratejini belirle, zafer senin olsun.</small></div></div>
    <div class="g-h-resim">${HARITALAR.map(([k, a], i) => `<figure class="${i ? "" : "on"}"><img ${i ? "data-" : ""}src="harita/${k}.jpg" alt=""><figcaption>${a}</figcaption></figure>`).join("")}<div class="g-h-nokta">${HARITALAR.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div></div>
  </aside>
  <footer class="g-alt"><span class="g-marka kucuk"><span class="g-ik">${IK.nisan}</span><b>PUSU</b></span><span class="g-surum">PUSU v${new Date().getFullYear()}.${new Date().getMonth() + 1}</span><span>© ${new Date().getFullYear()} PUSU · Tarayıcı taktik nişancı</span><span class="g-durum"></span></footer>
  <div class="g-yukle" hidden><div class="g-yukle-yazi">YÜKLENİYOR</div><div class="g-bar"><i></i></div></div>`;
document.body.append(kok);
const kart = kok.querySelector(".g-eylem");
const durum = (t, tur = "") => { const e = kart.querySelector(".g-mesaj"); if (e) { e.textContent = t; e.dataset.tur = tur; } };
const kayitliAd = () => { let ad = ""; try { ad = JSON.parse(ls.al("pusu.ayar") || "{}")?.ad || ""; } catch {} return ad === "Oyuncu" ? "" : ad; };
// görünüm değişimi: eski içerik söner, yenisi akarak gelir; form açıkken slogan/rozet gizlenir
const goster = (html, form = false) => {
  kok.classList.toggle("g-form-acik", form);
  kart.classList.remove("g-gel"); kart.innerHTML = html; void kart.offsetWidth; kart.classList.add("g-gel");
  kok.scrollTop = 0;
  if (form) setTimeout(() => { const i = [...kart.querySelectorAll("input")]; (i.find((x) => !x.value) || i[0])?.focus({ preventScroll: true }); kok.scrollTop = 0; }, 80);
};
const anaDugme = (yazi, is) => `<button class="g-btn g-ana" data-is="${is}"><span class="g-oyn">${IK.oynat}</span><span class="g-yz">${yazi}</span><span class="g-ok">${IK.ok}</span></button>`;
const gorunum = {
  ana() {
    goster(`${anaDugme("OYUNA GİR", "misafir")}
      ${HESAP_ACIK ? `<div class="g-ayrac"><span>veya</span></div>
      <div class="g-iki"><button class="g-btn g-ikincil" data-sekme="kayit">${IK.kisi}<span>Hesap Oluştur</span></button><button class="g-btn g-ikincil" data-sekme="giris">${IK.gir}<span>Giriş Yap</span></button></div>
      <p class="g-not">Hesapsız da oynayabilirsin; misafirde ilerlemen yalnızca bu tarayıcıda kalır.</p>` : `<p class="g-not">İlerlemen bu tarayıcıda saklanır.</p>`}`);
  },
  hosgeldin(ad) {
    goster(`<div class="g-profil"><div class="g-avatar">${kacis(ad.slice(0, 1).toLocaleUpperCase("tr"))}</div><div><small>Tekrar hoş geldin</small><b>${kacis(ad)}</b></div></div>
      ${anaDugme("OYUNA GİR", "devam")}
      <p class="g-mesaj" aria-live="polite"></p>
      <button class="g-link" data-is="cikis">Başka hesapla gir</button>`);
  },
  form(sekme = "giris") {
    const kayit = sekme === "kayit";
    goster(`<div class="g-panel">
      <div class="g-p-bas"><button class="g-geri" data-is="geri" aria-label="Geri">${IK.geri}</button>
        <div class="g-sekme"><button data-sekme="giris" class="${kayit ? "" : "on"}">Giriş Yap</button><button data-sekme="kayit" class="${kayit ? "on" : ""}">Hesap Oluştur</button><i></i></div></div>
      <form class="g-form" novalidate>
        <label class="g-alan"><span>Kullanıcı adı</span><input name="ad" autocomplete="username" maxlength="16" spellcheck="false" required placeholder="ör. Kartal"></label>
        <label class="g-alan"><span>Şifre</span><input name="sifre" type="password" autocomplete="${kayit ? "new-password" : "current-password"}" minlength="6" required placeholder="en az 6 karakter"></label>
        ${kayit ? '<label class="g-alan"><span>Şifre (tekrar)</span><input name="sifre2" type="password" autocomplete="new-password" minlength="6" required></label>' : ""}
        <button class="g-btn g-ana kucuk" type="submit"><span class="g-yz">${kayit ? "HESABI OLUŞTUR" : "GİRİŞ YAP"}</span><span class="g-ok">${IK.ok}</span></button>
        <p class="g-mesaj" aria-live="polite">${kayit ? "Yeni hesap sıfırdan başlar; envanterin, pulların ve istatistiklerin her cihazda seninle." : ""}</p>
      </form></div>`, true);
    const s = kart.querySelector(".g-sekme"), on = s.querySelector(".on"), c = s.querySelector("i");
    c.style.width = on.offsetWidth + "px"; c.style.transform = `translateX(${on.offsetLeft}px)`;
  },
  misafir() {
    const ad = kayitliAd();
    goster(`<div class="g-panel">
      <div class="g-p-bas"><button class="g-geri" data-is="geri" aria-label="Geri">${IK.geri}</button><div class="g-p-baslik">Seni ne diye çağıralım?</div></div>
      <form class="g-form g-misafir" novalidate>
        <label class="g-alan"><span>Oyuncu adın</span><input name="ad" maxlength="16" spellcheck="false" required placeholder="ör. Kartal" value="${kacis(ad)}"></label>
        ${anaDugme("OYUNA GİR", "").replace("<button ", '<button type="submit" ')}
        <p class="g-mesaj" aria-live="polite"></p>
      </form></div>`, true);
  },
};

// ---------- hesap işlemleri
let kullanici = null, profilAd = null;
const hesabaGec = async (u, ad) => {
  kullanici = u; profilAd = ad;
  const sb0 = await sbAl();
  const { data: k } = await sb0.from("kayitlar").select("v").eq("id", u.id).maybeSingle();
  const ayni = ls.al("pusu_hesap") === u.id, kirli = ls.al("pusu_kirli") === "1";
  if (k && k.v && Object.keys(k.v).length && !(ayni && kirli)) {
    if (!ayni && kayitAnahtarlari().length) ls.yaz("pusu_yerel_yedek", JSON.stringify(yerelKayit()));
    kayitYukle(k.v);
  } else {
    // hesapta kayıt yok (yeni hesap) ya da bu tarayıcıda gönderilmemiş değişiklik var → yereldekini hesaba taşı
    await sb0.from("kayitlar").upsert({ id: u.id, v: yerelKayit(), guncellendi: new Date().toISOString() });
  }
  ls.yaz("pusu_hesap", u.id); ls.yaz("pusu_kirli", null); ls.yaz("pusu_misafir", null);
  adiAyaraYaz(ad);
};
const gir = async (ad, sifre) => {
  const sb0 = await sbAl();
  const { data, error } = await sb0.auth.signInWithPassword({ email: eposta(ad), password: sifre });
  if (error) throw new Error(/invalid/i.test(error.message) ? "Kullanıcı adı ya da şifre yanlış." : error.message);
  const { data: p } = await sb0.from("profiller").select("ad").eq("id", data.user.id).maybeSingle();
  await hesabaGec(data.user, p?.ad || ad);
};
const kaydol = async (ad, sifre) => {
  const sb0 = await sbAl();
  const { data: var0 } = await sb0.from("profiller").select("id").ilike("ad", ad).maybeSingle();
  if (var0) throw new Error("Bu kullanıcı adı alınmış.");
  const { data, error } = await sb0.auth.signUp({ email: eposta(ad), password: sifre, options: { data: { ad } } });
  if (error) throw new Error(/registered|exists/i.test(error.message) ? "Bu kullanıcı adı alınmış." : error.message);
  if (!data.session) throw new Error("Hesap açıldı ama e-posta onayı bekleniyor. Supabase'te 'Confirm email' kapatılmalı.");
  const { error: e2 } = await sb0.from("profiller").insert({ id: data.user.id, ad });
  if (e2) throw new Error(/duplicate|unique/i.test(e2.message) ? "Bu kullanıcı adı alınmış." : e2.message);
  sifirdanBasla();
  await hesabaGec(data.user, ad);
};

// ---------- eşitleme (hesaplı oyuncu)
let sonGonderilen = "";
const anlik = () => JSON.stringify(yerelKayit());
const gonder = async (kalici = false) => {
  if (!kullanici) return;
  const s = anlik();
  if (s === sonGonderilen) return;
  ls.yaz("pusu_kirli", "1");
  const govde = JSON.stringify({ id: kullanici.id, v: JSON.parse(s), guncellendi: new Date().toISOString() });
  try {
    const sb0 = await sbAl(), { data } = await sb0.auth.getSession(), tok = data.session?.access_token;
    if (!tok) return;
    const r = await fetch(`${AYAR.url}/rest/v1/kayitlar?on_conflict=id`, { method: "POST", keepalive: kalici, headers: { apikey: AYAR.anahtar, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: govde });
    if (r.ok) { sonGonderilen = s; ls.yaz("pusu_kirli", null); }
  } catch {}
};
const esitlemeyiBaslat = () => {
  sonGonderilen = anlik();
  setInterval(() => gonder(), 20000);
  addEventListener("pagehide", () => gonder(true));
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && gonder(true));
};

// ---------- oyuna geçiş
let gecildi = false;
const oyunaGec = async () => {
  if (gecildi) return; gecildi = true;
  kok.classList.add("g-cikis");
  kok.querySelector(".g-yukle").hidden = false;
  if (kullanici) esitlemeyiBaslat();
  window.PUSU_HESAP = {
    ad: profilAd, id: kullanici?.id || null, misafir: !kullanici,
    async cikis() { await gonder(true); try { await (await sbAl()).auth.signOut(); } catch {} kayitYukle({}); ls.yaz("pusu_hesap", null); location.reload(); },
    kaydet: () => gonder(),
  };
  await import(new URL(OYUN, location.href).href);
  import("./akici.js" + new URL(import.meta.url).search).then(() => import("./rehber.js" + new URL(import.meta.url).search)).catch(() => {});
  const t0 = performance.now();
  const bekle = () => {
    const hazir = document.querySelector("#kur, #antr, #oynaB") && !document.querySelector("#yukle");
    if (hazir || performance.now() - t0 > 90000) { kok.classList.add("g-bitti"); setTimeout(() => kok.remove(), 900); return; }
    requestAnimationFrame(bekle);
  };
  bekle();
};

// ---------- olaylar
const misafirGir = (ad) => {
  if (!ls.al("pusu.ayar")) { ls.yaz("pusu.ayar", JSON.stringify({ menuM: 1, mz2: 1 })); ls.yaz("pusu_rehber", "yeni"); }
  adiAyaraYaz(ad); ls.yaz("pusu_misafir", "1"); oyunaGec();
};
kok.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.sekme) { gorunum.form(b.dataset.sekme); return; }
  const is = b.dataset.is;
  if (is === "misafir") { const ad = kayitliAd(); ad && ls.al("pusu_misafir") ? misafirGir(ad) : gorunum.misafir(); }
  else if (is === "devam") oyunaGec();
  else if (is === "geri") kullanici ? gorunum.hosgeldin(profilAd) : gorunum.ana();
  else if (is === "tam") { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch {} }
  else if (is === "cikis") { try { await (await sbAl()).auth.signOut(); } catch {} kullanici = null; gorunum.ana(); }
});
kok.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (e.target.classList.contains("g-misafir")) {
    const ad = e.target.ad.value.trim();
    if (ad.length < 2 || ad.length > 16) return durum("Adın 2–16 karakter olmalı.", "hata");
    misafirGir(ad); return;
  }
  const f = e.target, ad = f.ad.value.trim(), sifre = f.sifre.value, kayit = !!f.sifre2;
  if (!AD_RE.test(ad)) return durum("Kullanıcı adı 3–16 karakter olmalı; harf, rakam ve _ kullanılabilir.", "hata");
  if (sifre.length < 6) return durum("Şifre en az 6 karakter olmalı.", "hata");
  if (kayit && sifre !== f.sifre2.value) return durum("Şifreler aynı değil.", "hata");
  const btn = f.querySelector(".g-ana"); btn.disabled = true; btn.classList.add("bekle"); durum(kayit ? "Hesap oluşturuluyor…" : "Giriş yapılıyor…");
  try { await (kayit ? kaydol(ad, sifre) : gir(ad, sifre)); durum("Hazır!", "ok"); oyunaGec(); }
  catch (err) { durum(err.message || "Bir şeyler ters gitti.", "hata"); btn.disabled = false; btn.classList.remove("bekle"); }
});
addEventListener("keydown", (e) => {
  if (gecildi || e.target.closest?.("input")) return;
  if (e.key === "Enter") kart.querySelector('[data-is="devam"], [data-is="misafir"]')?.click();
  else if (e.key === "Escape") kart.querySelector('[data-is="geri"]')?.click();
});

// ---------- sahne efektleri: fare paralaksı, kıvılcımlar, harita döngüsü, arayüz sesi
const azHareket = matchMedia("(prefers-reduced-motion: reduce)").matches;
let hx = 0, hy = 0, px = 0, py = 0;
addEventListener("pointermove", (e) => { hx = e.clientX / innerWidth - 0.5; hy = e.clientY / innerHeight - 0.5; }, { passive: true });
const tuval = kok.querySelector(".g-kivilcim"), cx = tuval.getContext("2d");
let K = [], dpr = 1;
const boyut = () => { dpr = Math.min(2, devicePixelRatio || 1); tuval.width = innerWidth * dpr; tuval.height = innerHeight * dpr; };
boyut(); addEventListener("resize", boyut);
const yeniK = (ilk) => ({ x: Math.random() * innerWidth * 1.1, y: ilk ? Math.random() * innerHeight : innerHeight + 10, r: 0.6 + Math.random() * 1.9, vy: 18 + Math.random() * 46, vx: -6 + Math.random() * 20, f: Math.random() * 6.28, h: 18 + Math.random() * 22, o: 0.35 + Math.random() * 0.65, z: 0.4 + Math.random() * 0.9 });
for (let i = 0; i < (innerWidth < 900 ? 40 : 85); i++) K.push(yeniK(true));
let sonT = performance.now();
const kare = (t) => {
  if (!kok.isConnected) return;
  const dt = Math.min(0.05, (t - sonT) / 1000); sonT = t;
  px += (hx - px) * 0.05; py += (hy - py) * 0.05;
  kok.style.setProperty("--mx", px.toFixed(4)); kok.style.setProperty("--my", py.toFixed(4));
  if (!azHareket && !document.hidden) {
    cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight); cx.globalCompositeOperation = "lighter";
    for (const k of K) {
      k.f += dt * 3; k.y -= k.vy * dt * k.z; k.x += (k.vx + Math.sin(k.f) * 14) * dt * k.z;
      if (k.y < -20 || k.x > innerWidth + 30) Object.assign(k, yeniK(false));
      const titre = 0.55 + Math.sin(k.f * 2.3) * 0.45, a = k.o * titre * Math.min(1, (innerHeight - k.y) / 160 + 0.2);
      const x = k.x - px * 30 * k.z, y = k.y - py * 18 * k.z, r = k.r * k.z;
      const g = cx.createRadialGradient(x, y, 0, x, y, r * 4.5);
      g.addColorStop(0, `hsla(${k.h},100%,70%,${a})`); g.addColorStop(0.35, `hsla(${k.h},100%,55%,${a * 0.45})`); g.addColorStop(1, "hsla(20,100%,50%,0)");
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 4.5, 0, 6.283); cx.fill();
    }
  }
  requestAnimationFrame(kare);
};
requestAnimationFrame(kare);
let hi = 0;
setInterval(() => {
  if (!kok.isConnected || document.hidden) return;
  const F = kok.querySelectorAll(".g-h-resim figure"), N = kok.querySelectorAll(".g-h-nokta i");
  const s = (hi + 1) % F.length, im = F[s].querySelector("img");
  if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; }
  const goc = () => { F[hi].classList.remove("on"); N[hi].classList.remove("on"); hi = s; F[hi].classList.add("on"); N[hi].classList.add("on"); const s2 = F[(hi + 1) % F.length].querySelector("img"); if (s2.dataset.src) { s2.src = s2.dataset.src; delete s2.dataset.src; } };
  im.complete ? goc() : (im.onload = goc);
}, 4200);
let ax = null, sonH = null;
const tik = (sert) => {
  try {
    ax ||= new (window.AudioContext || window.webkitAudioContext)(); if (ax.state === "suspended") ax.resume();
    const t = ax.currentTime, o = ax.createOscillator(), g = ax.createGain(); o.connect(g); g.connect(ax.destination);
    o.type = sert ? "triangle" : "sine"; o.frequency.setValueAtTime(sert ? 700 : 1800, t); o.frequency.exponentialRampToValueAtTime(sert ? 320 : 1300, t + (sert ? 0.09 : 0.03));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(sert ? 0.09 : 0.025, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + (sert ? 0.12 : 0.05)); o.start(t); o.stop(t + 0.13);
  } catch {}
};
kok.addEventListener("pointerover", (e) => { const b = e.target.closest("button"); if (b && b !== sonH && !b.disabled) { sonH = b; tik(false); } if (!b) sonH = null; });
kok.addEventListener("pointerdown", (e) => { if (e.target.closest("button")) tik(true); });

// ---------- başlangıç
(async () => {
  // oyun dosyasını arkada indirmeye başla (çalıştırmadan)
  const on = document.createElement("link"); on.rel = "modulepreload"; on.href = OYUN; document.head.append(on);
  if (new URLSearchParams(location.search).has("hepsi") || window.PUSU_TEST) { kok.remove(); gecildi = true; await import(new URL(OYUN, location.href).href); import("./akici.js" + new URL(import.meta.url).search).catch(() => {}); return; }
  setTimeout(() => kok.classList.add("g-hazir"), 60);
  if (!HESAP_ACIK) { gorunum.ana(); return; }
  kart.innerHTML = '<div class="g-baglan"><i></i>Bağlanılıyor…</div>';
  try {
    const sb0 = await sbAl(), { data } = await sb0.auth.getSession();
    const u = data.session?.user;
    if (u) {
      const { data: p } = await sb0.from("profiller").select("ad").eq("id", u.id).maybeSingle();
      await hesabaGec(u, p?.ad || u.user_metadata?.ad || "Oyuncu");
      gorunum.hosgeldin(profilAd);
      return;
    }
  } catch { kok.querySelector(".g-durum").textContent = "Hesap sunucusuna ulaşılamadı · misafir oynayabilirsin"; }
  gorunum.ana();
})();
