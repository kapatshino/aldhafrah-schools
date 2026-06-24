/******************************************************
 * SMART SCHOOLS DASHBOARD - FULL APP.JS REBUILD
 * Features:
 * - Leaflet Map
 * - School markers
 * - Routing (FIXED shortest path logic)
 * - Search + Filters
 * - Engineer filtering
 * - Info panels
 ******************************************************/

/**********************
 * MAP INITIALIZATION
 **********************/
const map = L.map("map-stage", {
  zoomControl: true
}).setView([24.4539, 54.3773], 11);

// Base map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

/**********************
 * GLOBAL STATE
 **********************/
let schools = window.SCHOOLS || [];
let filteredSchools = [...schools];

let markersLayer = L.layerGroup().addTo(map);

let routeControl = null;
let currentSchool = null;
let userLocation = null;

/**********************
 * ICONS
 **********************/
const schoolIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

/**********************
 * UTILITIES
 **********************/
function fmtKm(meters) {
  return (meters / 1000).toFixed(2);
}

function fmtMin(seconds) {
  return Math.round(seconds / 60);
}

/**********************
 * USER LOCATION
 **********************/
function initUserLocation() {
  if (!navigator.geolocation) {
    userLocation = { lat: 24.4539, lng: 54.3773 };
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
    },
    () => {
      userLocation = { lat: 24.4539, lng: 54.3773 };
    }
  );
}

/**********************
 * MARKERS RENDER
 **********************/
function clearMarkers() {
  markersLayer.clearLayers();
}

function renderMarkers(list) {
  clearMarkers();

  list.forEach((school) => {
    if (!school.lat || !school.lng) return;

    const marker = L.marker([school.lat, school.lng], {
      icon: schoolIcon
    });

    marker.on("click", () => onSchoolSelect(school));

    marker.bindPopup(`
      <div>
        <strong>${school.name || "Unknown"}</strong><br/>
        ${school.engineer || ""}
      </div>
    `);

    markersLayer.addLayer(marker);
  });
}

/**********************
 * ROUTING ENGINE (FIXED)
 **********************/
const router = L.Routing.osrmv1({
  serviceUrl: "https://router.project-osrm.org/route/v1",
  profile: "driving"
});

function initRouting() {
  if (routeControl) {
    map.removeControl(routeControl);
  }

  routeControl = L.Routing.control({
    router: router,
    showAlternatives: true,
    fitSelectedRoutes: true,
    addWaypoints: false,
    draggableWaypoints: false,
    routeWhileDragging: false,
    show: false,
    createMarker: () => null,
    lineOptions: {
      styles: [{ color: "#1a73e8", weight: 5, opacity: 0.85 }]
    }
  });

  routeControl.on("routesfound", handleRoutesFound);

  routeControl.addTo(map);
}

/**********************
 * ROUTE SELECTION FIX (CORE FIX)
 **********************/
function handleRoutesFound(e) {
  const routes = e.routes;

  if (!routes || routes.length === 0) return;

  // 🔥 اختيار أقصر مسار فعلياً (مهم جداً)
  let bestRoute = routes[0];

  for (let i = 1; i < routes.length; i++) {
    if (routes[i].summary.totalDistance < bestRoute.summary.totalDistance) {
      bestRoute = routes[i];
    }
  }

  const distanceKm = fmtKm(bestRoute.summary.totalDistance);
  const timeMin = fmtMin(bestRoute.summary.totalTime);

  updateSchoolInfo(currentSchool, distanceKm, timeMin);
}

/**********************
 * ROUTE DRAW
 **********************/
function drawRoute(school) {
  if (!userLocation) initUserLocation();

  if (!routeControl) initRouting();

  routeControl.setWaypoints([
    L.latLng(userLocation.lat, userLocation.lng),
    L.latLng(school.lat, school.lng)
  ]);
}

/**********************
 * SCHOOL SELECT
 **********************/
function onSchoolSelect(school) {
  currentSchool = school;

  map.setView([school.lat, school.lng], 14);

  drawRoute(school);

  openSchoolPanel(school);
}

/**********************
 * PANEL UI
 **********************/
function openSchoolPanel(school) {
  const panel = document.getElementById("schoolInfoPanel");
  if (!panel) return;

  panel.classList.add("active");

  document.getElementById("schoolName").innerText = school.name || "-";
  document.getElementById("schoolEngineer").innerText = school.engineer || "-";
  document.getElementById("schoolPhone").innerText = school.phone || "-";
  document.getElementById("schoolEmail").innerText = school.email || "-";
}

/**********************
 * UPDATE INFO
 **********************/
function updateSchoolInfo(school, distanceKm, timeMin) {
  if (!school) return;

  const distEl = document.getElementById("schoolDistance");
  const timeEl = document.getElementById("schoolTime");

  if (distEl) distEl.innerText = `${distanceKm} km`;
  if (timeEl) timeEl.innerText = `${timeMin} min`;
}

/**********************
 * SEARCH SYSTEM
 **********************/
function searchSchools(query) {
  const q = (query || "").toLowerCase();

  filteredSchools = schools.filter((s) =>
    (s.name || "").toLowerCase().includes(q)
  );

  renderMarkers(filteredSchools);
}

/**********************
 * ENGINEER FILTER
 **********************/
function filterByEngineer(engineer) {
  if (!engineer) {
    filteredSchools = [...schools];
    renderMarkers(filteredSchools);
    return;
  }

  filteredSchools = schools.filter(
    (s) => (s.engineer || "") === engineer
  );

  renderMarkers(filteredSchools);
}

/**********************
 * RESET FILTERS
 **********************/
function resetFilters() {
  filteredSchools = [...schools];
  renderMarkers(filteredSchools);
}

/**********************
 * DISTANCE SORTING
 **********************/
function sortByDistance() {
  if (!userLocation) return;

  filteredSchools.sort((a, b) => {
    const da = getDistance(userLocation, a);
    const db = getDistance(userLocation, b);
    return da - db;
  });

  renderMarkers(filteredSchools);
}

function getDistance(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**********************
 * UI HOOKS
 **********************/
function bindUI() {
  const search = document.getElementById("searchInput");

  if (search) {
    search.addEventListener("input", (e) => {
      searchSchools(e.target.value);
    });
  }
}

/**********************
 * INIT APP
 **********************/
function initApp() {
  initUserLocation();
  renderMarkers(schools);
  bindUI();
}

initApp();

/**********************
 * DEBUG HELPERS
 **********************/
window.debugApp = {
  schools,
  map,
  routeControl,
  resetFilters,
  sortByDistance
};
