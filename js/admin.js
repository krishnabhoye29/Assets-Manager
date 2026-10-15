let adminMap;
let zoneChartInstance;
let currentActiveZoneId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Data
    await window.dataService.loadInitialData();
    const complaints = await window.dataService.getComplaints();
    const zones = await window.dataService.getZones();
    const workers = await window.dataService.getWorkers();
    
    // 2. Initialize Dashboard Stats
    updateAdminStats(complaints, workers, zones);
    
    // 3. Populate Ward Filter Dropdown
    populateWardFilter();

    // 4. Initialize Map
    adminMap = new MunicipalMap('map', {
        viewMode: 'Total Complaints',
        onZoneClick: handleZoneClick
    });
    
    await adminMap.render(zones, complaints);
    
    // 5. Populate Ward-wise statistics
    updateTopZones(zones, complaints);
    
    // 6. Setup Filters
    document.getElementById('mapViewMode').addEventListener('change', (e) => {
        adminMap.updateFilters(undefined, undefined, e.target.value);
    });
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        adminMap.updateFilters(e.target.value, undefined, undefined);
    });
    document.getElementById('filterDepartment').addEventListener('change', (e) => {
        adminMap.updateFilters(undefined, e.target.value, undefined);
    });
    document.getElementById('filterWard').addEventListener('change', (e) => {
        const selectedWard = e.target.value;
        if (selectedWard === 'All') {
            adminMap.render(zones, complaints);
        } else {
            // Find feature and zoom to it
            const feat = zones.features.find(f => adminMap.getZoneId(f) === selectedWard);
            if (feat) {
                const layer = L.geoJSON(feat);
                adminMap.map.fitBounds(layer.getBounds(), { padding: [40, 40] });
                const stats = adminMap.getZoneStats(selectedWard, adminMap.getFilteredComplaints());
                handleZoneClick(feat, stats);
            }
        }
    });

    // 7. Auto-refresh when localStorage updates from other tabs
    window.addEventListener('storage', async (e) => {
        if (e.key === 'municipal_complaints' || e.key === 'municipal_workers') {
            await refreshAdminDashboard();
        }
    });
});

function populateWardFilter() {
    const select = document.getElementById('filterWard');
    if (!select || !window.dataService) return;
    
    const wards = window.dataService.getOfficialWards();
    wards.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.name} - ${w.locality.split(',')[0]}`;
        select.appendChild(opt);
    });
}

async function refreshAdminDashboard() {
    const complaints = await window.dataService.getComplaints();
    const zones = await window.dataService.getZones();
    const workers = await window.dataService.getWorkers();
    
    updateAdminStats(complaints, workers, zones);
    await adminMap.render(zones, complaints);
    updateTopZones(zones, complaints);
    
    if (currentActiveZoneId) {
        const feat = zones.features.find(f => adminMap.getZoneId(f) === currentActiveZoneId);
        if (feat) {
            const stats = adminMap.getZoneStats(currentActiveZoneId, adminMap.getFilteredComplaints());
            handleZoneClick(feat, stats);
        }
    }
}

function updateAdminStats(complaints, workers, zones) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'Pending').length;
    const underProcess = complaints.filter(c => c.status === 'Under Process').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const critical = complaints.filter(c => c.priority === 'Critical').length;
    const activeWorkers = workers.filter(w => w.status === 'Active').length;
    
    const html = `
        <div class="stat-card">
            <h3>Total Complaints</h3>
            <div class="value">${total}</div>
        </div>
        <div class="stat-card">
            <h3>Pending</h3>
            <div class="value" style="color: var(--status-pending);">${pending}</div>
        </div>
        <div class="stat-card">
            <h3>Under Process</h3>
            <div class="value" style="color: var(--status-process);">${underProcess}</div>
        </div>
        <div class="stat-card">
            <h3>Resolved</h3>
            <div class="value" style="color: var(--status-resolved);">${resolved}</div>
        </div>
        <div class="stat-card">
            <h3>Critical Priority</h3>
            <div class="value" style="color: #b91c1c;">${critical}</div>
        </div>
        <div class="stat-card">
            <h3>Active Workers</h3>
            <div class="value" style="color: var(--secondary-color);">${activeWorkers} <span style="font-size:0.9rem; font-weight:normal; color:#6b7280;">/ ${workers.length}</span></div>
        </div>
    `;
    document.getElementById('adminStats').innerHTML = html;
}

function updateTopZones(zones, complaints) {
    if (!zones || !zones.features) return;

    const zoneCounts = zones.features.map(f => {
        const zoneId = adminMap.getZoneId(f);
        const wardInfo = window.dataService.getWard(zoneId);
        const zComplaints = complaints.filter(c => c.zoneId === zoneId);
        const pending = zComplaints.filter(c => c.status === 'Pending').length;
        const resolved = zComplaints.filter(c => c.status === 'Resolved').length;
        return {
            name: adminMap.getZoneName(f),
            id: zoneId,
            locality: wardInfo.locality,
            count: zComplaints.length,
            pending: pending,
            resolved: resolved
        };
    });
    
    // Sort descending by count, then by pending
    zoneCounts.sort((a, b) => b.count - a.count || b.pending - a.pending);
    
    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">';
    
    // Display wards with complaints first, then top overall wards
    const displayedWards = zoneCounts.slice(0, 6);
    displayedWards.forEach(zc => {
        const resRate = zc.count > 0 ? ((zc.resolved / zc.count) * 100).toFixed(0) : 0;
        html += `
            <div style="padding: 12px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; transition: all 0.2s;" 
                 onmouseover="this.style.borderColor='var(--secondary-color)'; this.style.background='#eff6ff';" 
                 onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='#f9fafb';"
                 onclick="selectWardById('${zc.id}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                    <strong style="color: #1e3a8a; font-size: 0.95rem;">${zc.name}</strong>
                    <span class="badge ${zc.count > 0 ? 'medium' : 'low'}">${zc.count} ${zc.count === 1 ? 'complaint' : 'complaints'}</span>
                </div>
                <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${zc.locality}">
                    ${zc.locality || 'Municipal Ward Area'}
                </div>
                <div style="display: flex; gap: 12px; font-size: 0.8rem; color: #4b5563;">
                    <span>Pending: <strong style="color:var(--status-pending);">${zc.pending}</strong></span>
                    <span>Resolved: <strong style="color:var(--status-resolved);">${zc.resolved}</strong></span>
                    <span>Rate: <strong>${resRate}%</strong></span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    document.getElementById('topZonesList').innerHTML = html;
}

function selectWardById(wardId) {
    if (!adminMap || !adminMap.zonesData) return;
    const feat = adminMap.zonesData.features.find(f => adminMap.getZoneId(f) === wardId);
    if (feat) {
        const stats = adminMap.getZoneStats(wardId, adminMap.getFilteredComplaints());
        handleZoneClick(feat, stats);
        const layer = L.geoJSON(feat);
        adminMap.map.fitBounds(layer.getBounds(), { padding: [30, 30] });
    }
}

function handleZoneClick(feature, stats) {
    const panel = document.getElementById('zonePanel');
    
    currentActiveZoneId = adminMap.getZoneId(feature);
    const zoneName = adminMap.getZoneName(feature);
    const wardInfo = window.dataService.getWard(currentActiveZoneId);
    
    document.getElementById('zpName').innerText = zoneName;
    document.getElementById('zpLocality').innerText = wardInfo.locality ? `Areas: ${wardInfo.locality}` : 'Greater Mumbai Ward';
    document.getElementById('renameZoneInput').value = zoneName;
    document.getElementById('zpTotal').innerText = stats.total;
    document.getElementById('zpPending').innerText = stats.pending;
    document.getElementById('zpProcess').innerText = stats.underProcess;
    document.getElementById('zpResolved').innerText = stats.resolved;
    
    const resRate = stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0;
    document.getElementById('zpResRate').innerText = resRate;
    
    // Category Breakdown Chart
    const categories = {};
    stats.zoneComplaints.forEach(c => {
        categories[c.category] = (categories[c.category] || 0) + 1;
    });
    
    const chartCanvas = document.getElementById('zoneChart');
    const noChartData = document.getElementById('noChartData');
    
    if (stats.total === 0 || Object.keys(categories).length === 0) {
        chartCanvas.style.display = 'none';
        noChartData.style.display = 'block';
        if (zoneChartInstance) {
            zoneChartInstance.destroy();
            zoneChartInstance = null;
        }
    } else {
        chartCanvas.style.display = 'block';
        noChartData.style.display = 'none';
        
        const ctx = chartCanvas.getContext('2d');
        if (zoneChartInstance) {
            zoneChartInstance.destroy();
        }
        
        zoneChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4', '#84cc16'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        });
    }
    
    panel.classList.add('active');
}

async function renameCurrentZone() {
    if (!currentActiveZoneId) return;
    const newName = document.getElementById('renameZoneInput').value.trim();
    if (!newName) return;
    
    const success = await window.dataService.updateZoneName(currentActiveZoneId, newName);
    if (success) {
        document.getElementById('zpName').innerText = newName;
        // Refresh map & stats
        const complaints = await window.dataService.getComplaints();
        const zones = await window.dataService.getZones();
        await adminMap.render(zones, complaints);
        updateTopZones(zones, complaints);
        alert(`Ward display name updated to "${newName}"`);
    } else {
        alert("Failed to update ward name.");
    }
}

function viewZoneComplaints() {
    if (currentActiveZoneId) {
        window.location.href = `admin-complaints.html?zoneId=${encodeURIComponent(currentActiveZoneId)}`;
    }
}

// Convenient helper for quick testing: submits a realistic dynamic complaint
async function seedSampleComplaint() {
    const categories = ["Streetlight", "Road", "Garbage", "Water Supply", "Sewage", "Drainage"];
    const priorities = ["Medium", "High", "Critical"];
    const wardOptions = [
        { id: "A", lat: 18.9285, lng: 72.8332 },
        { id: "K/W", lat: 19.1250, lng: 72.8250 },
        { id: "H/W", lat: 19.0600, lng: 72.8350 },
        { id: "L", lat: 19.0730, lng: 72.8750 },
        { id: "G/N", lat: 19.0180, lng: 72.8420 },
        { id: "D", lat: 18.9600, lng: 72.8150 }
    ];

    const pickWard = wardOptions[Math.floor(Math.random() * wardOptions.length)];
    const pickCat = categories[Math.floor(Math.random() * categories.length)];
    const pickPri = priorities[Math.floor(Math.random() * priorities.length)];
    const ward = window.dataService.getWard(pickWard.id);

    const newCmp = await window.dataService.submitComplaint({
        citizenId: `CIT${Math.floor(Math.random() * 900) + 100}`,
        citizenName: "Citizen Tester",
        citizenContact: "+91 98200 " + Math.floor(Math.random() * 90000 + 10000),
        zoneId: pickWard.id,
        zoneName: ward.fullName,
        category: pickCat,
        priority: pickPri,
        latitude: pickWard.lat + (Math.random() - 0.5) * 0.005,
        longitude: pickWard.lng + (Math.random() - 0.5) * 0.005,
        description: `Urgent issue regarding ${pickCat.toLowerCase()} near public road.`
    });

    alert(`Test complaint ${newCmp.id} dynamically submitted in ${newCmp.zoneName}!`);
    await refreshAdminDashboard();
}
