document.addEventListener('DOMContentLoaded', () => {
  // DOM refs
  const ipInput = document.getElementById('ip-input');
  const searchBtn = document.getElementById('search-btn');
  const myIpBtn = document.getElementById('my-ip-btn');
  const deviceLocBtn = document.getElementById('device-loc-btn');
  const errorMessage = document.getElementById('error-message');
  const loader = document.getElementById('loader');

  const ipDisplay = document.getElementById('ip-display');
  const locationDisplay = document.getElementById('location-display');
  const ispDisplay = document.getElementById('isp-display');
  const tzDisplay = document.getElementById('tz-display');

  // Initialize map (use the string id 'map')
  const map = L.map('map').setView([20, 0], 2);
  let marker = null;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Helper: show/hide loader
  function setLoading(on) {
    loader.style.display = on ? 'inline-block' : 'none';
  }

  // Helper: safe text
  function safeText(v) { return (v === undefined || v === null || v === '') ? '-' : String(v); }

  // Update marker & map
  function updateMap(lat, lon, label = '') {
    if (!isFinite(lat) || !isFinite(lon)) {
      errorMessage.textContent = 'Coordinates not available.';
      return;
    }
    map.setView([lat, lon], 13);
    if (marker) marker.remove();
    marker = L.marker([lat, lon]).addTo(map);
    if (label) marker.bindPopup(label).openPopup();
  }

  // Fill details from ipwho.is response
  function fillDetailsFromIP(data) {
    ipDisplay.textContent = safeText(data.ip);
    const parts = [data.city, data.region, data.country].filter(Boolean);
    locationDisplay.textContent = parts.length ? parts.join(', ') : `${safeText(data.latitude)}, ${safeText(data.longitude)}`;
    // ipwho.is may return ISP info in different fields
    const isp = data.connection?.isp || data.connection?.org || data.org || data.isp;
    ispDisplay.textContent = safeText(isp);
    tzDisplay.textContent = (data.timezone && (data.timezone.id || data.timezone)) ? (data.timezone.id || data.timezone) : '-';
  }

  // Fill details from browser geolocation
  function fillDetailsFromDevice(lat, lon) {
    ipDisplay.textContent = 'Device (browser)';
    locationDisplay.textContent = `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
    ispDisplay.textContent = 'Browser Geolocation';
    tzDisplay.textContent = '-';
  }

  // Fetch location by IP (uses ipwho.is)
  async function getIpLocation(ipAddress = '') {
    setLoading(true);
    errorMessage.textContent = '';
    try {
      // ipwho.is supports empty path to lookup caller IP
      const url = ipAddress ? `https://ipwho.is/${encodeURIComponent(ipAddress)}` : 'https://ipwho.is/';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Network error: ${res.status}`);
      const data = await res.json();

      if (!data.success) {
        // ipwho.is returns success=false for invalid IP
        errorMessage.textContent = data.message || 'Lookup failed for that IP.';
        // clear details
        ipDisplay.textContent = '-';
        locationDisplay.textContent = '-';
        ispDisplay.textContent = '-';
        tzDisplay.textContent = '-';
        setLoading(false);
        return;
      }

      fillDetailsFromIP(data);

      const lat = Number(data.latitude);
      const lon = Number(data.longitude);
      if (isFinite(lat) && isFinite(lon)) {
        updateMap(lat, lon, `IP: ${data.ip}`);
      } else {
        errorMessage.textContent = 'Coordinates not returned by IP service.';
      }
    } catch (err) {
      console.error(err);
      errorMessage.textContent = 'Error fetching IP data. Check your connection.';
    } finally {
      setLoading(false);
    }
  }

  // Use browser Geolocation API (more accurate)
  function getBrowserLocation() {
    errorMessage.textContent = '';
    if (!navigator.geolocation) {
      errorMessage.textContent = 'Browser geolocation not supported.';
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fillDetailsFromDevice(lat, lon);
        updateMap(lat, lon, 'Your device location (browser geolocation)');
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) errorMessage.textContent = 'Permission denied for geolocation.';
        else if (err.code === 3) errorMessage.textContent = 'Geolocation timed out.';
        else errorMessage.textContent = 'Could not get device location.';
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Event listeners
  searchBtn.addEventListener('click', () => {
    errorMessage.textContent = '';
    const ip = ipInput.value.trim();
    if (!ip) {
      errorMessage.textContent = 'Please enter an IP address or use "My IP".';
      return;
    }
    getIpLocation(ip);
  });

  ipInput.addEventListener('keypress', (ev) => {
    if (ev.key === 'Enter') searchBtn.click();
  });

  myIpBtn.addEventListener('click', () => {
    ipInput.value = '';
    getIpLocation(); // lookup via caller IP
  });

  deviceLocBtn.addEventListener('click', () => {
    getBrowserLocation();
  });

  // Initial: lookup caller IP once
  getIpLocation();
});
