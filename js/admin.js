let adminMap;
let zoneChartInstance;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Data
    await window.dataService.loadInitialData();
    const complaints = await window.dataService.getComplaints();
    const zones = await window.dataService.getZones();
    const workers = await window.dataService.getWorkers();
    
    // 2. Initialize Dashboard Stats
    updateAdminStats(complaints, workers, zones);
    
    // 3. Initialize Map
    adminMap = new MunicipalMap('map', {
        viewMode: 'Total Complaints',
        onZoneClick: handleZoneClick
    });
    
    await adminMap.render(zones, complaints);
    
    // 4. Populate Top Zones
    updateTopZones(zones, complaints);
    
    // 5. Setup Filters
    document.getElementById('mapViewMode').addEventListener('change', (e) => {
        adminMap.updateFilters(undefined, undefined, e.target.value);
    });
    document.getElementById('filterStatus').addEventListener('change', (e) => {
        adminMap.updateFilters(e.target.value, undefined, undefined);
    });
    document.getElementById('filterDepartment').addEventListener('change', (e) => {
        adminMap.updateFilters(undefined, e.target.value, undefined);
    });
});

function updateAdminStats(complaints, workers, zones) {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'Pending').length;
    const underProcess = complaints.filter(c => c.status === 'Under Process').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const critical = complaints.filter(c => c.priority === 'Critical').length;
    
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
            <h3>Critical</h3>
            <div class="value" style="color: var(--status-pending);">${critical}</div>
        </div>
        <div class="stat-card">
            <h3>Total Workers</h3>
            <div class="value">${workers.length}</div>
        </div>
    `;
    document.getElementById('adminStats').innerHTML = html;
}

function updateTopZones(zones, complaints) {
    const zoneCounts = zones.features.map(f => {
        const zoneId = adminMap.getZoneId(f);
        return {
            name: adminMap.getZoneName(f),
            id: zoneId,
            count: complaints.filter(c => c.zoneId === zoneId).length
        };
    });
    
    zoneCounts.sort((a, b) => b.count - a.count);
    
    let html = '<ul style="list-style:none; padding:0;">';
    zoneCounts.slice(0, 5).forEach(zc => {
        html += `
            <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                <strong>${zc.name}</strong>
                <span>${zc.count} complaints</span>
            </li>
        `;
    });
    html += '</ul>';
    
    document.getElementById('topZonesList').innerHTML = html;
}

let currentActiveZoneId = null;

function handleZoneClick(feature, stats) {
    const panel = document.getElementById('zonePanel');
    
    currentActiveZoneId = adminMap.getZoneId(feature);
    const zoneName = adminMap.getZoneName(feature);
    
    document.getElementById('zpName').innerText = zoneName;
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
    
    const ctx = document.getElementById('zoneChart').getContext('2d');
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
                    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
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
        alert(`Zone renamed successfully to ${newName}`);
    } else {
        alert("Failed to rename zone.");
    }
}

function viewZoneComplaints() {
    if (currentActiveZoneId) {
        window.location.href = `admin-complaints.html?zoneId=${encodeURIComponent(currentActiveZoneId)}`;
    }
}
