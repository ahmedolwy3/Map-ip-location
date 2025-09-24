document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    const ipInputElement = document.getElementById('ip-input');
    const searchButton = document.getElementById('search-btn');
    const myIpButton = document.getElementById('my-ip-btn');
    const mapElement = document.getElementById('map');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    
    const ipDisplay = document.getElementById('ip-display');
    const locationDisplay = document.getElementById('location-display');
    const ispDisplay = document.getElementById('isp-display');

    // --- Map Initialization ---
    const map = L.map(mapElement).setView([20, 0], 2);
    let marker = null;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // --- Core Functions ---

    /**
     * Fetches geolocation data and updates the UI using the new ipwho.is API.
     * @param {string} ipAddress - The IP to look up. If empty, the API uses the user's IP.
     */
    const getIpLocation = async (ipAddress = '') => {
        loader.style.display = 'block';
        errorMessage.textContent = '';
        updateDetails({ status: 'loading' });

        try {
            // --- CHANGE #1: Using the new ipwho.is API endpoint with HTTPS ---
            const response = await fetch(`https://ipwho.is/${ipAddress}`);
            const data = await response.json();

            // 2. Handle the API response
            if (data.success) {
                // --- CHANGE #2: Using the new data properties from ipwho.is (latitude, longitude, etc.) ---
                updateMap(data.latitude, data.longitude);
                updateDetails(data);
            } else {
                errorMessage.textContent = data.message || 'Could not find location for the specified IP.';
                updateDetails({ status: 'fail' });
            }
        } catch (error) {
            console.error('Error fetching IP data:', error);
            errorMessage.textContent = 'An error occurred. Please check your connection.';
        } finally {
            loader.style.display = 'none';
        }
    };

    /**
     * Updates the map view and marker.
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    const updateMap = (lat, lon) => {
        map.setView([lat, lon], 13);
        if (marker) {
            map.removeLayer(marker);
        }
        marker = L.marker([lat, lon]).addTo(map).bindPopup(`Location for ${ipDisplay.textContent}`).openPopup();
    };

    /**
     * Updates the details section with data from ipwho.is.
     * @param {object} data - The data from the API.
     */
    const updateDetails = (data) => {
        if (data.status === 'loading') {
            ipDisplay.textContent = 'Loading...';
            locationDisplay.textContent = 'Loading...';
            ispDisplay.textContent = 'Loading...';
        } else if (data.success) { // --- CHANGE #3: The success flag is now 'data.success' ---
            ipDisplay.textContent = data.ip || '-';
            locationDisplay.textContent = `${data.city || ''}, ${data.region || ''}, ${data.country || ''}`;
            ispDisplay.textContent = data.isp || '-';
        } else { // Handle 'fail' or other states
            ipDisplay.textContent = '-';
            locationDisplay.textContent = '-';
            ispDisplay.textContent = '-';
        }
    };

    // --- Event Listeners (No changes needed here) ---
    searchButton.addEventListener('click', () => {
        const ip = ipInputElement.value.trim();
        if (ip) {
            getIpLocation(ip);
        } else {
            errorMessage.textContent = 'Please enter an IP address.';
        }
    });
    
    ipInputElement.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchButton.click();
        }
    });

    myIpButton.addEventListener('click', () => {
        ipInputElement.value = '';
        getIpLocation();
    });

    // --- Initial Load ---
    getIpLocation();
});