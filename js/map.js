class MunicipalMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.map = L.map(containerId).setView([19.080, 72.879], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        this.zonesLayer = null;
        this.markersLayer = L.layerGroup().addTo(this.map);
        
        this.currentViewMode = options.viewMode || 'Total Complaints';
        this.filterStatus = 'All';
        this.filterDepartment = 'All';
        this.onZoneClickCallback = options.onZoneClick || null;
        this.onMapClickCallback = options.onMapClick || null;
        
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

    getColor(value) {
        if (this.currentViewMode === 'Resolution Rate') {
            // Higher is better (greener)
            return value > 80 ? '#10b981' :
                   value > 60 ? '#84cc16' :
                   value > 40 ? '#facc15' :
                   value > 20 ? '#fb923c' :
                   value > 0  ? '#ef4444' : '#e5e7eb';
        }
        
        // Default complaint count coloring
        return value > 150 ? '#800026' :
               value > 100 ? '#bd0026' :
               value > 50  ? '#e31a1c' :
               value > 25  ? '#fc4e2a' :
               value > 0   ? '#fd8d3c' :
                             '#fef0d9';
    }

    getZoneId(feature) {
        return feature.properties.name || feature.properties.ward || feature.properties.zone_id || "Unknown";
    }

    getZoneName(feature) {
        return feature.properties.zone_name || `Ward ${this.getZoneId(feature)}`;
    }

    style(feature, filteredComplaints) {
        const stats = this.getZoneStats(this.getZoneId(feature), filteredComplaints);
        
        return {
            fillColor: this.getColor(stats.value),
            weight: 2,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    updateMap() {
        if (this.zonesLayer) {
            this.map.removeLayer(this.zonesLayer);
        }
        this.markersLayer.clearLayers();

        const filteredComplaints = this.getFilteredComplaints();

        this.zonesLayer = L.geoJSON(this.zonesData, {
            style: (feature) => this.style(feature, filteredComplaints),
            onEachFeature: (feature, layer) => {
                const zoneId = this.getZoneId(feature);
                const zoneName = this.getZoneName(feature);
                const stats = this.getZoneStats(zoneId, filteredComplaints);
                
                // Tooltip on hover
                let tooltipContent = `<b>${zoneName}</b><br/>`;
                tooltipContent += `${this.currentViewMode}: ${this.currentViewMode === 'Resolution Rate' ? stats.value.toFixed(1) + '%' : stats.value}`;
                layer.bindTooltip(tooltipContent, {sticky: true});

                // Click event
                layer.on({
                    mouseover: (e) => {
                        const l = e.target;
                        l.setStyle({
                            weight: 4,
                            color: '#666',
                            dashArray: '',
                            fillOpacity: 0.9
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

        // Add markers
        filteredComplaints.forEach(c => {
            const markerColor = c.status === 'Resolved' ? 'green' : (c.status === 'Under Process' ? 'orange' : 'red');
            // Using standard Leaflet marker, we could use custom icons but let's keep it simple with colored circles for scale
            const marker = L.circleMarker([c.latitude, c.longitude], {
                radius: 6,
                fillColor: markerColor,
                color: '#fff',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
            
            const popupContent = `
                <b>${c.id}</b><br/>
                Category: ${c.category}<br/>
                Status: <span class="badge ${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span><br/>
                Priority: <span class="badge ${c.priority.toLowerCase()}">${c.priority}</span>
            `;
            marker.bindPopup(popupContent);
            this.markersLayer.addLayer(marker);
        });
        
        // Ensure bounds fit the zones
        if (this.zonesLayer && Object.keys(this.zonesLayer._layers).length > 0) {
           this.map.fitBounds(this.zonesLayer.getBounds());
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
        
        let labels = [];
        
        if (this.currentViewMode === 'Resolution Rate') {
            this.legendDiv.innerHTML = '<div class="legend-title">Resolution Rate</div>';
            const grades = [0, 20, 40, 60, 80];
            for (let i = 0; i < grades.length; i++) {
                this.legendDiv.innerHTML +=
                    '<i style="background:' + this.getColor(grades[i] + 1) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '%<br>' : '+%');
            }
        } else {
            this.legendDiv.innerHTML = '<div class="legend-title">Complaint Density</div>';
            const grades = [0, 1, 26, 51, 101, 151];
            for (let i = 0; i < grades.length; i++) {
                this.legendDiv.innerHTML +=
                    '<i style="background:' + this.getColor(grades[i]) + '"></i> ' +
                    grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 1) + '<br>' : '+');
            }
        }
    }
}
