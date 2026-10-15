let cMap;
let marker;
const myCitizenId = "CIT001"; // Mock citizen session ID

document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    
    // 1. Initialize Leaflet Map
    cMap = L.map('citizenMap').setView([19.080, 72.879], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | BMC GIS'
    }).addTo(cMap);

    // 2. Render all 24 official municipal wards
    const zones = await window.dataService.getZones();
    if (zones && zones.features) {
        const zonesLayer = L.geoJSON(zones, {
            style: {
                color: '#3b82f6',
                weight: 1.5,
                fillColor: '#60a5fa',
                fillOpacity: 0.12
            },
            onEachFeature: (feature, layer) => {
                const wardName = feature.properties.zone_name || `Ward ${feature.properties.name}`;
                layer.bindTooltip(wardName, { sticky: true });
                layer.on({
                    mouseover: (e) => {
                        e.target.setStyle({ weight: 2.5, color: '#1e3a8a', fillOpacity: 0.25 });
                    },
                    mouseout: (e) => {
                        zonesLayer.resetStyle(e.target);
                    }
                });
            }
        }).addTo(cMap);

        // Fit whole city within map view
        cMap.fitBounds(zonesLayer.getBounds(), { padding: [15, 15] });
    }

    // 3. Map Click Event for point-in-polygon ward detection
    cMap.on('click', (e) => {
        setLocation(e.latlng.lat, e.latlng.lng);
    });

    // 4. Default pin to a realistic Mumbai location (e.g., Bandra West Ward H/W)
    quickSelect(19.0600, 72.8350);

    // 5. Load citizen data
    await loadCitizenData();

    // 6. Cross-tab sync
    window.addEventListener('storage', async (e) => {
        if (e.key === 'municipal_complaints') {
            await loadCitizenData();
        }
    });
});

function onCategorySelect() {
    const cat = document.getElementById('category').value;
    const deptInput = document.getElementById('mappedDepartment');
    if (cat) {
        deptInput.value = window.dataService.getDepartmentForCategory(cat);
    } else {
        deptInput.value = "Select category first";
    }
}

function quickSelect(lat, lng) {
    if (cMap) {
        cMap.setView([lat, lng], 14);
    }
    setLocation(lat, lng);
}

function setLocation(lat, lng) {
    if (marker) cMap.removeLayer(marker);
    marker = L.marker([lat, lng], { draggable: true }).addTo(cMap);
    
    document.getElementById('lat').value = lat.toFixed(6);
    document.getElementById('lng').value = lng.toFixed(6);
    
    // Point-in-polygon detection for official BMC Ward
    const zone = window.dataService.detectZone(lat, lng);
    const detectedInput = document.getElementById('detectedZone');
    const detectedIdInput = document.getElementById('detectedZoneId');

    if (zone) {
        detectedInput.value = zone.name;
        detectedIdInput.value = zone.id;
        detectedInput.style.borderColor = '#10b981';
        detectedInput.style.color = '#065f46';
        marker.bindPopup(`<strong>${zone.name}</strong><br/>Click to confirm location`).openPopup();
    } else {
        detectedInput.value = "Outside Municipal Boundary";
        detectedIdInput.value = "";
        detectedInput.style.borderColor = '#ef4444';
        detectedInput.style.color = '#b91c1c';
        marker.bindPopup("Selected location is outside municipal boundaries").openPopup();
    }

    marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setLocation(pos.lat, pos.lng);
    });
}

function useMyLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Check if user's real location is within Mumbai
                const zone = window.dataService.detectZone(lat, lng);
                if (zone) {
                    cMap.setView([lat, lng], 15);
                    setLocation(lat, lng);
                } else {
                    // Fallback to central Mumbai location
                    alert("Your current location is outside Greater Mumbai municipal boundaries. Setting location to Central Mumbai (Ward L - Kurla).");
                    quickSelect(19.0730, 72.8750);
                }
            },
            () => {
                alert("Location access denied or unavailable. Please click directly on the map to choose your location.");
            }
        );
    } else {
        alert("Geolocation is not supported by your browser. Please click directly on the map.");
    }
}

async function loadCitizenData() {
    const complaints = await window.dataService.getComplaints();
    // In our dynamic model, show complaints submitted in this session/browser
    const myComplaints = complaints;
    
    // Update Stats
    const total = myComplaints.length;
    const pending = myComplaints.filter(c => c.status === 'Pending').length;
    const underProcess = myComplaints.filter(c => c.status === 'Under Process').length;
    const resolved = myComplaints.filter(c => c.status === 'Resolved').length;

    document.getElementById('citizenStats').innerHTML = `
        <div class="stat-card"><h3>Total Dynamic Complaints</h3><div class="value">${total}</div></div>
        <div class="stat-card"><h3>Pending Action</h3><div class="value" style="color:var(--status-pending);">${pending}</div></div>
        <div class="stat-card"><h3>Under Process</h3><div class="value" style="color:var(--status-process);">${underProcess}</div></div>
        <div class="stat-card"><h3>Resolved</h3><div class="value" style="color:var(--status-resolved);">${resolved}</div></div>
    `;

    document.getElementById('historyBadge').innerText = `${total} ${total === 1 ? 'Complaint' : 'Complaints'}`;

    // Update History Table
    const tbody = document.getElementById('historyTable').querySelector('tbody');
    const noHistoryMsg = document.getElementById('noHistoryMsg');

    if (total === 0) {
        tbody.innerHTML = '';
        noHistoryMsg.style.display = 'block';
        return;
    }

    noHistoryMsg.style.display = 'none';
    let html = '';
    myComplaints.forEach(c => {
        const ward = window.dataService.getWard(c.zoneId);
        html += `
            <tr>
                <td><strong style="color:#1e3a8a;">${c.id}</strong></td>
                <td>${c.category}</td>
                <td style="font-size:0.85rem; color:#4b5563;">${c.department}</td>
                <td><strong>${ward.name}</strong><br><span style="font-size:0.75rem; color:#6b7280;">${ward.locality ? ward.locality.split(',')[0] : ''}</span></td>
                <td style="font-size:0.85rem; color:#6b7280;">${c.createdAt}</td>
                <td><span class="badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
                <td><span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function submitComplaint(e) {
    e.preventDefault();
    
    const zoneId = document.getElementById('detectedZoneId').value;
    if (!zoneId) {
        alert("Please click on the map to select a valid location inside Mumbai's municipal boundaries.");
        return;
    }

    const cat = document.getElementById('category').value;
    if (!cat) {
        alert("Please select a complaint category.");
        return;
    }

    const data = {
        citizenId: myCitizenId,
        citizenName: document.getElementById('citizenName').value.trim() || "Citizen User",
        citizenContact: document.getElementById('citizenContact').value.trim() || "+91 98200 00000",
        zoneId: zoneId,
        zoneName: document.getElementById('detectedZone').value,
        category: cat,
        department: document.getElementById('mappedDepartment').value,
        priority: document.getElementById('priority').value,
        latitude: parseFloat(document.getElementById('lat').value),
        longitude: parseFloat(document.getElementById('lng').value),
        description: document.getElementById('description').value.trim()
    };

    const newCmp = await window.dataService.submitComplaint(data);
    
    document.getElementById('successMsg').style.display = 'block';
    document.getElementById('newCmpId').innerText = newCmp.id;
    document.getElementById('newCmpZone').innerText = newCmp.zoneName;
    document.getElementById('newCmpDept').innerText = newCmp.department;
    
    // Clear description
    document.getElementById('description').value = '';
    
    // Refresh table and stats
    await loadCitizenData();
    
    // Scroll to success message
    document.getElementById('successMsg').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        const msg = document.getElementById('successMsg');
        if (msg) msg.style.display = 'none';
    }, 12000);
}
