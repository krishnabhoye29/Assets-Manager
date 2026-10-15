document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    const assets = await window.dataService.getAssets();
    const zones = await window.dataService.getZones();
    
    // Init map
    const aMap = L.map('assetsMap').setView([19.080, 72.879], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | BMC Assets GIS'
    }).addTo(aMap);

    // Add ward boundaries
    if (zones && zones.features) {
        const zonesLayer = L.geoJSON(zones, {
            style: {
                color: '#3b82f6',
                weight: 1.5,
                fillColor: '#93c5fd',
                fillOpacity: 0.1
            },
            onEachFeature: (feature, layer) => {
                const wardName = feature.properties.zone_name || `Ward ${feature.properties.name}`;
                layer.bindTooltip(wardName, { sticky: true });
            }
        }).addTo(aMap);

        aMap.fitBounds(zonesLayer.getBounds(), { padding: [20, 20] });
    }
    
    // Populate table and map
    let html = '';
    assets.forEach(a => {
        const ward = window.dataService.getWard(a.zoneId);
        const wardDisplay = ward.fullName || `Ward ${a.zoneId}`;

        // Add to map
        let markerColor = a.condition === 'Good' ? '#10b981' : 
                          (a.condition === 'Critical' ? '#ef4444' : '#f59e0b');
        
        const marker = L.circleMarker([a.latitude, a.longitude], {
            radius: 8,
            fillColor: markerColor,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95
        }).addTo(aMap);
        
        marker.bindPopup(`
            <div style="font-family: inherit;">
                <strong style="color:#1e3a8a; font-size:1rem;">${a.id}</strong> - ${a.type}<br>
                <strong>Ward:</strong> ${wardDisplay}<br>
                <strong>Condition:</strong> <span class="badge ${a.condition === 'Good' ? 'resolved' : (a.condition === 'Critical' ? 'critical' : 'under-process')}">${a.condition}</span><br>
                <strong>Dept:</strong> ${a.department}<br>
                <small style="color:#6b7280;">Last Inspection: ${a.lastMaintenance}</small>
            </div>
        `);
        
        // Add to table
        let badgeClass = a.condition === 'Good' ? 'resolved' : 
                         (a.condition === 'Critical' ? 'critical' : 'under-process');
                         
        html += `
            <tr>
                <td><strong style="color:#1e3a8a;">${a.id}</strong></td>
                <td><strong>${a.type}</strong></td>
                <td>${wardDisplay}</td>
                <td><span class="badge ${badgeClass}">${a.condition}</span></td>
                <td>${a.lastMaintenance}</td>
                <td>${a.department}</td>
            </tr>
        `;
    });
    
    document.getElementById('assetsTable').querySelector('tbody').innerHTML = html;
});
