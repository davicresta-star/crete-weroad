/* ============================================================
   CRETE · WeRoad — timeline.js
   Renders the 3-day itinerary. Edit ITINERARY to change the trip.
   Layouts alternate automatically (left/right) via :nth-child CSS.
   ============================================================ */

const ITINERARY = [
  {
    num: "01",
    label: "Venerdì 10 luglio",
    title: "Arrivo, primo mare & sapori cretesi",
    img: "images/backgrounds/day1.webp",
    alt: "Lunga spiaggia sabbiosa della costa orientale di Creta",
    items: [
      { time: "Arrivo", t: "Atterraggio a Heraklion", s: "Transfer in van verso la base: Malia · Stalida · Hersonissos (25–35 min)." },
      { time: "Pomeriggio", t: "Primo tuffo a due passi", s: "Stalis Beach, Malia Beach o le baie di Sarandaris, a piedi dall'hotel." },
      { time: "Aperitivo", t: "Welcome meeting & welcome drink", s: "Birra greca e brindisi di gruppo: offre la cassa comune." },
      { time: "Sera", t: "Centro storico di Malia", s: "Vicoli in pietra e taverne autentiche, lontano dalla folla." },
      { time: "Cena", t: "Cucina cretese", s: "Dakos, formaggi, olive, agnello cotto lento e il raki di fine cena." },
      { time: "Notte", t: "Chicca: lyra dal vivo", s: "Se trovi una taverna con musica e danze tradizionali, fermati." }
    ]
  },
  {
    num: "02",
    label: "Sabato 11 luglio",
    title: "Baia di Mirabello, Elounda & tramonto",
    img: "images/backgrounds/day2.webp",
    alt: "L'isola-fortezza veneziana di Spinalonga vista dal mare",
    items: [
      { time: "10:15", t: "Ritrovo a Elounda", s: "Transfer da Malia/Stalida (~35 min). Meglio in anticipo per il punto barca." },
      { time: "11:00", t: "Escursione in barca · 4h30", s: "Pagata in anticipo dal TP. Drink di raki, giochi galleggianti e anguria a bordo." },
      { time: "in mare", t: "Spinalonga & Grotta di Barbarossa", s: "Poi le baie di Kolokytha e Skistra: soste per nuotare e snorkeling." },
      { time: "Pomeriggio", t: "Plaka o Agios Nikolaos", s: "Villaggio di pescatori sotto Spinalonga, o la cittadina sul Lago Voulismeni." },
      { time: "Rientro", t: "Chicca: degustazione d'olio", s: "Breve sosta a Kritsa o in un frantoio: l'EVO cretese è tra i migliori del Mediterraneo." },
      { time: "Sera", t: "Cena di arrivederci & movida", s: "Cena inclusa, poi serata a Malia, cuore della notte cretese." }
    ]
  },
  {
    num: "03",
    label: "Domenica 12 luglio",
    title: "Mare caraibico oppure il Minotauro",
    img: "images/backgrounds/day3.webp",
    alt: "Acque turchesi e sabbia chiara di una spiaggia cretese",
    items: [
      { time: "Mattina", t: "Dipende dall'orario del volo", s: "Si sceglie tra ultimo mare e cultura, poi rientro in aeroporto." },
      { time: "Mare", t: "Voulisma Beach", s: "La “caraibica di Creta”: acqua turchese e sabbia chiara. Presto = niente folla." },
      { time: "Cultura", t: "Palazzo di Cnosso", s: "Minotauro, Arianna, Dedalo e Icaro. A 25–30 min dalla base." },
      { time: "Pranzo", t: "Ultima passeggiata a Heraklion", s: "Caffè greco e lichnarakia nel centro storico prima del gate." }
    ]
  }
];

function renderTimeline() {
  const track = document.getElementById("timelineTrack");
  const tabsEl = document.getElementById("timelineTabs");
  if (!track || !tabsEl) return;

  // short weekday for the tab, derived from the label ("Venerdì 10 luglio" → "Venerdì 10")
  const shortDay = (label) => label.split(" ").slice(0, 2).join(" ");

  // --- Tabs (tablist) ---
  tabsEl.setAttribute("role", "tablist");
  tabsEl.innerHTML = ITINERARY.map((d, i) => `
    <button class="tl-tab${i === 0 ? " is-active" : ""}" role="tab"
            id="tl-tab-${i}" aria-controls="tl-panel-${i}" aria-selected="${i === 0}"
            tabindex="${i === 0 ? "0" : "-1"}" data-i="${i}" data-cursor="hover">
      <span class="tl-tab__num">${d.num}</span>
      <span class="tl-tab__day">${shortDay(d.label)}</span>
    </button>`).join("");

  // --- Panels ---
  track.innerHTML = ITINERARY.map((d, i) => `
    <article class="day${i === 0 ? " is-active" : ""}" role="tabpanel"
             id="tl-panel-${i}" aria-labelledby="tl-tab-${i}" ${i === 0 ? "" : "hidden"}>
      <figure class="day__media"><img src="${d.img}" alt="${d.alt}" loading="lazy" /></figure>
      <div class="day__info">
        <span class="day__num">${d.num}</span>
        <p class="day__label">${d.label}</p>
        <h3 class="day__title">${d.title}</h3>
        <div class="day__items">
          ${d.items.map((it) => `
            <div class="day__item">
              <span class="day__time">${it.time}</span>
              <div class="day__act"><strong>${it.t}</strong><span>${it.s}</span></div>
            </div>`).join("")}
        </div>
      </div>
    </article>`).join("");

  const tabs = [...tabsEl.querySelectorAll(".tl-tab")];
  const panels = [...track.querySelectorAll(".day")];

  const activate = (idx, focus = false) => {
    tabs.forEach((t, i) => {
      const on = i === idx;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    panels.forEach((p, i) => {
      const on = i === idx;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });
  };

  // click + keyboard (arrow / home / end) navigation
  tabsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".tl-tab"); if (!btn) return;
    activate(+btn.dataset.i);
  });
  tabsEl.addEventListener("keydown", (e) => {
    const cur = tabs.findIndex((t) => t.getAttribute("aria-selected") === "true");
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (cur + 1) % tabs.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (cur - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next !== null) { e.preventDefault(); activate(next, true); }
  });
}

document.addEventListener("DOMContentLoaded", renderTimeline);
