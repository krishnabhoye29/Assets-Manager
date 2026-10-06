document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    const assets = await window.dataService.getAssets();
    
    // Init map
    const aMap = L.map('assetsMap').setView([19.080, 72.879], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(aMap);
    
    // Populate table and map
    let html = '';
    assets.forEach(a => {
        // Add to map
        let markerColor = a.condition === 'Good' ? 'green' : 
                          (a.condition === 'Critical' ? 'red' : 'orange');
        
        const marker = L.circleMarker([a.latitude, a.longitude], {
            radius: 7,
            fillColor: markerColor,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9
        }).addTo(aMap);
        
        marker.bindPopup(`
            <b>${a.id}</b> - ${a.type}<br>
            Condition: ${a.condition}<br>
            Dept: ${a.department}
        `);
        
        // Add to table
        let badgeClass = a.condition === 'Good' ? 'resolved' : 
                         (a.condition === 'Critical' ? 'critical' : 'under-process');
                         
        html += `
            <tr>
                <td><strong>${a.id}</strong></td>
                <td>${a.type}</td>
                <td>${a.zoneId}</td>
                <td><span class="badge ${badgeClass}">${a.condition}</span></td>
                <td>${a.lastMaintenance}</td>
                <td>${a.department}</td>
            </tr>
        `;
    });
    
    document.getElementById('assetsTable').querySelector('tbody').innerHTML = html;
});
