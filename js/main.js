/* ============================================================
   CRETE · WeRoad — main.js
   Orchestrates motion + all interactive sections.
   Data lives at the top of each render fn so it's easy to edit.
   ============================================================ */

(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------------------------------------------------------
     1. PRELOADER
  --------------------------------------------------------- */
  function preloader() {
    const pl = $("#preloader");
    if (!pl) return;
    let hidden = false;
    const done = () => {
      if (hidden) return; hidden = true;
      pl.classList.add("is-done");
      document.body.classList.remove("is-loading");
      // hard-remove after the fade so the overlay can NEVER trap the user,
      // even if CSS transitions are paused (e.g. background tab) or fail.
      setTimeout(() => { pl.style.display = "none"; }, reduceMotion ? 0 : 900);
    };
    // hide shortly after the page is interactive — do NOT wait for all (remote) images
    window.addEventListener("load", () => setTimeout(done, reduceMotion ? 0 : 500));
    setTimeout(done, reduceMotion ? 0 : 1400); // hard cap so slow/blocked images never trap the user
  }

  /* ---------------------------------------------------------
     2. SMOOTH SCROLL (Lenis) + GSAP parallax
  --------------------------------------------------------- */
  let lenis = null;
  function smoothScroll() {
    if (reduceMotion || typeof Lenis === "undefined") return;
    lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);

      // parallax layers — centered range (−x → +x) so the offset is 0 when the
      // section sits at the top of the viewport, avoiding edge gaps (white strip).
      $$("[data-parallax]").forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        gsap.fromTo(el,
          { yPercent: -speed * 50 },
          { yPercent: speed * 50, ease: "none",
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } }
        );
      });
    }
  }

  // smooth anchor clicks (works with or without Lenis)
  function anchorScroll() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(target, { offset: -10, duration: 1.2 });
        else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ---------------------------------------------------------
     3. NAV (solid on scroll) + MOBILE MENU
  --------------------------------------------------------- */
  const nav = $("#nav"), menu = $("#menu"), toggle = $("#navToggle");
  function navState() {
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  function closeMenu() {
    menu?.classList.remove("is-open");
    nav?.classList.remove("menu-open");
    toggle?.setAttribute("aria-expanded", "false");
    menu?.setAttribute("aria-hidden", "true");
  }
  function mobileMenu() {
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      nav.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  /* ---------------------------------------------------------
     4. REVEAL ON SCROLL (IntersectionObserver)
  --------------------------------------------------------- */
  function reveals() {
    const els = $$(".reveal, [data-reveal], [data-stagger], .section-index");
    const showAll = () => { document.documentElement.classList.add("reveal-all"); els.forEach((el) => el.classList.add("is-visible")); };
    // no animation, no IO support, OR loaded in a background tab (animations/timers
    // are frozen there) → show everything immediately, no waiting.
    if (reduceMotion || typeof IntersectionObserver === "undefined" || document.hidden) { showAll(); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));

    // Failsafe: nothing must ever stay invisible. If the observer is throttled
    // (background tab) or anything goes wrong, force-reveal after a grace period.
    setTimeout(showAll, 3000);

    // If the page was loaded in a background tab (reveals + timers are throttled),
    // reveal everything the moment the user actually switches to it.
    document.addEventListener("visibilitychange", function onVis() {
      if (!document.hidden) { showAll(); document.removeEventListener("visibilitychange", onVis); }
    });
  }

  /* ---------------------------------------------------------
     5. CUSTOM CURSOR (desktop, fine pointer only)
  --------------------------------------------------------- */
  function cursor() {
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches || reduceMotion) return;
    document.body.classList.add("has-cursor");
    const dot = $(".cursor__dot"), ring = $(".cursor__ring");
    let rx = 0, ry = 0, x = 0, y = 0;
    window.addEventListener("mousemove", (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.left = x + "px"; dot.style.top = y + "px";
    });
    const loop = () => { rx += (x - rx) * 0.18; ry += (y - ry) * 0.18; ring.style.left = rx + "px"; ring.style.top = ry + "px"; requestAnimationFrame(loop); };
    loop();
    document.addEventListener("mouseover", (e) => {
      const hov = e.target.closest('a, button, [data-cursor="hover"], .pcheck, .qa__q');
      document.body.classList.toggle("cursor-hover", !!hov);
    });
  }

  /* ---------------------------------------------------------
     6. COUNTDOWN
  --------------------------------------------------------- */
  function countdown() {
    const target = new Date("2026-07-10T06:30:00").getTime(); // departure
    const map = { d: $("#cdDays"), h: $("#cdHours"), m: $("#cdMins"), s: $("#cdSecs") };
    if (!map.d) return;
    const set = (el, val) => {
      const str = String(val).padStart(2, "0");
      if (el.textContent !== str) { el.textContent = str; if (!reduceMotion) { el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); } }
    };
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      set(map.d, d); set(map.h, h); set(map.m, m); set(map.s, s);
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------
     7. KITTY (cassa comune) calculator
  --------------------------------------------------------- */
  function kitty() {
    const total = $("#kittyTotal"); if (!total) return;
    const PER = 100, N = 18; // quota fissa a testa · partecipanti
    total.textContent = (PER * N).toLocaleString("it-IT"); // fondo totale = 1.800 €
  }

  /* ---------------------------------------------------------
     8. PACK CHECKLIST (localStorage)
  --------------------------------------------------------- */
  const PACK = [
    "Costume da bagno", "Crema solare 50+", "Occhiali da sole", "Cappello / bandana",
    "Scarpe da scoglio", "Ciabatte", "Power bank", "Adattatore (tipo C/F)",
    "Documento + foto carta d'identità", "Asciugamano leggero", "Felpa per la sera",
    "Borraccia", "Medicinali base", "Macchina fotografica", "Contanti per la cassa",
    "Buon umore"
  ];
  function pack() {
    const list = $("#packList"); if (!list) return;
    const KEY = "crete-pack-v1";
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) {}
    list.innerHTML = PACK.map((item, i) => `
      <li>
        <label class="pcheck">
          <input type="checkbox" data-i="${i}" ${saved[i] ? "checked" : ""} />
          <span class="pcheck__box"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          <span class="pcheck__label">${item}</span>
        </label>
      </li>`).join("");
    const bar = $("#packProgress");
    const progress = () => {
      const total = PACK.length, done = Object.values(saved).filter(Boolean).length;
      if (bar) bar.style.width = Math.round((done / total) * 100) + "%";
    };
    list.addEventListener("change", (e) => {
      const cb = e.target.closest("input"); if (!cb) return;
      saved[cb.dataset.i] = cb.checked;
      localStorage.setItem(KEY, JSON.stringify(saved));
      progress();
    });
    progress();
  }

  /* ---------------------------------------------------------
     9. FLIGHTS
  --------------------------------------------------------- */
  // Voli raggruppati per volo (un gruppo = chi vola insieme).
  // Per aggiungere il RITORNO, riempi l'array FLIGHTS.ritorno con lo stesso formato.
  const FLIGHTS = {
    andata: [
      { num: "W46439", airline: "Wizz Air", from: "Milano Malpensa", to: "Heraklion", date: "Ven 10 lug", dep: "14:35", arr: "18:25",
        pax: ["Davide Janiri", "Vincenzo Menga", "Francesca Dias", "Ivan Vinciguerra"] },
      { num: "W46087", airline: "Wizz Air", from: "Roma Fiumicino", to: "Heraklion", date: "Ven 10 lug", dep: "11:55", arr: "15:30",
        pax: ["Veronica Roppoli", "Irene Cannello", "Mariam Scuderi", "Luciano Cancelli", "Lorenzo Proietti", "Marco Bacci", "Salvatore Lubello"] },
      { num: "V7 1730", airline: "Volotea", from: "Napoli", to: "Heraklion", date: "Ven 10 lug", dep: "13:30", arr: "16:30",
        pax: ["Salvatore Semprebuono", "Davide Saggese", "Stefania Spagnoletti", "Valentina Paglia"] },
      { num: "FR 4400", airline: "Ryanair", from: "Milano Bergamo", to: "Heraklion", date: "Ven 10 lug", dep: "12:55", arr: "16:35",
        pax: ["Cecilia Sala"] },
      { num: "W46439", airline: "Wizz Air", from: "Milano Malpensa", to: "Heraklion", date: "Gio 09 lug", dep: "17:45", arr: "21:35",
        pax: ["Bryanna De Araujo", "Omayma El Kaddouri"] },
      { num: "V7 1528", airline: "Volotea", from: "Palermo", to: "Heraklion", date: "Mar 30 giu", dep: "19:30", arr: "22:35",
        pax: ["Fabio Mazzotta"] },
    ],
    // Ritorno: i dati erano nell'ordine dei partecipanti (alcuni senza info).
    ritorno: [
      { num: "V7 1731", airline: "Volotea", from: "Heraklion", to: "Milano Malpensa", date: "Dom 12 lug", dep: "14:35", arr: "20:05",
        pax: ["Davide Janiri", "Francesca Dias"] },
      { num: "V7 1731", airline: "Volotea", from: "Heraklion", to: "Napoli", date: "Dom 12 lug", dep: "14:35", arr: "15:40",
        pax: ["Davide Saggese", "Stefania Spagnoletti", "Salvatore Semprebuono", "Valentina Paglia"] },
      { num: "W46440", airline: "Wizz Air", from: "Heraklion", to: "Milano Malpensa", date: "Lun 13 lug", dep: "17:00", arr: "19:00",
        pax: ["Vincenzo Menga", "Ivan Vinciguerra"] },
      { num: "AZ 737", airline: "ITA Airways", from: "Heraklion", to: "Roma Fiumicino", date: "Dom 12 lug", dep: "14:20", arr: "15:40",
        pax: ["Cecilia Sala", "Lorenzo Proietti", "Irene Cannello", "Marco Bacci"] },
      { num: "W46088", airline: "Wizz Air", from: "Heraklion", to: "Roma Fiumicino", date: "Dom 12 lug", dep: "09:50", arr: "11:20",
        pax: ["Mariam Scuderi"] },
      { num: "EJU3680", airline: "easyJet", from: "Heraklion", to: "Milano Malpensa", date: "Dom 12 lug", dep: "23:25", arr: "01:20",
        pax: ["Bryanna De Araujo", "Omayma El Kaddouri"] },
      { num: "FR3627", airline: "Ryanair", from: "Heraklion", to: "Catania", date: "Dom 12 lug", dep: "15:40", arr: "16:40",
        pax: ["Salvatore Lubello"] },
      { num: "V7 1529", airline: "Volotea", from: "Heraklion", to: "Palermo", date: "Mar 14 lug", dep: "10:35", arr: "11:35",
        pax: ["Fabio Mazzotta"] },
      { num: "", airline: "Compagnia da confermare", from: "Heraklion", to: "Roma Fiumicino", date: "Mar 14 lug", dep: "16:30", arr: "",
        pax: ["Veronica Roppoli", "Luciano Cancelli"] },
    ],
    // Ritorno ancora incompleto / non comunicato
    ritornoPending: [],
  };

  function flights() {
    const toggle = $("#flightsToggle"), wrap = $("#flightsPanels"); if (!toggle || !wrap) return;
    const dirs = [{ key: "andata", label: "Andata" }, { key: "ritorno", label: "Ritorno" }];

    toggle.innerHTML = dirs.map((d, i) => `
      <button class="ftog__btn${i === 0 ? " is-active" : ""}" role="tab" id="ftog-${d.key}"
              aria-selected="${i === 0}" aria-controls="fpanel-${d.key}" tabindex="${i === 0 ? "0" : "-1"}"
              data-dir="${d.key}" data-cursor="hover">${d.label}</button>`).join("") +
      `<span class="ftog__slider" aria-hidden="true"></span>`;

    const card = (f) => {
      const num = f.num || "Volo da confermare";
      const arr = f.arr || "—";
      return `
      <article class="fcard${f.num ? "" : " fcard--tbc"}" data-reveal>
        <header class="fcard__top">
          <span class="fcard__num">${num}</span>
          <span class="fcard__date">${f.date}</span>
        </header>
        <div class="fcard__route">
          <div class="fcard__pt"><strong>${f.dep}</strong><span>${f.from}</span></div>
          <div class="fcard__mid"><span class="fcard__line"></span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z" fill="currentColor"/></svg></div>
          <div class="fcard__pt fcard__pt--arr"><strong>${arr}</strong><span>${f.to}</span></div>
        </div>
        <div class="fcard__pax">
          <span class="fcard__paxlabel">${f.airline} · a bordo ${f.pax.length}</span>
          <ul class="fcard__names">${f.pax.map((n) => `<li>${n}</li>`).join("")}</ul>
        </div>
      </article>`;
    };

    const panel = (key) => {
      const list = FLIGHTS[key];
      if (!list.length) {
        return `<div class="fpanel" id="fpanel-${key}" role="tabpanel" aria-labelledby="ftog-${key}" hidden>
          <div class="flights__empty"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M2 16l9-2.5V6a1.5 1.5 0 013 0v7.5L23 16v2l-9-2.5V21l2 1.5V24l-3.5-1L9 24v-1.5L11 21v-5.5L2 18z" fill="none" stroke="currentColor" stroke-width="1.3"/></svg><p><strong>Voli di ritorno in arrivo.</strong></p><p>Li aggiungiamo qui appena sono confermati.</p></div>
        </div>`;
      }
      const pending = key === "ritorno" && FLIGHTS.ritornoPending && FLIGHTS.ritornoPending.length
        ? `<div class="flights__pending"><span class="flights__pending-label">Ancora da confermare</span><ul>${FLIGHTS.ritornoPending.map((n) => `<li>${n}</li>`).join("")}</ul></div>`
        : "";
      return `<div class="fpanel${key === "andata" ? " is-active" : ""}" id="fpanel-${key}" role="tabpanel" aria-labelledby="ftog-${key}" ${key === "andata" ? "" : "hidden"}>
        <div class="flights__grid">${list.map(card).join("")}</div>${pending}</div>`;
    };
    wrap.innerHTML = dirs.map((d) => panel(d.key)).join("");

    const btns = [...toggle.querySelectorAll(".ftog__btn")];
    const panels = [...wrap.querySelectorAll(".fpanel")];
    const slider = toggle.querySelector(".ftog__slider");
    const moveSlider = (i) => { slider.style.transform = `translateX(${i * 100}%)`; };
    moveSlider(0);

    const activate = (key, focus = false) => {
      const idx = dirs.findIndex((d) => d.key === key);
      btns.forEach((b, i) => {
        const on = b.dataset.dir === key;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", String(on));
        b.tabIndex = on ? 0 : -1;
        if (on && focus) b.focus();
      });
      panels.forEach((p) => {
        const on = p.id === `fpanel-${key}`;
        p.hidden = !on; p.classList.toggle("is-active", on);
      });
      moveSlider(idx);
    };
    toggle.addEventListener("click", (e) => { const b = e.target.closest(".ftog__btn"); if (b) activate(b.dataset.dir); });
    toggle.addEventListener("keydown", (e) => {
      const cur = btns.findIndex((b) => b.getAttribute("aria-selected") === "true");
      let n = null;
      if (e.key === "ArrowRight") n = (cur + 1) % btns.length;
      else if (e.key === "ArrowLeft") n = (cur - 1 + btns.length) % btns.length;
      if (n !== null) { e.preventDefault(); activate(btns[n].dataset.dir, true); }
    });
  }

  /* ---------------------------------------------------------
     10. GETTING THERE
  --------------------------------------------------------- */
  const ROUTE = [
    { icon: "plane", t: "Aeroporto di Heraklion (HER)", s: "Atterraggio e ritiro bagagli. Ci raggruppiamo per orari simili.", price: "—", time: "" },
    { icon: "taxi", t: "Van privato (opzionale)", s: "Fino a 15 persone, comodo e diretto in hotel. Da prenotare insieme in anticipo.", price: "90 € + IVA / gruppo", time: "~30 min" },
    { icon: "bus", t: "In alternativa: bus o taxi", s: "Linea KTEL o taxi condivisi dall'aeroporto: più economico se siamo in pochi.", price: "≈ 50 € totali", time: "45–75 min" },
    { icon: "bed", t: "Primavera Beach Hotel · Stalida", s: "Arrivati sulla costa orientale. Si lasciano i bagagli e via in spiaggia.", price: "—", time: "" },
  ];
  const ICONS = {
    plane: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z" fill="currentColor"/>',
    bus: '<path d="M4 16V6a2 2 0 012-2h12a2 2 0 012 2v10M4 16h16M4 16v2a1 1 0 001 1h1a1 1 0 001-1v-0M20 16v2a1 1 0 01-1 1h-1a1 1 0 01-1-1M7 9h10M7 12.5h.01M17 12.5h.01" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
    taxi: '<path d="M5 17h14M6 17l1-5h10l1 5M9 7h6l1.5 5H7.5L9 7zM7 17v1.5M17 17v1.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
    bed: '<path d="M3 18v-6h18v6M3 12V8a2 2 0 012-2h4a2 2 0 012 2v4M3 18v2M21 18v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  };
  function getting() {
    const ol = $("#gettingSteps"); if (!ol) return;
    ol.innerHTML = ROUTE.map((r) => `
      <li class="gstep" data-reveal>
        <span class="gstep__icon"><svg viewBox="0 0 24 24">${ICONS[r.icon] || ""}</svg></span>
        <div class="gstep__body"><strong>${r.t}</strong><span>${r.s}</span></div>
        <div class="gstep__meta"><span class="price">${r.price}</span><span class="time">${r.time}</span></div>
      </li>`).join("");
  }

  // Transfer aeroporto → hotel, raggruppati per orario d'arrivo
  const TRANSFERS = [
    {
      mode: "Van condiviso", when: "Ven 10 lug · ~16:35", best: true,
      cost: "111,60 € totali", per: "≈ 9,30 € a testa",
      note: "Il gruppo da Fiumicino (arrivo 15:30) aspetta ~1h e parte insieme a Napoli e Bergamo.",
      pax: ["Veronica Roppoli", "Irene Cannello", "Mariam Scuderi", "Luciano Cancelli", "Lorenzo Proietti", "Marco Bacci", "Salvatore Lubello", "Salvatore Semprebuono", "Davide Saggese", "Stefania Spagnoletti", "Valentina Paglia", "Cecilia Sala"],
    },
    {
      mode: "Taxi", when: "Ven 10 lug · 18:25", best: false,
      cost: "≈ 50 € totali", per: "≈ 12,50 € a testa",
      note: "Arrivano da Malpensa ~2h dopo il gruppo: un taxi conviene rispetto a un van intero.",
      pax: ["Davide Janiri", "Vincenzo Menga", "Francesca Dias", "Ivan Vinciguerra"],
    },
    {
      mode: "Taxi", when: "Gio 9 lug · 21:35", best: false,
      cost: "≈ 50 € totali", per: "≈ 25 € a testa",
      note: "Arrivo il giorno prima: transfer indipendente dal resto del gruppo.",
      pax: ["Bryanna De Araujo", "Omayma El Kaddouri"],
    },
    {
      mode: "Transfer proprio", when: "Mar 30 giu · 22:35", best: false,
      cost: "—", per: "in autonomia",
      note: "Arriva con largo anticipo: si organizza da sé.",
      pax: ["Fabio Mazzotta"],
    },
  ];
  function transfers() {
    const grid = $("#transfersGrid"); if (!grid) return;
    grid.innerHTML = TRANSFERS.map((t) => `
      <article class="tcard${t.best ? " tcard--best" : ""}" data-reveal>
        <header class="tcard__head">
          <span class="tcard__mode">${t.mode}</span>
          <span class="tcard__count">${t.pax.length} pax</span>
        </header>
        <p class="tcard__when">${t.when}</p>
        <div class="tcard__cost"><strong>${t.cost}</strong><span>${t.per}</span></div>
        <p class="tcard__note">${t.note}</p>
        <ul class="tcard__pax">${t.pax.map((n) => `<li>${n}</li>`).join("")}</ul>
      </article>`).join("");
  }

  /* ---------------------------------------------------------
     11. EXTRAS — griglia uniforme 3×2, ordine: mare → cultura → sapori
  --------------------------------------------------------- */
  const EXTRAS = [
    { tag: "Mare", title: "Voulisma Beach", desc: "La spiaggia caraibica di Creta: acqua turchese e sabbia chiara. Meglio al mattino presto.", price: "Lettini in loco", dur: "Mezza giornata", level: 3, img: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop&q=80" },
    { tag: "Cultura", title: "Palazzo di Cnosso", desc: "Il sito minoico più famoso: Minotauro, Arianna, Dedalo e Icaro. Tappa ideale di domenica.", price: "Biglietto in loco", dur: "2–3 ore", level: 3, img: "images/backgrounds/extra-cnosso.webp" },
    { tag: "Gusto", title: "Food tour di Heraklion", desc: "Mercato, mura veneziane e degustazioni di prodotti tipici nel centro storico.", price: "Su richiesta", dur: "Mezza giornata", level: 2, img: "images/food/heraklion.webp" },
    { tag: "Esperienza", title: "Cucina cretese · Lasinthos", desc: "Corso di cucina all'Eco Park: mani in pasta e ricette dell'isola.", price: "Su richiesta", dur: "3 ore", level: 2, img: "images/food/extra-cucina.webp" },
    { tag: "Sapori", title: "Degustazione d'olio", desc: "Omalia Olive Press, a Malia: l'EVO cretese tra i migliori del Mediterraneo.", price: "≈ 15 €", dur: "1 ora", level: 2, img: "images/food/extra-olio.webp" },
    { tag: "Borghi", title: "Villaggio di Kritsa", desc: "Vicoli tradizionali nell'entroterra, lontano dalla costa turistica.", price: "Ingresso libero", dur: "1–2 ore", level: 1, img: "images/backgrounds/extra-kritsa.webp" },
  ];
  function extras() {
    const grid = $("#extrasGrid"); if (!grid) return;
    grid.innerHTML = EXTRAS.map((x) => `
      <article class="xcard" data-reveal>
        <img src="${x.img}" alt="${x.title}" loading="lazy" />
        <div class="xcard__top">
          <span class="xcard__tag">${x.tag}</span>
          <span class="xcard__level" aria-label="Livello di interesse ${x.level} su 3" title="Interesse ${x.level}/3">
            ${[1,2,3].map((n) => `<i class="${n <= x.level ? "on" : ""}"></i>`).join("")}
          </span>
        </div>
        <h3>${x.title}</h3>
        <p>${x.desc}</p>
        <div class="xcard__foot">
          <span class="xcard__price">${x.price}</span>
          <span class="xcard__dur">${x.dur}</span>
        </div>
      </article>`).join("");
  }

  /* ---------------------------------------------------------
     12. EAT (magazine layout + filters)
  --------------------------------------------------------- */
  const REST = [
    { cat: "cena", feat: true, name: "Taverne del centro storico · Malia", rev: "Dakos, formaggi locali, olive e agnello cotto lento tra i vicoli in pietra. Il raki di fine cena è quasi sempre offerto: la prima sera giusta per tutto il gruppo.", price: "€€", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80", lat: 35.2876, lng: 25.4615 },
    { cat: "colazione", name: "Caffè greco al porto", rev: "Frappé freddo e bougatsa per cominciare lenti.", price: "€", img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&auto=format&fit=crop&q=80", lat: 35.2890, lng: 25.4500 },
    { cat: "street food", name: "Souvlaki & gyros", rev: "Pita gyros da mangiare in piedi, il classico cretese.", price: "€", img: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=800&auto=format&fit=crop&q=80", lat: 35.2882, lng: 25.4592 },
    { cat: "pranzo", wide: true, name: "Taverna sul mare · Plaka", rev: "Pesce fresco fronte Spinalonga: pranzo lungo guardando l'isola-fortezza. Una delle esperienze più autentiche del weekend.", price: "€€", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80", lat: 35.2960, lng: 25.7380 },
    { cat: "cena", name: "Ristoranti del Lago · Agios Nikolaos", rev: "Cucina vista mare attorno al Lago Voulismeni.", price: "€€", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=80", lat: 35.1903, lng: 25.7160 },
    { cat: "dolci", name: "Lichnarakia · Heraklion", rev: "Dolcetti al formaggio e caffè greco nel centro storico, prima del volo.", price: "€", img: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&auto=format&fit=crop&q=80", lat: 35.3387, lng: 25.1442 },
  ];
  function eat() {
    const grid = $("#eatGrid"), filters = $("#eatFilters"); if (!grid) return;
    const cats = ["tutti", ...new Set(REST.map((r) => r.cat))];
    filters.innerHTML = cats.map((c, i) => `<button class="${i === 0 ? "is-active" : ""}" data-cat="${c}" data-cursor="hover">${c[0].toUpperCase()+c.slice(1)}</button>`).join("");
    const pin = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    const card = (r) => `
      <article class="rest" data-cat="${r.cat}" data-reveal>
        <div class="rest__img"><img src="${r.img}" alt="${r.name}" loading="lazy" /><span class="rest__cat">${r.cat}</span></div>
        <div class="rest__body">
          <h3 class="rest__name">${r.name}</h3>
          <p class="rest__rev">${r.rev}</p>
          <div class="rest__foot">
            <span class="rest__price">${r.price}</span>
            <a class="rest__map" href="https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}" target="_blank" rel="noopener" data-cursor="hover">${pin} Maps</a>
          </div>
        </div>
      </article>`;
    grid.innerHTML = REST.map(card).join("");
    filters.addEventListener("click", (e) => {
      const btn = e.target.closest("button"); if (!btn) return;
      $$("button", filters).forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const cat = btn.dataset.cat;
      $$(".rest", grid).forEach((el) => el.classList.toggle("is-hidden", cat !== "tutti" && el.dataset.cat !== cat));
    });
  }

  /* ---------------------------------------------------------
     13. NIGHT (dove uscire)
  --------------------------------------------------------- */
  const NIGHTS = [
    {
      when: "Venerdì",
      title: "La prima sera",
      mood: "Warm-up · autentico",
      desc: "Si parte piano, per fare gruppo. Il welcome drink è già incluso nel pacchetto, poi i vicoli del centro storico di Malia — lontano dal caos della strip. Se trovate una taverna con la lyra dal vivo, fermatevi: è l'anima dell'isola.",
      img: "https://images.unsplash.com/photo-1545128485-c400e7702796?w=800&auto=format&fit=crop&q=80",
      spots: [
        { n: "Centro storico di Malia", t: "Taverne, raki & lyra dal vivo" },
        { n: "Bar Loco", t: "Cocktail e musica, ritmo soft" },
        { n: "Cloud Nine", t: "Primo giro sulla strip" },
      ],
    },
    {
      when: "Sabato",
      title: "La grande notte",
      mood: "Peak · club fino all'alba",
      desc: "Dopo la cena di arrivederci, la Beach Road di Malia si accende: è la strip dei club, una porta dopo l'altra. Musica alta, DJ set e il gruppo al completo. La notte da ricordare.",
      img: "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=800&auto=format&fit=crop&q=80",
      spots: [
        { n: "Candy Club", t: "Il club più grande di Malia" },
        { n: "Zig Zag · Malibu", t: "House & commercial, pista piena" },
        { n: "Apollo", t: "Ultima tappa, si chiude all'alba" },
      ],
    },
  ];
  function night() {
    const grid = $("#nightGrid"); if (!grid) return;
    grid.innerHTML = NIGHTS.map((n) => `
      <article class="nightcard" data-reveal>
        <div class="nightcard__media"><img src="${n.img}" alt="${n.title} a Malia" loading="lazy" /><span class="nightcard__when">${n.when}</span></div>
        <div class="nightcard__body">
          <h3 class="nightcard__title">${n.title}</h3>
          <p class="nightcard__mood">${n.mood}</p>
          <p class="nightcard__desc">${n.desc}</p>
          <ul class="nightcard__spots">
            ${n.spots.map((s) => `<li><span class="spot__name">${s.n}</span><span class="spot__note">${s.t}</span></li>`).join("")}
          </ul>
        </div>
      </article>`).join("");
  }

  /* ---------------------------------------------------------
     13b. IL GIRO DI MALIA — discoteche, selezione multipla (localStorage)
  --------------------------------------------------------- */
  const CLUBS = [
    { n: "Cloud Nine", g: "Cocktail · start", d: "Aperitivo e primo giro prima di buttarsi nella strip." },
    { n: "Bar Loco", g: "Indie · rock", d: "Cocktail e musica suonata, ritmo soft per scaldarsi." },
    { n: "Candy Club", g: "Mainstream", d: "Il più grande di Malia: più piste, commercial e hit." },
    { n: "Zig Zag", g: "House · EDM", d: "DJ set elettronici, la pista che spinge di più." },
    { n: "Malibu Club", g: "Commercial", d: "Giovane e scatenato, tormentoni a tutto volume." },
    { n: "Zoo Bar", g: "Party games", d: "Shottini, giochi e atmosfera goliardica." },
    { n: "Help Bar", g: "Dance", d: "Storico della Beach Road, sempre pieno." },
    { n: "Apollo", g: "Late night", d: "L'ultima tappa, si chiude quando sorge il sole." },
  ];
  function clubs() {
    const list = $("#clubList"); if (!list) return;
    const KEY = "crete-clubs-v1";
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) {}
    const count = $("#crawlCount");
    const refresh = () => {
      const n = Object.values(saved).filter(Boolean).length;
      if (count) count.textContent = n === 0 ? "Tocca i locali" : `${n} nel tuo giro`;
    };
    list.innerHTML = CLUBS.map((c, i) => `
      <li>
        <button class="club ${saved[i] ? "is-on" : ""}" data-i="${i}" aria-pressed="${!!saved[i]}" data-cursor="hover">
          <span class="club__check" aria-hidden="true"></span>
          <span class="club__name">${c.n}</span>
          <span class="club__genre">${c.g}</span>
          <span class="club__desc">${c.d}</span>
        </button>
      </li>`).join("");
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".club"); if (!btn) return;
      const i = btn.dataset.i, on = !saved[i];
      saved[i] = on;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
      localStorage.setItem(KEY, JSON.stringify(saved));
      refresh();
    });
    refresh();
  }

  /* ---------------------------------------------------------
     14. ROSTER (18 participants) — x = numero di WeRoad fatti
  --------------------------------------------------------- */
  const PEOPLE = [
    { n: "Francesca Dias", x: 2, age: 32 },
    { n: "Bryanna Netto de Araujo", x: 0, age: 25 },
    { n: "Omayma El Kaddouri", x: 0, age: 26 },
    { n: "Lorenzo Proietti", x: 1, age: 31 },
    { n: "Cecilia Sala", x: 7, age: 28 },
    { n: "Salvatore Semprebuono", x: 1, age: 32 },
    { n: "Marco Bacci", x: 2, age: 31 },
    { n: "Stefania Spagnoletti", x: 1, age: 30 },
    { n: "Irene Cannello", x: 1, age: 33 },
    { n: "Davide Saggese", x: 4, age: 34 },
    { n: "Mariam Scuderi", x: 0, age: 21 },
    { n: "Fabio Mazzotta", x: 0, age: 46 },
    { n: "Ivan Vinciguerra", x: 0, age: 28 },
    { n: "Vincenzo Menga", x: 0, age: 31 },
    { n: "Valentina Paglia", x: 4 },
    { n: "Veronica Roppoli", x: 4, age: 33 },
    { n: "Luciano Cancelli", x: 2, age: 35 },
    { n: "Salvatore Lubello", x: 0 },
  ];
  const expLabel = (x) => (x === 0 ? "Primo WeRoad" : `${x}° WeRoad`);
  function roster() {
    const grid = $("#rosterGrid"); if (!grid) return;
    grid.innerHTML = PEOPLE.map((p) => `
      <li class="rmember">
        <span class="rmember__name">${p.n}</span>
        <span class="rmember__exp">${expLabel(p.x)}</span>
      </li>`).join("");
  }

  /* ---------------------------------------------------------
     14b. ROOMING — 4 triple + 3 doppie (+ eventuale mixed)
         Assegna i nomi dentro people: [] quando confermati.
  --------------------------------------------------------- */
  const COORD = "Davide Janiri"; // coordinatore, dorme col gruppo
  const ROOMS = [
    { type: "Tripla", beds: 3, people: ["Davide Janiri", "Vincenzo Menga", "Marco Bacci"] },
    { type: "Tripla", beds: 3, people: ["Francesca Dias", "Veronica Roppoli", "Mariam Scuderi"] },
    { type: "Tripla", beds: 3, people: ["Irene Cannello", "Stefania Spagnoletti", "Cecilia Sala"] },
    { type: "Doppia", beds: 2, people: ["Salvatore Lubello", "Fabio Mazzotta"] },
    { type: "Tripla", beds: 3, people: ["Ivan Vinciguerra", "Lorenzo Proietti", "Luciano Cancelli"] },
    { type: "Doppia", beds: 2, people: ["Bryanna Netto de Araujo", "Omayma El Kaddouri"] },
    { type: "Tripla", beds: 3, people: ["Valentina Paglia", "Davide Saggese", "Salvatore Semprebuono"] },
  ];
  function rooming() {
    const grid = $("#roomGrid"); if (!grid) return;

    const triples = ROOMS.filter(r => r.type === "Tripla");
    const doubles = ROOMS.filter(r => r.type === "Doppia");

    function renderCard(r) {
      const people = r.people.map(name => {
        if (!name) return `<li class="room__person room__person--empty">Da assegnare</li>`;
        const isCoord = name === COORD;
        return `<li class="room__person">${name}${isCoord ? '<span class="room__coord">coord.</span>' : ""}</li>`;
      }).join("");
      const cls = r.type === "Tripla" ? "room--triple" : "room--double";
      return `<article class="room ${cls}" data-reveal><ul class="room__people">${people}</ul></article>`;
    }

    grid.innerHTML = `
      <div class="room-group room-group--triple">
        <p class="room-group__label">Triple <span>${triples.length}</span></p>
        <div class="room-group__grid">${triples.map(renderCard).join("")}</div>
      </div>
      <div class="room-group room-group--double">
        <p class="room-group__label">Doppie <span>${doubles.length}</span></p>
        <div class="room-group__grid">${doubles.map(renderCard).join("")}</div>
      </div>`;

    // nascondi aside (tutte le camere sono assegnate)
    const aside = $("#roomAside");
    aside && (aside.innerHTML = "");
    $(".rooming__layout")?.classList.add("rooming__layout--full");
  }

  /* ---------------------------------------------------------
     15. WEATHER + SUN
  --------------------------------------------------------- */
  const WEATHER = [
    { day: "Ven 10", temp: 29, cond: "Sereno", rise: "06:18", set: "20:48" },
    { day: "Sab 11", temp: 30, cond: "Sole e brezza", rise: "06:19", set: "20:47" },
    { day: "Dom 12", temp: 28, cond: "Poco nuvoloso", rise: "06:19", set: "20:47" },
  ];
  const SUN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round"/></svg>';
  function weather() {
    const wrap = $("#weatherCards"); if (!wrap) return;
    wrap.innerHTML = WEATHER.map((w) => `
      <article class="wcard" data-reveal>
        <p class="wcard__day">${w.day} luglio</p>
        <div class="wcard__temp">${SUN_SVG}${w.temp}°</div>
        <p class="wcard__cond">${w.cond}</p>
        <dl class="wcard__sun">
          <div><dt>Alba</dt><dd>${w.rise}</dd></div>
          <div><dt>Tramonto</dt><dd>${w.set}</dd></div>
        </dl>
      </article>`).join("");
  }

  /* ---------------------------------------------------------
     16. FAQ (accordion)
  --------------------------------------------------------- */
  const FAQ = [
    { q: "Come funziona la cassa comune?", a: "Mettiamo una quota a testa in un fondo unico. Copre la tassa di soggiorno (≈ 3 € a notte a persona, quindi 6 € sulle 2 notti), i transfer in van sull'isola e le attività di gruppo opzionali (es. Cnosso). Se l'hotel impone la colazione (9 € a testa a notte) rientra anche quella. Quel che avanza si ridivide a fine viaggio." },
    { q: "Noleggiamo un'auto?", a: "No: per sole 48h i tempi di ritiro/riconsegna non valgono la pena. Ci muoviamo con un van privato prenotato (transfer aeroporto, escursione del sabato e rientro). Per le attività di gruppo non devi pensare a nulla." },
    { q: "L'escursione in barca è inclusa?", a: "Sì, la crociera nella Baia di Mirabello del sabato è pagata in anticipo. A bordo: drink di benvenuto al raki, giochi galleggianti e anguria. Ritrovo a Elounda verso le 10:15, partenza alle 11:00 (~4h30)." },
    { q: "Cosa devo portare?", a: "Costume, crema solare alta, scarpe da scoglio (per snorkeling e cale) e contanti per la cassa comune. La checklist completa è nella sezione «Lo zaino», salvabile sul telefono." },
    { q: "Che valuta si usa?", a: "Euro. Le carte sono accettate quasi ovunque, ma porta contanti per le taverne più piccole e per i transfer." },
    { q: "Cosa si fa la domenica?", a: "Dipende dall'orario del volo: o ultimo mare a Voulisma Beach (la «caraibica» di Creta), o il Palazzo di Cnosso, con un'ultima passeggiata e pranzo a Heraklion prima del gate." },
  ];
  function faq() {
    const list = $("#faqList"); if (!list) return;
    list.innerHTML = FAQ.map((f) => `
      <div class="qa">
        <button class="qa__q" aria-expanded="false">${f.q}<span class="plus" aria-hidden="true"></span></button>
        <div class="qa__a"><p>${f.a}</p></div>
      </div>`).join("");
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".qa__q"); if (!btn) return;
      const qa = btn.parentElement, ans = qa.querySelector(".qa__a");
      const open = qa.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      ans.style.maxHeight = open ? ans.scrollHeight + "px" : "0";
    });
  }

  /* ---------------------------------------------------------
     16b. IMAGE FALLBACK — broken/blocked image → Aegean gradient
  --------------------------------------------------------- */
  function imageFallbacks() {
    const onErr = (img) => {
      const host = img.closest("figure, .hero__media, .night__bg, .countdown__bg, .footer__bg, .rest__img, .ncard__img, .day__media, .hotel__media, .xcard") || img.parentElement;
      if (host) host.classList.add("img-missing");
      img.style.visibility = "hidden";
    };
    $$("img").forEach((img) => {
      if (img.complete && img.naturalWidth === 0) onErr(img);
      img.addEventListener("error", () => onErr(img), { once: true });
    });
  }

  /* ---------------------------------------------------------
     17. PWA service worker
  --------------------------------------------------------- */
  function pwa() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
    }
  }

  /* ---------------------------------------------------------
     BOOT
  --------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("is-loading");
    // render data sections first (timeline.js/maps.js render their own)
    flights(); getting(); transfers(); extras(); eat(); night(); clubs(); roster(); rooming(); weather(); faq(); kitty(); pack();
    imageFallbacks();
    // then wire motion (after DOM exists)
    preloader(); smoothScroll(); anchorScroll(); navState(); mobileMenu(); cursor(); countdown(); pwa();
    // reveals last so it catches injected nodes (call directly — requestAnimationFrame
    // is paused in background tabs, which would leave content stuck invisible)
    reveals();
  });
})();
