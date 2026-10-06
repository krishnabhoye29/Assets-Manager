// data-service.js
// This service simulates database operations. Later, these functions can be replaced with Supabase queries.

class DataService {
  constructor() {
    this.complaints = [];
    this.zones = null;
    this.workers = [];
    this.departments = [];
    this.assets = [];
  }

  async loadInitialData() {
    try {
      const [complaintsRes, zonesRes, workersRes, deptsRes, assetsRes] = await Promise.all([
        fetch('data/complaints.json'),
        fetch('data/zones.geojson'),
        fetch('data/workers.json'),
        fetch('data/departments.json'),
        fetch('data/assets.json')
      ]);

      this.complaints = await complaintsRes.json();
      this.zones = await zonesRes.json();
      this.workers = await workersRes.json();
      this.departments = await deptsRes.json();
      this.assets = await assetsRes.json();
      
      // Generate accurate mock data based on the real GeoJSON
      this.generateDynamicData();
      
      console.log("Mock data loaded and dynamically populated");
    } catch (e) {
      console.error("Failed to load mock data. Ensure you are running this through a local web server (e.g., Live Server, python -m http.server) to avoid CORS issues.", e);
      alert("Failed to load mock data. Please run using a local web server.");
    }
  }

  async getComplaints() {
    return this.complaints;
  }

  async getZones() {
    return this.zones;
  }

  async getWorkers() {
    return this.workers;
  }

  async getDepartments() {
    return this.departments;
  }

  async getAssets() {
    return this.assets;
  }

  // Detect zone based on coordinates using Turf.js
  detectZone(latitude, longitude) {
    if (!this.zones) return null;
    const pt = turf.point([longitude, latitude]);
    for (let feature of this.zones.features) {
      if (turf.booleanPointInPolygon(pt, feature)) {
        const zoneId = feature.properties.name || feature.properties.ward || feature.properties.zone_id || "Unknown";
        return {
          id: zoneId,
          name: `Ward ${zoneId}`
        };
      }
    }
    return null;
  }

  async submitComplaint(complaintData) {
    // Generate mock ID
    const nextId = this.complaints.length + 1;
    const id = `CMP-2026-${nextId.toString().padStart(4, '0')}`;
    
    const newComplaint = {
      id,
      citizenId: complaintData.citizenId || "CIT999",
      zoneId: complaintData.zoneId,
      zoneName: complaintData.zoneName,
      category: complaintData.category,
      department: complaintData.department,
      priority: complaintData.priority,
      status: "Pending",
      latitude: complaintData.latitude,
      longitude: complaintData.longitude,
      description: complaintData.description,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    this.complaints.unshift(newComplaint); // Add to top
    return newComplaint;
  }

  async updateComplaintStatus(id, newStatus) {
    const complaint = this.complaints.find(c => c.id === id);
    if (complaint) {
      complaint.status = newStatus;
    }
    return complaint;
  }

  async addWorker(workerData) {
    const nextId = this.workers.length + 1;
    const id = `WRK-${nextId.toString().padStart(2, '0')}`;
    const newWorker = {
        id,
        name: workerData.name,
        email: `${workerData.name.toLowerCase().replace(' ', '')}@demo.com`,
        department: workerData.department,
        zoneId: workerData.zoneId,
        status: workerData.status || "Active"
    };
    this.workers.push(newWorker);
    return newWorker;
  }

  async updateWorkerStatus(id, newStatus) {
    const worker = this.workers.find(w => w.id === id);
    if (worker) {
        worker.status = newStatus;
    }
    return worker;
  }

  async updateZoneName(zoneId, newName) {
    if (!this.zones) return false;
    let updated = false;
    for (let feature of this.zones.features) {
      if ((feature.properties.name || feature.properties.ward || feature.properties.zone_id) === zoneId) {
        feature.properties.zone_name = newName;
        updated = true;
        break;
      }
    }
    // Update all complaints in this zone to have the new name
    if (updated) {
        this.complaints.forEach(c => {
            if (c.zoneId === zoneId) c.zoneName = newName;
        });
    }
    return updated;
  }

  generateDynamicData() {
    if (!this.zones || !this.zones.features) return;
    
    const categories = ["Streetlight", "Road", "Footpath", "Sewage", "Drainage", "Garbage", "Public Toilet", "Bus Stop", "Water Supply", "Garden", "Safety Issue", "Other"];
    const priorities = ["Low", "Medium", "High", "Critical"];
    const statuses = ["Pending", "Under Process", "Resolved"];
    const departments = {
        "Streetlight": "Streetlight Department", "Road": "Roads Department", "Footpath": "Footpath Department",
        "Sewage": "Water & Sewage Department", "Drainage": "Water & Sewage Department", "Water Supply": "Water & Sewage Department",
        "Garbage": "Sanitation Department", "Public Toilet": "Public Facilities Department", "Bus Stop": "Public Facilities Department",
        "Garden": "Public Facilities Department", "Safety Issue": "Safety Department", "Other": "General Maintenance"
    };

    let newComplaints = [];
    let cmpId = 1;
    
    // Generate 150 complaints across Mumbai wards
    for (let i = 0; i < 150; i++) {
        // Pick a random ward
        const randomFeature = this.zones.features[Math.floor(Math.random() * this.zones.features.length)];
        // Get bounding box of this ward
        const bbox = turf.bbox(randomFeature);
        
        let point;
        let valid = false;
        // Keep generating random points in bbox until one falls inside the polygon
        for(let j=0; j<50; j++) {
            point = turf.randomPoint(1, {bbox: bbox}).features[0];
            if (turf.booleanPointInPolygon(point, randomFeature)) {
                valid = true; break;
            }
        }
        
        if (valid) {
            const cat = categories[Math.floor(Math.random() * categories.length)];
            const zoneId = randomFeature.properties.name || randomFeature.properties.ward || randomFeature.properties.zone_id;
            
            newComplaints.push({
                id: `CMP-2026-${cmpId.toString().padStart(4, '0')}`,
                citizenId: `CIT${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
                zoneId: zoneId,
                zoneName: `Ward ${zoneId}`,
                category: cat,
                department: departments[cat],
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                status: statuses[Math.floor(Math.random() * statuses.length)],
                latitude: point.geometry.coordinates[1],
                longitude: point.geometry.coordinates[0],
                description: `Issue regarding ${cat.toLowerCase()}`,
                createdAt: `2026-10-0${Math.floor(Math.random() * 6) + 1}`
            });
            cmpId++;
        }
    }
    
    this.complaints = newComplaints;
  }
}

window.dataService = new DataService();
