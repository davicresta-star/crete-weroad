/* ============================================================
   CRETE · WeRoad — maps.js
   Dependency-free, offline-safe stylized map for the hotel.
   No API key required (works on GitHub Pages + PWA offline).
   To use a real interactive map, swap renderHotelMap() with a
   Leaflet / Google Maps embed — see README.
   ============================================================ */

const HOTEL = {
  name: "Primavera Beach Hotel · Stalida",
  // Stalida (Stalis), costa orientale di Creta — change these to relocate the pin/link
  lat: 35.3019,
  lng: 25.3886,
};

function gmapsLink(lat, lng, label) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `(${encodeURIComponent(label)})` : ""}`;
}

function renderHotelMap() {
  const el = document.getElementById("hotelMap");
  if (!el) return;

  el.innerHTML = `
    <a class="minimap" href="${gmapsLink(HOTEL.lat, HOTEL.lng, HOTEL.name)}"
       target="_blank" rel="noopener" aria-label="Apri ${HOTEL.name} su Google Maps" data-cursor="hover">
      <svg viewBox="0 0 600 280" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#7FBFCB"/>
            <stop offset="1" stop-color="#3F7C8A"/>
          </linearGradient>
        </defs>
        <rect width="600" height="280" fill="url(#sea)"/>
        <!-- land mass -->
        <path d="M0,150 C90,120 150,170 240,150 C330,130 380,180 460,160 C520,148 560,170 600,158 L600,280 L0,280 Z"
              fill="#E4D5B7"/>
        <path d="M0,150 C90,120 150,170 240,150 C330,130 380,180 460,160 C520,148 560,170 600,158"
              fill="none" stroke="rgba(19,41,61,.18)" stroke-width="1.5"/>
        <!-- subtle roads -->
        <path d="M120,280 C160,230 200,210 260,200" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
        <path d="M420,280 C400,235 360,215 300,205" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="2"/>
        <!-- pin -->
        <g transform="translate(300,150)">
          <circle r="26" fill="rgba(19,41,61,.10)"/>
          <circle r="26" fill="none" stroke="#13293D" stroke-width="1" opacity=".4">
            <animate attributeName="r" values="14;30" dur="2.4s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".5;0" dur="2.4s" repeatCount="indefinite"/>
          </circle>
          <path d="M0,-18 C10,-18 16,-10 16,-2 C16,8 0,22 0,22 C0,22 -16,8 -16,-2 C-16,-10 -10,-18 0,-18 Z"
                fill="#13293D"/>
          <circle cy="-3" r="5" fill="#F7F4EC"/>
        </g>
      </svg>
      <span class="minimap__chip">
        <strong>Primavera Beach · Stalida</strong>
        <span>25–35 min da Heraklion · apri in Maps ↗</span>
      </span>
    </a>`;

  // inject minimap styles once
  if (!document.getElementById("minimap-css")) {
    const css = document.createElement("style");
    css.id = "minimap-css";
    css.textContent = `
      .minimap{position:relative;display:block;width:100%;height:100%}
      .minimap svg{width:100%;height:100%;display:block}
      .minimap__chip{position:absolute;left:14px;bottom:14px;background:rgba(251,250,245,.92);
        backdrop-filter:blur(8px);border-radius:10px;padding:.6rem .9rem;display:flex;flex-direction:column;
        box-shadow:0 8px 24px -12px rgba(19,41,61,.5);transition:transform .4s var(--ease)}
      .minimap:hover .minimap__chip{transform:translateY(-3px)}
      .minimap__chip strong{font-size:.9rem;color:var(--navy)}
      .minimap__chip span{font-size:.72rem;color:var(--ink-soft)}`;
    document.head.appendChild(css);
  }
}

document.addEventListener("DOMContentLoaded", renderHotelMap);
