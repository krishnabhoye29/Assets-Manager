class MunicipalMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = L.map(containerId).setView([19.080, 72.879], 11);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors | Municipal GIS'
        }).addTo(this.map);

        this.zonesLayer = null;
        this.markersLayer = L.layerGroup().addTo(this.map);
        
        this.currentViewMode = options.viewMode || 'Total Complaints';
        this.filterStatus = 'All';
        this.filterDepartment = 'All';
        this.onZoneClickCallback = options.onZoneClick || null;
        this.onMapClickCallback = options.onMapClick || null;
        this.onComplaintEditCallback = options.onComplaintEdit || null;
        
        if (this.onMapClickCallback) {
            this.map.on('click', (e) => {
                this.onMapClickCallback(e.latlng);
            });
        }
        
        this.legend = L.control({position: 'bottomright'});
        this.initLegend();
    }

    async render(zonesData, complaintsData) {
        this.zonesData = zonesData;
        this.complaintsData = complaintsData;
        this.updateMap();
    }

    updateFilters(status, department, viewMode) {
        if (status !== undefined) this.filterStatus = status;
        if (department !== undefined) this.filterDepartment = department;
        if (viewMode !== undefined) this.currentViewMode = viewMode;
        
        this.updateMap();
    }

    getFilteredComplaints() {
        if (!this.complaintsData) return [];
        return this.complaintsData.filter(c => {
            if (this.filterStatus !== 'All' && c.status !== this.filterStatus) return false;
            if (this.filterDepartment !== 'All' && c.department !== this.filterDepartment) return false;
            return true;
        });
    }

    getZoneStats(zoneId, filteredComplaints) {
        const zoneComplaints = filteredComplaints.filter(c => c.zoneId === zoneId);
        const total = zoneComplaints.length;
        const pending = zoneComplaints.filter(c => c.status === 'Pending').length;
        const underProcess = zoneComplaints.filter(c => c.status === 'Under Process').length;
        const resolved = zoneComplaints.filter(c => c.status === 'Resolved').length;
        const critical = zoneComplaints.filter(c => c.priority === 'Critical').length;
        
        let value = 0;
        if (this.currentViewMode === 'Total Complaints') value = total;
        else if (this.currentViewMode === 'Pending') value = pending;
        else if (this.currentViewMode === 'Under Process') value = underProcess;
        else if (this.currentViewMode === 'Resolved') value = resolved;
        else if (this.currentViewMode === 'Critical Complaints') value = critical;
        else if (this.currentViewMode === 'Resolution Rate') {
            value = total > 0 ? (resolved / total) * 100 : 0;
        }

        return { total, pending, underProcess, resolved, critical, value, zoneComplaints };
    }

    getColor(value, maxFilteredValue = null) {
        if (this.currentViewMode === 'Resolution Rate') {
            return value >= 80 ? '#10b981' :
                   value >= 60 ? '#84cc16' :
                   value >= 40 ? '#facc15' :
                   value >= 20 ? '#fb923c' :
                   value > 0   ? '#ef4444' : '#e2e8f0';
        }
        
        // If max filtered value across wards is small (e.g. single department filter)
        if (maxFilteredValue !== null && maxFilteredValue > 0 && maxFilteredValue <= 6) {
            return value >= 5 ? '#bd0026' :
                   value >= 3 ? '#f03b20' :
                   value >= 2 ? '#fd8d3c' :
                   value >= 1 ? '#fed976' :
                                '#f8fafc';
        }

        // Practical graduated municipal scale for complaints per ward:
        return value >= 20 ? '#800026' : // 20+ (Critical / Severe - Deep Burgundy)
               value >= 16 ? '#bd0026' : // 16 - 19 (High Density - Strong Crimson)
               value >= 13 ? '#f03b20' : // 13 - 15 (Elevated - Vivid Red-Orange)
               value >= 10 ? '#fd8d3c' : // 10 - 12 (Moderate - Bright Orange)
               value >= 7  ? '#feb24c' : // 7 - 9 (Low-Moderate - Warm Amber)
               value >= 4  ? '#fed976' : // 4 - 6 (Low - Gold)
               value >= 1  ? '#ffeda0' : // 1 - 3 (Very Low - Soft Cream)
                             '#f8fafc';  // 0 (Zero Complaints - Clean Slate)
    }

    getZoneId(feature) {
        return feature.properties.name || feature.properties.ward || feature.properties.zone_id || "Unknown";
    }

    getZoneName(feature) {
        if (feature.properties.zone_name) return feature.properties.zone_name;
        if (window.dataService) {
            const ward = window.dataService.getWard(this.getZoneId(feature));
            return ward.fullName;
        }
        return `Ward ${this.getZoneId(feature)}`;
    }

    style(feature, filteredComplaints) {
        const stats = this.getZoneStats(this.getZoneId(feature), filteredComplaints);
        const hasComplaints = stats.total > 0;
        
        return {
            fillColor: this.getColor(stats.value, this.maxWardValue),
            weight: hasComplaints ? 2 : 1.5,
            opacity: 1,
            color: hasComplaints ? '#1e3a8a' : '#94a3b8',
            dashArray: hasComplaints ? '' : '2',
            fillOpacity: hasComplaints ? 0.75 : 0.4
        };
    }

    updateMap() {
        if (this.zonesLayer) {
            this.map.removeLayer(this.zonesLayer);
        }
        this.markersLayer.clearLayers();

        const filteredComplaints = this.getFilteredComplaints();

        // Calculate maximum value across all zones for dynamic color scaling
        let maxVal = 0;
        if (this.zonesData && this.zonesData.features) {
            this.zonesData.features.forEach(f => {
                const s = this.getZoneStats(this.getZoneId(f), filteredComplaints);
                if (s.value > maxVal) maxVal = s.value;
            });
        }
        this.maxWardValue = maxVal;

        if (this.zonesData) {
            this.zonesLayer = L.geoJSON(this.zonesData, {
                style: (feature) => this.style(feature, filteredComplaints),
                onEachFeature: (feature, layer) => {
                    const zoneId = this.getZoneId(feature);
                    const zoneName = this.getZoneName(feature);
                    const stats = this.getZoneStats(zoneId, filteredComplaints);
                    
                    // Tooltip on hover
                    let tooltipContent = `<strong>${zoneName}</strong><br/>`;
                    tooltipContent += `<span style="font-size:0.85rem;">Total Complaints: ${stats.total} (Pending: ${stats.pending}, Resolved: ${stats.resolved})</span><br/>`;
                    tooltipContent += `<span style="color:#2563eb; font-size:0.8rem;">${this.currentViewMode}: ${this.currentViewMode === 'Resolution Rate' ? stats.value.toFixed(1) + '%' : stats.value}</span>`;
                    layer.bindTooltip(tooltipContent, { sticky: true });

                    // Hover effects & click
                    layer.on({
                        mouseover: (e) => {
                            const l = e.target;
                            l.setStyle({
                                weight: 3,
                                color: '#1e3a8a',
                                fillOpacity: 0.85
                            });
                            l.bringToFront();
                        },
                        mouseout: (e) => {
                            this.zonesLayer.resetStyle(e.target);
                        },
                        click: (e) => {
                            if (this.onZoneClickCallback) {
                                this.onZoneClickCallback(feature, stats);
                            } else {
                                this.map.fitBounds(e.target.getBounds());
                            }
                        }
                    });
                }
            }).addTo(this.map);
        }

        // Add markers for dynamically submitted complaints
        filteredComplaints.forEach(c => {
            if (isNaN(c.latitude) || isNaN(c.longitude)) return;

            const markerColor = c.status === 'Resolved' ? '#10b981' : (c.status === 'Under Process' ? '#f59e0b' : '#ef4444');
            const marker = L.circleMarker([c.latitude, c.longitude], {
                radius: 7,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            });
            
            const popupContent = `
                <div style="min-width: 200px; font-family: inherit;">
                    <div style="font-weight: bold; font-size: 1rem; color: #1e3a8a; margin-bottom: 4px;">${c.id}</div>
                    <div style="font-size: 0.85rem; color: #4b5563; margin-bottom: 6px;">${c.zoneName || 'Ward ' + c.zoneId}</div>
                    <div style="margin-bottom: 4px;"><strong>Category:</strong> ${c.category}</div>
                    <div style="margin-bottom: 4px;"><strong>Dept:</strong> ${c.department}</div>
                    <div style="margin-bottom: 6px; display:flex; gap:6px;">
                        <span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span>
                        <span class="badge ${c.priority.toLowerCase()}">${c.priority}</span>
                    </div>
                    <div style="font-size: 0.85rem; color: #374151; margin-bottom: 8px; max-height: 60px; overflow-y:auto; background:#f9fafb; padding:4px 6px; border-radius:4px;">
                        ${c.description}
                    </div>
                    <a href="admin-complaints.html?editId=${encodeURIComponent(c.id)}" style="display:inline-block; padding:4px 10px; background:#2563eb; color:white; border-radius:4px; text-decoration:none; font-size:0.8rem; font-weight:bold;">
                        Edit Complaint &rarr;
                    </a>
                </div>
            `;
            marker.bindPopup(popupContent);
            this.markersLayer.addLayer(marker);
        });
        
        // Ensure bounds fit the zones
        if (this.zonesLayer && Object.keys(this.zonesLayer._layers).length > 0) {
            this.map.fitBounds(this.zonesLayer.getBounds(), { padding: [20, 20] });
        }
        
        this.updateLegend();
    }

    initLegend() {
        this.legend.onAdd = (map) => {
            this.legendDiv = L.DomUtil.create('div', 'info legend');
            return this.legendDiv;
        };
        this.legend.addTo(this.map);
    }

    updateLegend() {
        if (!this.legendDiv) return;
        
        if (this.currentViewMode === 'Resolution Rate') {
            this.legendDiv.innerHTML = '<div class="legend-title">Resolution Rate</div>';
            const rateTiers = [
                { label: '80% &ndash; 100%', color: '#10b981' },
                { label: '60% &ndash; 79%',  color: '#84cc16' },
                { label: '40% &ndash; 59%',  color: '#facc15' },
                { label: '20% &ndash; 39%',  color: '#fb923c' },
                { label: '1% &ndash; 19%',   color: '#ef4444' },
                { label: '0% / No Data',     color: '#e2e8f0' }
            ];
            rateTiers.forEach(tier => {
                this.legendDiv.innerHTML += `
                    <div style="display:flex; align-items:center; margin:3px 0; font-size:0.78rem;">
                        <i style="background:${tier.color}; width:15px; height:15px; margin-right:8px; border:1px solid rgba(0,0,0,0.15); border-radius:2px; display:inline-block;"></i>
                        <span>${tier.label}</span>
                    </div>`;
            });
        } else if (this.maxWardValue !== null && this.maxWardValue > 0 && this.maxWardValue <= 6) {
            const title = this.currentViewMode === 'Total Complaints' ? 'Complaints per Ward' : `${this.currentViewMode} per Ward`;
            this.legendDiv.innerHTML = `<div class="legend-title">${title}</div>`;
            const lowTiers = [
                { label: '5+ complaints', color: '#bd0026' },
                { label: '3 &ndash; 4 complaints', color: '#f03b20' },
                { label: '2 complaints', color: '#fd8d3c' },
                { label: '1 complaint', color: '#fed976' },
                { label: '0 complaints', color: '#f8fafc' }
            ];
            lowTiers.forEach(tier => {
                this.legendDiv.innerHTML += `
                    <div style="display:flex; align-items:center; margin:3px 0; font-size:0.78rem;">
                        <i style="background:${tier.color}; width:15px; height:15px; margin-right:8px; border:1px solid rgba(0,0,0,0.15); border-radius:2px; display:inline-block;"></i>
                        <span>${tier.label}</span>
                    </div>`;
            });
        } else {
            const title = this.currentViewMode === 'Total Complaints' ? 'Complaints per Ward' : `${this.currentViewMode} per Ward`;
            this.legendDiv.innerHTML = `<div class="legend-title">${title}</div>`;
            const tiers = [
                { label: '20+ complaints', color: '#800026' },
                { label: '16 &ndash; 19 complaints', color: '#bd0026' },
                { label: '13 &ndash; 15 complaints', color: '#f03b20' },
                { label: '10 &ndash; 12 complaints', color: '#fd8d3c' },
                { label: '7 &ndash; 9 complaints', color: '#feb24c' },
                { label: '4 &ndash; 6 complaints', color: '#fed976' },
                { label: '1 &ndash; 3 complaints', color: '#ffeda0' },
                { label: '0 complaints', color: '#f8fafc' }
            ];
            tiers.forEach(tier => {
                this.legendDiv.innerHTML += `
                    <div style="display:flex; align-items:center; margin:3px 0; font-size:0.78rem;">
                        <i style="background:${tier.color}; width:15px; height:15px; margin-right:8px; border:1px solid rgba(0,0,0,0.15); border-radius:2px; display:inline-block;"></i>
                        <span>${tier.label}</span>
                    </div>`;
            });
        }
    }
}
