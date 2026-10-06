const myWorkerId = "WRK-01"; // Mock worker ID

document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    loadWorkerData();
});

async function loadWorkerData() {
    const workers = await window.dataService.getWorkers();
    const me = workers.find(w => w.id === myWorkerId);
    
    if (me) {
        // Automatically mock worker to the first available zone since zone IDs changed
        const zones = await window.dataService.getZones();
        let myZoneName = "All Zones";
        if (zones && zones.features.length > 0) {
            const firstZone = zones.features[0];
            me.zoneId = featureToZoneId(firstZone);
            myZoneName = `Ward ${me.zoneId}`;
        }
        
        document.getElementById('workerName').innerText = me.name;
        document.getElementById('workerDept').innerText = me.department;
        document.getElementById('workerZone').innerText = myZoneName;
    }

    function featureToZoneId(f) {
        return f.properties.name || f.properties.ward || f.properties.zone_id;
    }

    const complaints = await window.dataService.getComplaints();
    // Simulate assignments by filtering complaints in their department and zone
    const myAssignments = complaints.filter(c => c.department === me.department && c.zoneId === me.zoneId);

    // Update Stats
    const total = myAssignments.length;
    const pending = myAssignments.filter(c => c.status === 'Pending').length;
    const underProcess = myAssignments.filter(c => c.status === 'Under Process').length;
    const resolved = myAssignments.filter(c => c.status === 'Resolved').length;

    document.getElementById('workerStats').innerHTML = `
        <div class="stat-card"><h3>Total Assigned</h3><div class="value">${total}</div></div>
        <div class="stat-card"><h3>Pending</h3><div class="value" style="color:var(--status-pending);">${pending}</div></div>
        <div class="stat-card"><h3>Under Process</h3><div class="value" style="color:var(--status-process);">${underProcess}</div></div>
        <div class="stat-card"><h3>Resolved</h3><div class="value" style="color:var(--status-resolved);">${resolved}</div></div>
    `;

    // Update Table
    let html = '';
    myAssignments.forEach(c => {
        let actions = '';
        if (c.status === 'Pending') {
            actions = `<button class="btn btn-warning" onclick="updateStatus('${c.id}', 'Under Process')" style="padding:5px 10px; font-size:0.8rem;">Start Work</button>`;
        } else if (c.status === 'Under Process') {
            actions = `<button class="btn btn-success" onclick="updateStatus('${c.id}', 'Resolved')" style="padding:5px 10px; font-size:0.8rem;">Mark Resolved</button>`;
        } else {
            actions = `<span style="color:var(--status-resolved); font-weight:bold;">Completed</span>`;
        }
        
        html += `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td>${c.category}</td>
                <td>${c.zoneName}</td>
                <td><span class="badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
                <td><span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></td>
                <td style="max-width: 200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.description}">${c.description}</td>
                <td>${actions}</td>
            </tr>
        `;
    });
    document.getElementById('assignmentsTable').querySelector('tbody').innerHTML = html;
}

async function updateStatus(id, newStatus) {
    await window.dataService.updateComplaintStatus(id, newStatus);
    loadWorkerData(); // Refresh UI
}
