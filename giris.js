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
const kok = document.createElement("div");
kok.id = "giris";
kok.innerHTML = `
  <div class="g-arka"></div><div class="g-ton"></div><div class="g-kum"></div><div class="g-isik"></div>
  <div class="g-sahne">
    <div class="g-sol">
      <div class="g-ust"><span class="g-cizgi"></span>TAKTİK NİŞANCI · TARAYICIDA</div>
      <h1 class="g-logo" aria-label="PUSU"><span>P</span><span>U</span><span>S</span><span>U</span></h1>
      <p class="g-slogan">Oda kur, kodu at, arkadaşlarınla 5v5'e kadar kapış. İndirme yok.</p>
      <ul class="g-rozet"><li>11 harita</li><li>32 destan skin</li><li>Botlarla antrenman</li></ul>
    </div>
    <div class="g-kart" role="dialog" aria-label="Giriş"><div class="g-kart-ic"></div></div>
  </div>
  <div class="g-alt"><span class="g-surum">PUSU · ${new Date().getFullYear()}</span><span class="g-durum"></span></div>
  <div class="g-yukle" hidden><div class="g-yukle-yazi">YÜKLENİYOR</div><div class="g-bar"><i></i></div></div>`;
document.body.append(kok);
const kart = kok.querySelector(".g-kart-ic");
const durum = (t, tur = "") => { const e = kart.querySelector(".g-mesaj"); if (e) { e.textContent = t; e.dataset.tur = tur; } };

const gorunum = {
  hosgeldin(ad) {
    kart.innerHTML = `
      <div class="g-baslik">Tekrar hoş geldin</div>
      <div class="g-profil"><div class="g-avatar">${kacis(ad.slice(0, 1).toLocaleUpperCase("tr"))}</div><div><b>${kacis(ad)}</b><small>Hesabınla giriş yapıldı</small></div></div>
      <button class="g-btn g-ana" data-is="devam"><span>OYUNA GİR</span></button>
      <p class="g-mesaj" aria-live="polite"></p>
      <button class="g-link" data-is="cikis">Başka hesapla gir</button>`;
  },
  form(sekme = "giris") {
    const kayit = sekme === "kayit";
    kart.innerHTML = `
      <div class="g-sekme"><button data-sekme="giris" class="${kayit ? "" : "on"}">GİRİŞ YAP</button><button data-sekme="kayit" class="${kayit ? "on" : ""}">HESAP OLUŞTUR</button></div>
      <form class="g-form" novalidate>
        <label class="g-alan"><span>KULLANICI ADI</span><input name="ad" autocomplete="username" maxlength="16" spellcheck="false" required placeholder="ör. Kartal"></label>
        <label class="g-alan"><span>ŞİFRE</span><input name="sifre" type="password" autocomplete="${kayit ? "new-password" : "current-password"}" minlength="6" required placeholder="en az 6 karakter"></label>
        ${kayit ? '<label class="g-alan"><span>ŞİFRE (TEKRAR)</span><input name="sifre2" type="password" autocomplete="new-password" minlength="6" required></label>' : ""}
        <button class="g-btn g-ana" type="submit"><span>${kayit ? "HESABI OLUŞTUR" : "GİRİŞ YAP"}</span></button>
        <p class="g-mesaj" aria-live="polite">${kayit ? "Yeni hesap sıfırdan başlar. Envanterin, pulların ve istatistiklerin hesabına kaydedilir; her cihazdan aynı hesapla girersin." : ""}</p>
      </form>
      <div class="g-ayrac"><span>ya da</span></div>
      <button class="g-btn g-ikincil" data-is="misafir"><span>MİSAFİR OLARAK OYNA</span></button>
      <p class="g-not">Misafirde ilerlemen yalnızca bu tarayıcıda kalır.</p>`;
    setTimeout(() => kart.querySelector("input")?.focus(), 50);
  },
  misafir(geri = true) {
    let ad = ""; try { ad = JSON.parse(ls.al("pusu.ayar") || "{}")?.ad || ""; } catch {}
    if (ad === "Oyuncu") ad = "";
    kart.innerHTML = `
      <div class="g-baslik">${geri ? "Misafir girişi" : "Hazır mısın?"}</div>
      <form class="g-form g-misafir" novalidate>
        <label class="g-alan"><span>OYUNCU ADIN</span><input name="ad" maxlength="16" spellcheck="false" required placeholder="ör. Kartal" value="${kacis(ad)}"></label>
        <button class="g-btn g-ana" type="submit"><span>OYUNA GİR</span></button>
        <p class="g-mesaj" aria-live="polite"></p>
      </form>
      <p class="g-not">${geri ? "İlerlemen yalnızca bu tarayıcıda kalır." : "Hesap sistemi henüz açılmadı; ilerlemen bu tarayıcıda saklanır."}</p>
      ${geri ? '<button class="g-link" data-sekme="giris">← Hesapla giriş yap</button>' : ""}`;
    setTimeout(() => kart.querySelector("input")?.focus(), 50);
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
kok.addEventListener("click", async (e) => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.sekme) { gorunum.form(b.dataset.sekme); return; }
  const is = b.dataset.is;
  if (is === "misafir") gorunum.misafir(true);
  else if (is === "devam") oyunaGec();
  else if (is === "cikis") { try { await (await sbAl()).auth.signOut(); } catch {} kullanici = null; gorunum.form("giris"); }
});
kok.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (e.target.classList.contains("g-misafir")) {
    const ad = e.target.ad.value.trim();
    if (ad.length < 2 || ad.length > 16) return durum("Adın 2–16 karakter olmalı.", "hata");
    if (!ls.al("pusu.ayar")) { ls.yaz("pusu.ayar", JSON.stringify({ menuM: 1, mz2: 1 })); ls.yaz("pusu_rehber", "yeni"); }
    adiAyaraYaz(ad); ls.yaz("pusu_misafir", "1"); oyunaGec(); return;
  }
  const f = e.target, ad = f.ad.value.trim(), sifre = f.sifre.value, kayit = !!f.sifre2;
  if (!AD_RE.test(ad)) return durum("Kullanıcı adı 3–16 karakter olmalı; harf, rakam ve _ kullanılabilir.", "hata");
  if (sifre.length < 6) return durum("Şifre en az 6 karakter olmalı.", "hata");
  if (kayit && sifre !== f.sifre2.value) return durum("Şifreler aynı değil.", "hata");
  const btn = f.querySelector(".g-ana"); btn.disabled = true; btn.classList.add("bekle"); durum(kayit ? "Hesap oluşturuluyor…" : "Giriş yapılıyor…");
  try { await (kayit ? kaydol(ad, sifre) : gir(ad, sifre)); durum("Hazır!", "ok"); oyunaGec(); }
  catch (err) { durum(err.message || "Bir şeyler ters gitti.", "hata"); btn.disabled = false; btn.classList.remove("bekle"); }
});
addEventListener("keydown", (e) => { if (e.key === "Enter" && !gecildi && kart.querySelector('[data-is="devam"]') && !e.target.closest?.("input")) oyunaGec(); });

// ---------- başlangıç
(async () => {
  // oyun dosyasını arkada indirmeye başla (çalıştırmadan)
  const on = document.createElement("link"); on.rel = "modulepreload"; on.href = OYUN; document.head.append(on);
  if (new URLSearchParams(location.search).has("hepsi") || window.PUSU_TEST) { kok.remove(); gecildi = true; await import(new URL(OYUN, location.href).href); import("./akici.js" + new URL(import.meta.url).search).catch(() => {}); return; }
  setTimeout(() => kok.classList.add("g-hazir"), 60);
  if (!HESAP_ACIK) { gorunum.misafir(false); return; }
  kart.innerHTML = '<div class="g-baslik">Bağlanılıyor…</div>';
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
  gorunum.form(ls.al("pusu_misafir") ? "giris" : "kayit");
})();
