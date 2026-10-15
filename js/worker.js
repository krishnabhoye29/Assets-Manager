let currentWorkerId = localStorage.getItem('currentWorkerId') || 'WRK-01';

document.addEventListener('DOMContentLoaded', async () => {
    await window.dataService.loadInitialData();
    populateWorkerSwitcher();
    await loadWorkerData();

    // Auto-refresh when complaints or worker assignments change in other tabs
    window.addEventListener('storage', async (e) => {
        if (e.key === 'municipal_complaints' || e.key === 'municipal_workers') {
            await loadWorkerData();
        }
    });
});

async function populateWorkerSwitcher() {
    const workers = await window.dataService.getWorkers();
    const select = document.getElementById('workerSelectDropdown');
    if (!select) return;

    select.innerHTML = '';
    workers.forEach(w => {
        const ward = window.dataService.getWard(w.zoneId);
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.name} (${w.id}) - ${w.department} [${ward.name}]`;
        if (w.id === currentWorkerId) {
            opt.selected = true;
        }
        select.appendChild(opt);
    });
}

function switchWorkerProfile(workerId) {
    currentWorkerId = workerId;
    localStorage.setItem('currentWorkerId', workerId);
    loadWorkerData();
}

async function loadWorkerData() {
    const workers = await window.dataService.getWorkers();
    let me = workers.find(w => w.id === currentWorkerId);
    
    // Fallback if currentWorkerId was removed
    if (!me && workers.length > 0) {
        me = workers[0];
        currentWorkerId = me.id;
        localStorage.setItem('currentWorkerId', currentWorkerId);
    }
    
    if (me) {
        const ward = window.dataService.getWard(me.zoneId);
        
        document.getElementById('workerName').innerText = me.name;
        document.getElementById('workerDept').innerText = me.department;
        document.getElementById('workerZone').innerText = ward.fullName;
        document.getElementById('workerIdBadge').innerText = me.id;

        const select = document.getElementById('workerSelectDropdown');
        if (select && select.value !== me.id) {
            select.value = me.id;
        }
    }

    const complaints = await window.dataService.getComplaints();
    
    // STRICT REQUIREMENT 1:
    // Workers should ONLY see complaints relevant to their assigned department and ward!
    const myAssignments = complaints.filter(c => {
        if (!me) return false;
        return c.department === me.department && c.zoneId === me.zoneId;
    });

    // Update Stats
    const total = myAssignments.length;
    const pending = myAssignments.filter(c => c.status === 'Pending').length;
    const underProcess = myAssignments.filter(c => c.status === 'Under Process').length;
    const resolved = myAssignments.filter(c => c.status === 'Resolved').length;

    document.getElementById('workerStats').innerHTML = `
        <div class="stat-card">
            <h3>Total Assigned</h3>
            <div class="value">${total}</div>
        </div>
        <div class="stat-card">
            <h3>Pending</h3>
            <div class="value" style="color:var(--status-pending);">${pending}</div>
        </div>
        <div class="stat-card">
            <h3>Under Process</h3>
            <div class="value" style="color:var(--status-process);">${underProcess}</div>
        </div>
        <div class="stat-card">
            <h3>Resolved</h3>
            <div class="value" style="color:var(--status-resolved);">${resolved}</div>
        </div>
    `;

    document.getElementById('assignmentBadge').innerText = `${total} ${total === 1 ? 'Complaint' : 'Complaints'}`;

    const tbody = document.querySelector('#assignmentsTable tbody');
    const emptyState = document.getElementById('workerEmptyState');
    const emptyStateMsg = document.getElementById('emptyStateMsg');

    if (total === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        if (me) {
            const ward = window.dataService.getWard(me.zoneId);
            emptyStateMsg.innerHTML = `
                Currently no complaints assigned for <strong>${me.department}</strong> in <strong>${ward.fullName}</strong>.<br>
                Submit a <em>${me.department}</em> complaint located in <em>${ward.name}</em> from the Citizen Portal to view it here!
            `;
        }
        return;
    }

    emptyState.style.display = 'none';

    // Update Table
    let html = '';
    myAssignments.forEach(c => {
        const ward = window.dataService.getWard(c.zoneId);
        let actions = '';
        if (c.status === 'Pending') {
            actions = `<button class="btn btn-warning" onclick="updateStatus('${c.id}', 'Under Process')" style="padding:6px 12px; font-size:0.8rem; font-weight:600;">Start Work</button>`;
        } else if (c.status === 'Under Process') {
            actions = `<button class="btn btn-success" onclick="updateStatus('${c.id}', 'Resolved')" style="padding:6px 12px; font-size:0.8rem; font-weight:600;">Mark Resolved</button>`;
        } else {
            actions = `<span style="color:var(--status-resolved); font-weight:bold; font-size:0.85rem;">✓ Completed</span>`;
        }
        
        const citizenDetails = c.citizenName ? `${c.citizenName}<br><span style="font-size:0.75rem; color:#6b7280;">${c.citizenContact || c.citizenId || ''}</span>` : (c.citizenId || 'Citizen');

        html += `
            <tr>
                <td><strong style="color:#1e3a8a;">${c.id}</strong></td>
                <td>${c.category}</td>
                <td><strong>${ward.name}</strong><br><span style="font-size:0.75rem; color:#6b7280;">${ward.locality.split(',')[0]}</span></td>
                <td><span class="badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
                <td><span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></td>
                <td style="max-width: 250px; font-size:0.85rem;" title="${c.description}">${c.description}</td>
                <td style="font-size:0.85rem;">${citizenDetails}</td>
                <td>${actions}</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

async function updateStatus(id, newStatus) {
    await window.dataService.updateComplaintStatus(id, newStatus);
    await loadWorkerData(); // Refresh UI
}
