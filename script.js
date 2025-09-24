document.addEventListener("DOMContentLoaded", () => {
  const ipInput = document.getElementById("ip-input");
  const searchBtn = document.getElementById("search-btn");
  const myIpBtn = document.getElementById("my-ip-btn");
  const accurateBtn = document.getElementById("accurate-btn");

  const loader = document.getElementById("loader");
  const errorMsg = document.getElementById("error-message");

  const ipDisplay = document.getElementById("ip-display");
  const locationDisplay = document.getElementById("location-display");
  const timezoneDisplay = document.getElementById("timezone-display");
  const ispDisplay = document.getElementById("isp-display");

  const map = L.map("map").setView([20, 0], 2);
  let marker = null;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  const API_KEY = "at_wuvOQ7NKYsA7ReFthDnzqtIvnKo9C";

  // --- Time handling ---
  let timeUpdateTimer = null;
  function clearTimeTimer() {
    if (timeUpdateTimer) {
      clearInterval(timeUpdateTimer);
      timeUpdateTimer = null;
    }
  }
  function formatTimeFromOffset(offset) {
    // offset example: "+02:00" or "-07:00"
    if (typeof offset !== 'string' || !offset.includes(':')) return '';
    const sign = offset.startsWith('-') ? -1 : 1;
    const [hh, mm] = offset.replace('+','').replace('-','').split(':').map(n => parseInt(n, 10) || 0);
    const totalMinutes = sign * (hh * 60 + mm);
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const localMs = utcMs + totalMinutes * 60000;
    const localDate = new Date(localMs);
    return localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function setTimezoneWithTime({ tzLabel, offset, iana }) {
    clearTimeTimer();
    const update = () => {
      let timeStr = '';
      if (iana) {
        timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: iana });
      } else if (offset) {
        timeStr = formatTimeFromOffset(offset);
      }
      timezoneDisplay.textContent = tzLabel ? `${tzLabel} ${timeStr ? '(' + timeStr + ')' : ''}` : (timeStr || '-');
    };
    update();
    timeUpdateTimer = setInterval(update, 60 * 1000);
  }

  // --- API Request Function ---
  async function getIpLocation(ip = "") {
    loader.style.display = "block";
    errorMsg.textContent = "";

    try {
      const url = ip
        ? `https://geo.ipify.org/api/v1?apiKey=${API_KEY}&ipAddress=${ip}`
        : `https://geo.ipify.org/api/v1?apiKey=${API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.location) {
        updateMap(data.location.lat, data.location.lng, data.ip);
        ipDisplay.textContent = data.ip || "-";
        locationDisplay.textContent = `${data.location.city || ""}, ${data.location.region || ""}, ${data.location.country || ""}`;
        const tz = data.location.timezone || ""; // e.g. -07:00
        setTimezoneWithTime({ tzLabel: tz, offset: tz });
        ispDisplay.textContent = data.isp || "-";
      } else {
        errorMsg.textContent = "Could not fetch location.";
      }
    } catch (err) {
      errorMsg.textContent = "Error fetching data.";
      console.error(err);
    } finally {
      loader.style.display = "none";
    }
  }

  // --- Map Update ---
  function updateMap(lat, lng, label = "Location") {
    map.setView([lat, lng], 13);
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng], { riseOnHover: true }).addTo(map).bindPopup(label).openPopup();
    // Apply drop animation class to marker icon when available
    setTimeout(() => {
      if (marker && marker._icon) {
        marker._icon.classList.add('marker-drop');
      }
    }, 0);
  }

  // --- High Accuracy using Browser GPS ---
  function getAccurateLocation() {
    if (navigator.geolocation) {
      loader.style.display = "block";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateMap(lat, lng, "Your Device (GPS)");
          ipDisplay.textContent = "Device GPS";
          locationDisplay.textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
          const iana = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezoneWithTime({ tzLabel: iana, iana });
          ispDisplay.textContent = "-";
          loader.style.display = "none";
        },
        (err) => {
          errorMsg.textContent = "Permission denied or unavailable.";
          loader.style.display = "none";
        },
        { enableHighAccuracy: true }
      );
    } else {
      errorMsg.textContent = "Geolocation not supported by your browser.";
    }
  }

  // --- Event Listeners ---
  // Button ripple helper
  function attachRipple(el) {
    if (!el) return;
    el.addEventListener('click', (e) => {
      const rect = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      ripple.className = 'ripple-effect';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  [searchBtn, myIpBtn, accurateBtn].forEach(attachRipple);

  searchBtn.addEventListener("click", () => {
    const ip = ipInput.value.trim();
    if (ip) {
      getIpLocation(ip);
    } else {
      errorMsg.textContent = "Please enter an IP address.";
    }
  });

  ipInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
  });

  myIpBtn.addEventListener("click", () => getIpLocation());
  accurateBtn.addEventListener("click", () => {
    const ip = ipInput.value.trim();
    if (ip) {
      // If an IP is entered, treat High Accuracy as IP-targeted lookup
      getIpLocation(ip);
    } else {
      // No IP entered → use device geolocation for higher accuracy
      getAccurateLocation();
    }
  });

  // --- Initial load ---
  getIpLocation();
});
