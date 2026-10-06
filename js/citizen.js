let cMap;
let marker;
const myCitizenId = "CIT001"; // Mock citizen ID for demo

document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    
    // Init map
    cMap = L.map('citizenMap').setView([19.080, 72.879], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(cMap);

    // Show zones loosely
    const zones = await window.dataService.getZones();
    L.geoJSON(zones, {
        style: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.1
        }
    }).addTo(cMap);

    cMap.on('click', (e) => {
        setLocation(e.latlng.lat, e.latlng.lng);
    });

    loadCitizenData();
});

async function loadCitizenData() {
    const complaints = await window.dataService.getComplaints();
    const myComplaints = complaints.filter(c => c.citizenId === myCitizenId);
    
    // Update Stats
    const total = myComplaints.length;
    const pending = myComplaints.filter(c => c.status === 'Pending').length;
    const underProcess = myComplaints.filter(c => c.status === 'Under Process').length;
    const resolved = myComplaints.filter(c => c.status === 'Resolved').length;

    document.getElementById('citizenStats').innerHTML = `
        <div class="stat-card"><h3>Total</h3><div class="value">${total}</div></div>
        <div class="stat-card"><h3>Pending</h3><div class="value" style="color:var(--status-pending);">${pending}</div></div>
        <div class="stat-card"><h3>Under Process</h3><div class="value" style="color:var(--status-process);">${underProcess}</div></div>
        <div class="stat-card"><h3>Resolved</h3><div class="value" style="color:var(--status-resolved);">${resolved}</div></div>
    `;

    // Update Table
    let html = '';
    myComplaints.forEach(c => {
        html += `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td>${c.category}</td>
                <td>${c.zoneName}</td>
                <td>${c.createdAt}</td>
                <td><span class="badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
                <td><span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></td>
            </tr>
        `;
    });
    document.getElementById('historyTable').querySelector('tbody').innerHTML = html;
}

function setLocation(lat, lng) {
    if (marker) cMap.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(cMap);
    
    document.getElementById('lat').value = lat.toFixed(6);
    document.getElementById('lng').value = lng.toFixed(6);
    
    // Detect zone
    const zone = window.dataService.detectZone(lat, lng);
    if (zone) {
        document.getElementById('detectedZone').value = zone.name;
        document.getElementById('detectedZoneId').value = zone.id;
        document.getElementById('detectedZone').style.borderColor = 'green';
    } else {
        document.getElementById('detectedZone').value = "Outside Municipal Boundary";
        document.getElementById('detectedZoneId').value = "";
        document.getElementById('detectedZone').style.borderColor = 'red';
    }
}

function useMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Just for demo, let's clamp it to our mock city if it's too far
                const demoLat = 19.075 + (Math.random() * 0.01);
                const demoLng = 72.875 + (Math.random() * 0.01);
                
                cMap.setView([demoLat, demoLng], 15);
                setLocation(demoLat, demoLng);
            },
            () => {
                alert("Geolocation failed. Please click on the map.");
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

const departments = {
    "Streetlight": "Streetlight Department",
    "Road": "Roads Department",
    "Footpath": "Footpath Department",
    "Sewage": "Water & Sewage Department",
    "Drainage": "Water & Sewage Department",
    "Water Supply": "Water & Sewage Department",
    "Garbage": "Sanitation Department",
    "Public Toilet": "Public Facilities Department",
    "Bus Stop": "Public Facilities Department",
    "Garden": "Public Facilities Department",
    "Safety Issue": "Safety Department",
    "Other": "General Maintenance"
};

async function submitComplaint(e) {
    e.preventDefault();
    
    const zoneId = document.getElementById('detectedZoneId').value;
    if (!zoneId) {
        alert("Please select a location within the municipal boundaries.");
        return;
    }

    const cat = document.getElementById('category').value;
    
    const data = {
        citizenId: myCitizenId,
        zoneId: zoneId,
        zoneName: document.getElementById('detectedZone').value,
        category: cat,
        department: departments[cat] || "General Maintenance",
        priority: document.getElementById('priority').value,
        latitude: parseFloat(document.getElementById('lat').value),
        longitude: parseFloat(document.getElementById('lng').value),
        description: document.getElementById('description').value
    };

    const newCmp = await window.dataService.submitComplaint(data);
    
    document.getElementById('successMsg').style.display = 'block';
    document.getElementById('newCmpId').innerText = newCmp.id;
    document.getElementById('newCmpZone').innerText = newCmp.zoneName;
    
    document.getElementById('complaintForm').reset();
    if (marker) cMap.removeLayer(marker);
    document.getElementById('detectedZone').style.borderColor = '#d1d5db';
    
    // Refresh table and stats
    loadCitizenData();
    
    setTimeout(() => {
        document.getElementById('successMsg').style.display = 'none';
    }, 10000);
}
