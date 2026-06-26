/* ═══════════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════════ */
let currentLang = "ar";

const UI = {
  ar: {
    dashboard:"لوحة المدارس الذكية", subtitle:"إدارة المدارس والزيارات الميدانية",
    filters:"البحث والفلترة", filterEngineer:"فلترة حسب المهندس",
    searchLabel:"بحث عن مدرسة", search:"اكتب اسم المدرسة...",
    totalSchools:"إجمالي المدارس", results:"النتائج",
    schoolList:"قائمة المدارس", selectSchool:"اختر مدرسة",
    schoolDetails:"تفاصيل المدرسة",
    distance:"المسافة", time:"الوقت", engineer:"المهندس",
    email:"البريد", phone:"الهاتف",
    openMaps:"فتح في Google Maps", headquarters:"المركز الرئيسي",
    all:"كل المهندسين", unnamed:"بدون اسم",
    calculating:"جارٍ الحساب...", noData:"غير محدد", notAvail:"غير متوفر",
    filtersBtn:"الفلاتر", schoolsBtn:"المدارس"
  },
  en: {
    dashboard:"Smart School Dashboard", subtitle:"School and field-visit management",
    filters:"Search & Filters", filterEngineer:"Filter by Engineer",
    searchLabel:"Search for a School", search:"Type school or engineer name...",
    totalSchools:"Total Schools", results:"Results",
    schoolList:"School List", selectSchool:"Select a school",
    schoolDetails:"School Details",
    distance:"Distance", time:"Travel Time", engineer:"Engineer",
    email:"Email", phone:"Phone",
    openMaps:"Open in Google Maps", headquarters:"Main Headquarters",
    all:"All Engineers", unnamed:"Unnamed school",
    calculating:"Calculating...", noData:"Not specified", notAvail:"Not available",
    filtersBtn:"Filters", schoolsBtn:"Schools"
  }
};

const T = () => UI[currentLang];

/* ═══════════════════════════════════════════════
   MAP
═══════════════════════════════════════════════ */
const CENTER_LAT = 23.679486;
const CENTER_LNG = 53.691098;

const map = L.map("map", { zoomControl: true, attributionControl: false })
              .setView([CENTER_LAT, CENTER_LNG], 8);

const voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",{attribution:"© CARTO"}).addTo(map);
const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{attribution:"© Esri"});
L.control.layers({"Voyager":voyager,"Satellite":satellite}).addTo(map);

const centerIcon = L.divIcon({
  className: "",
  html: '<div class="center-pin"></div>',
  iconSize: [22, 22], iconAnchor: [11, 11]
});
const schoolIcon = L.divIcon({
  className: "",
  html: '<div class="school-pin"></div>',
  iconSize: [16, 16], iconAnchor: [8, 8]
});

L.marker([CENTER_LAT, CENTER_LNG], { icon: centerIcon }).addTo(map);

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
const state = { allSchools: [], markers: [], selected: null };

/* ═══════════════════════════════════════════════
   DOM
═══════════════════════════════════════════════ */
const g = id => document.getElementById(id);
const dom = {
  // Mobile counts
  totalSchools:   g("totalSchools"),
  visibleSchools: g("visibleSchools"),
  // Desktop counts
  totalSchoolsD:   g("totalSchoolsD"),
  visibleSchoolsD: g("visibleSchoolsD"),
  // Mobile filter inputs
  engineerFilter: g("engineerFilter"),
  searchInput:    g("searchInput"),
  // Desktop filter inputs
  engineerFilterD: g("engineerFilterD"),
  searchInputD:    g("searchInputD"),
  // Lists
  schoolList:  g("schoolList"),   // mobile drawer
  schoolListD: g("schoolListD"),  // desktop sidebar
  selectionHint: g("selectionHint"),
  // Info panel
  infoPanel:         g("schoolInfoPanel"),
  infoSchoolName:    g("schoolInfoPanel").querySelector(".info-school-name"),
  distanceValue:     g("distanceValue"),
  timeValue:         g("timeValue"),
  engineerNameValue: g("engineerNameValue"),
  engineerEmailValue:g("engineerEmailValue"),
  engineerPhoneValue:g("engineerPhoneValue"),
  googleMapsBtn:     g("googleMapsBtn"),
  closeInfo:         g("closeInfo"),
  // FABs
  fabFilter:      g("fabFilter"),
  fabList:        g("fabList"),
  fabFilterLabel: g("fabFilterLabel"),
  fabListLabel:   g("fabListLabel"),
  // Drawers
  filterDrawer: g("filterDrawer"),
  listDrawer:   g("listDrawer"),
  backdrop:     g("drawerBackdrop"),
  closeFilter:  g("closeFilter"),
  closeList:    g("closeList"),
  // Lang
  langToggleD:   g("langToggleD"),
  langToggleMap: g("langToggleMap"),
};

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function toNumber(v) { const n = Number(v); return isFinite(n) ? n : null; }
function isEmail(v)  { return String(v || "").includes("@"); }

function engineerName(s) {
  const arr = currentLang === "en"
    ? [s.engineer_name_en, s.engineer_name_ar]
    : [s.engineer_name_ar, s.engineer_name_en];
  return arr.find(v => v && !isEmail(v)) || "";
}
function engineerEmail(s) {
  return s.engineer_email || s["Field Engineer Email"] || s["FE Email"] || s.engineerEmail || "";
}
function engineerPhone(s) {
  return s.engineer_phone || s["Field Engineer  Contact"] || s["FE phone"] || s.engineerPhone || "";
}
function schoolName(s) {
  const arr = currentLang === "en"
    ? [s.school_name_en, s.school_name_ar, s.name_en, s.name_ar, s["School Name"]]
    : [s.school_name_ar, s.school_name_en, s.name_ar, s.name_en, s["School Name"]];
  return arr.find(Boolean) || "";
}
function fmtKm(km)  { return `${km.toFixed(2)} كم`; }
function fmtMin(sec) {
  const m = Math.round(sec / 60), h = Math.floor(m / 60), r = m % 60;
  if (h && r) return `${h} ساعة ${r} دقيقة`;
  if (h)      return `${h} ساعة`;
  return `${m} دقيقة`;
}

/* ═══════════════════════════════════════════════
   DRAWER SYSTEM
═══════════════════════════════════════════════ */
let activeDrawer = null;

function openDrawer(drawer) {
  if (activeDrawer) _closeDrawer(activeDrawer, false);
  activeDrawer = drawer;
  dom.backdrop.style.display = "block";
  requestAnimationFrame(() => {
    dom.backdrop.classList.add("active");
    drawer.classList.add("open");
  });
  document.body.style.overflow = "hidden";
}

function _closeDrawer(drawer, withFade = true) {
  drawer.classList.remove("open");
  dom.backdrop.classList.remove("active");
  if (withFade) {
    setTimeout(() => { if (!activeDrawer) dom.backdrop.style.display = "none"; }, 300);
  } else {
    dom.backdrop.style.display = "none";
  }
  document.body.style.overflow = "";
  activeDrawer = null;
}

function closeActiveDrawer() {
  if (activeDrawer) _closeDrawer(activeDrawer);
}

dom.fabFilter.addEventListener("click",   () => openDrawer(dom.filterDrawer));
dom.fabList.addEventListener("click",     () => openDrawer(dom.listDrawer));
dom.closeFilter.addEventListener("click", closeActiveDrawer);
dom.closeList.addEventListener("click",   closeActiveDrawer);
dom.backdrop.addEventListener("click",    closeActiveDrawer);

/* ═══════════════════════════════════════════════
   INFO PANEL
═══════════════════════════════════════════════ */
function showInfo()  {
  dom.infoPanel.style.display = "block";
  document.body.classList.add("info-open");
}
function hideInfo()  {
  dom.infoPanel.style.display = "none";
  document.body.classList.remove("info-open");
}
dom.closeInfo.addEventListener("click", hideInfo);

function resetInfo() {
  hideInfo();
  dom.distanceValue.textContent     = "—";
  dom.timeValue.textContent         = "—";
  dom.engineerNameValue.textContent  = T().noData;
  dom.engineerEmailValue.textContent = T().notAvail;
  dom.engineerPhoneValue.textContent = T().notAvail;
  dom.googleMapsBtn.href = "#";
  dom.googleMapsBtn.classList.add("disabled");
}

function fillInfo(school, route = null) {
  const name = schoolName(school) || T().unnamed;
  dom.infoSchoolName.textContent = name;
  const idEl = document.getElementById("schoolIdValue");
  if (idEl) idEl.textContent = school.school_id || "";
  if (dom.selectionHint) dom.selectionHint.textContent = name;

  dom.engineerNameValue.textContent  = engineerName(school)  || T().noData;
  dom.engineerEmailValue.textContent = engineerEmail(school) || T().notAvail;
  dom.engineerPhoneValue.textContent = engineerPhone(school) || T().notAvail;

  const lat = school.Latitude, lng = school.Longitude;
  dom.googleMapsBtn.href = `https://www.google.com/maps/dir/${CENTER_LAT},${CENTER_LNG}/${lat},${lng}`;
  dom.googleMapsBtn.classList.remove("disabled");

  dom.distanceValue.textContent = route ? fmtKm(route.totalDistance / 1000)  : T().calculating;
  dom.timeValue.textContent     = route ? fmtMin(route.totalTime)             : T().calculating;

  showInfo();
}

/* ═══════════════════════════════════════════════
   FILTER / RENDER
═══════════════════════════════════════════════ */
function syncSelect(src, targets) { targets.forEach(t => { if (t !== src) t.value = src.value; }); }
function syncText(src, targets)   { targets.forEach(t => { if (t !== src) t.value = src.value; }); }

function populateEngineers() {
  const names = [...new Set(state.allSchools.map(engineerName).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ar"));
  const opts = `<option value="all">${T().all}</option>` +
    names.map(n => `<option value="${n}">${n}</option>`).join("");
  [dom.engineerFilter, dom.engineerFilterD].forEach(el => {
    const prev = el.value;
    el.innerHTML = opts;
    if (names.includes(prev)) el.value = prev;
  });
}

function renderList() {
  const engVal = dom.engineerFilterD.value || dom.engineerFilter.value || "all";
  const kw     = (dom.searchInputD.value || dom.searchInput.value).trim().toLowerCase();
  let visible  = 0;

  state.markers.forEach(e => {
    const nm  = (schoolName(e.school) || "").toLowerCase();
    const eng = (engineerName(e.school) || "").toLowerCase();
    const ok  = (engVal === "all" || engineerName(e.school) === engVal) &&
                (!kw || nm.includes(kw) || eng.includes(kw));

    e.itemM.style.display = ok ? "" : "none";
    e.itemD.style.display = ok ? "" : "none";

    if (ok) {
      if (!map.hasLayer(e.marker)) e.marker.addTo(map);
      visible++;
    } else {
      if (map.hasLayer(e.marker)) map.removeLayer(e.marker);
      e.itemM.classList.remove("active");
      e.itemD.classList.remove("active");
    }
  });

  dom.visibleSchools.textContent  = visible;
  dom.visibleSchoolsD.textContent = visible;

  const bounds = state.markers
    .filter(e => map.hasLayer(e.marker))
    .map(e => [e.school.Latitude, e.school.Longitude]);
  if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
}

/* ═══════════════════════════════════════════════
   ROUTING — Google Routes API (computeRoutes) + OSRM fallback
═══════════════════════════════════════════════ */

// ← ضع مفتاحك هنا (يجب تفعيل Routes API في Google Cloud Console)
const GOOGLE_API_KEY = "AIzaSyC_3RU1DpqNImb0FviUQpiclZxliyF3AT0";

// Polylines drawn on the Leaflet map
let routePolylines = [];

function clearRoutePolylines() {
  routePolylines.forEach(p => map.removeLayer(p));
  routePolylines = [];
}

// Decode Google's encoded polyline (Polyline Encoding Algorithm)
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function drawPolylineOnMap(latlngs) {
  routePolylines.push(L.polyline(latlngs, { color: "#5de0ff", opacity: 0.12, weight: 16 }).addTo(map));
  routePolylines.push(L.polyline(latlngs, { color: "#7c5cff", opacity: 0.90, weight: 6  }).addTo(map));
  routePolylines.push(L.polyline(latlngs, { color: "#ffffff", opacity: 0.60, weight: 2  }).addTo(map));
  map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [50, 50] });
}

// ── Google Routes API (computeRoutes) ──────────────────────────────────────
async function routeViaGoogle(school) {
  const body = {
    origin:      { location: { latLng: { latitude: CENTER_LAT, longitude: CENTER_LNG } } },
    destination: { location: { latLng: { latitude: school.Latitude, longitude: school.Longitude } } },
    travelMode:  "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    routeModifiers: { avoidTolls: false, avoidHighways: false },
    languageCode: "ar-AE",
    units: "METRIC"
  };

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      // Request only the fields we need (required by Routes API)
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error(`Google Routes API error: ${res.status}`);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error("No routes returned");

  const route       = data.routes[0];
  const distanceM   = route.distanceMeters;
  const durationSec = parseInt(route.duration, 10);   // "NNNs" → number
  const latlngs     = decodePolyline(route.polyline.encodedPolyline);

  drawPolylineOnMap(latlngs);
  fillInfo(school, { totalDistance: distanceM, totalTime: durationSec });
}

// ── OSRM fallback (free, no key needed) ───────────────────────────────────
async function routeViaOSRM(school) {
  const url = `https://router.project-osrm.org/route/v1/driving/` +
    `${CENTER_LNG},${CENTER_LAT};${school.Longitude},${school.Latitude}` +
    `?overview=full&geometries=polyline`;

  const res  = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error: ${res.status}`);
  const data = await res.json();
  if (!data.routes || data.routes.length === 0) throw new Error("No OSRM routes");

  const route       = data.routes[0];
  const distanceM   = route.distance;
  const durationSec = route.duration;
  const latlngs     = decodePolyline(route.geometry);

  drawPolylineOnMap(latlngs);
  fillInfo(school, { totalDistance: distanceM, totalTime: durationSec });
}

// ── Main entry: try Google first, fall back to OSRM ───────────────────────
async function drawRoute(school) {
  clearRoutePolylines();
  fillInfo(school);   // show panel immediately with "جارٍ الحساب..."

  // Update Google Maps open-link to show driving directions
  dom.googleMapsBtn.href =
    `https://www.google.com/maps/dir/${CENTER_LAT},${CENTER_LNG}/${school.Latitude},${school.Longitude}`;

  const useGoogle = GOOGLE_API_KEY && GOOGLE_API_KEY !== "YOUR_GOOGLE_API_KEY_HERE";

  try {
    if (useGoogle) {
      await routeViaGoogle(school);
    } else {
      await routeViaOSRM(school);
    }
  } catch (err) {
    console.warn("Primary routing failed, trying fallback:", err.message);
    try {
      await routeViaOSRM(school);
    } catch (err2) {
      console.error("Fallback also failed:", err2.message);
      fillInfo(school);   // show panel without distance/time
    }
  }
}

/* ═══════════════════════════════════════════════
   SELECTION
═══════════════════════════════════════════════ */
function clearActive() {
  state.markers.forEach(e => {
    e.itemM.classList.remove("active");
    e.itemD.classList.remove("active");
  });
}

function selectSchool(entry) {
  state.selected = entry.school;
  clearActive();
  entry.itemM.classList.add("active");
  entry.itemD.classList.add("active");
  fillInfo(entry.school);
  drawRoute(entry.school);
  map.flyTo([entry.school.Latitude, entry.school.Longitude], 10, { animate: true, duration: 1.1 });
  // Close list drawer on mobile
  if (activeDrawer === dom.listDrawer) closeActiveDrawer();
}

function makeItem(school) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "school-item";
  const sid = school.school_id
    ? `<span class="school-id-tag">${school.school_id}</span>`
    : "";
  btn.innerHTML = `<div class="school-title">${schoolName(school) || T().unnamed}</div>${sid}`;
  return btn;
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
function normalise(raw) {
  const lat = toNumber(raw.latitude ?? raw.Latitude);
  const lng = toNumber(raw.longitude ?? raw.Longitude);
  if (lat === null || lng === null) return null;
  return { ...raw, Latitude: lat, Longitude: lng };
}

async function init() {
  resetInfo();
  try {
    const data    = await (await fetch("schools.json")).json();
    const schools = data.map(normalise).filter(Boolean);

    // Repair engineer names stored as emails
    const byEmail = new Map();
    schools.forEach(s => {
      const n = s.engineer_name_ar || s.engineer_name_en;
      const e = (s.engineer_email || s["Field Engineer Email"] || "").toLowerCase();
      if (n && e && !isEmail(n)) byEmail.set(e, n);
    });
    schools.forEach(s => {
      const e = (s.engineer_email || s["Field Engineer Email"] || "").toLowerCase();
      const n = s.engineer_name_ar || s.engineer_name_en;
      if ((!n || isEmail(n)) && byEmail.has(e)) {
        s.engineer_name_ar = s.engineer_name_en = byEmail.get(e);
      }
    });

    state.allSchools = schools;
    const count = schools.length;
    [dom.totalSchools, dom.totalSchoolsD].forEach(el => el.textContent = count);
    [dom.visibleSchools, dom.visibleSchoolsD].forEach(el => el.textContent = count);

    populateEngineers();

    schools.forEach(school => {
      const marker = L.marker([school.Latitude, school.Longitude], { icon: schoolIcon }).addTo(map);
      const itemM  = makeItem(school);   // mobile list
      const itemD  = makeItem(school);   // desktop list
      const entry  = { school, marker, itemM, itemD };

      itemM.addEventListener("click",  () => selectSchool(entry));
      itemD.addEventListener("click",  () => selectSchool(entry));
      marker.on("click",               () => selectSchool(entry));

      dom.schoolList.appendChild(itemM);
      dom.schoolListD.appendChild(itemD);
      state.markers.push(entry);
    });

    const bounds = schools.map(s => [s.Latitude, s.Longitude]);
    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });

    // Wire filter events — mobile
    dom.engineerFilter.addEventListener("change", e => {
      syncSelect(e.target, [dom.engineerFilterD]);
      renderList();
    });
    dom.searchInput.addEventListener("input", e => {
      syncText(e.target, [dom.searchInputD]);
      renderList();
    });
    // Wire filter events — desktop
    dom.engineerFilterD.addEventListener("change", e => {
      syncSelect(e.target, [dom.engineerFilter]);
      renderList();
    });
    dom.searchInputD.addEventListener("input", e => {
      syncText(e.target, [dom.searchInput]);
      renderList();
    });

  } catch (err) {
    console.error(err);
    dom.engineerNameValue.textContent  = "تأكد من schools.json";
    dom.engineerEmailValue.textContent = "وشغّل الصفحة عبر Live Server";
    dom.engineerPhoneValue.textContent = "ثم أعد التحميل";
    showInfo();
  }
}

/* ═══════════════════════════════════════════════
   LANGUAGE
═══════════════════════════════════════════════ */
function applyLang() {
  const t = T();
  document.documentElement.lang = currentLang;
  document.documentElement.dir  = currentLang === "ar" ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach(el => {
    if (t[el.dataset.i18n] !== undefined) el.textContent = t[el.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const k = el.dataset.i18nPlaceholder;
    if (t[k]) el.placeholder = t[k];
  });

  const label = currentLang === "ar" ? "English" : "العربية";
  [dom.langToggleD, dom.langToggleMap].forEach(el => { if (el) el.textContent = label; });
  dom.fabFilterLabel.textContent = t.filtersBtn;
  dom.fabListLabel.textContent   = t.schoolsBtn;

  populateEngineers();

  state.markers.forEach(e => {
    const name = schoolName(e.school) || t.unnamed;
    e.itemM.querySelector(".school-title").textContent = name;
    e.itemD.querySelector(".school-title").textContent = name;
  });

  if (state.selected) fillInfo(state.selected);
  renderList();
}

[dom.langToggleD, dom.langToggleMap].forEach(btn => {
  if (btn) btn.addEventListener("click", () => {
    currentLang = currentLang === "ar" ? "en" : "ar";
    applyLang();
  });
});

/* ── START ── */
init();
