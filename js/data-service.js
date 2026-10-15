// data-service.js
// Centralized mock data & persistence service for Municipal Asset & Complaint Management System

const OFFICIAL_WARDS = {
  "A": { id: "A", name: "Ward A", locality: "Colaba, Fort, Nariman Point, Churchgate", fullName: "Ward A (Colaba, Fort, Churchgate)" },
  "B": { id: "B", name: "Ward B", locality: "Sandhurst Road, Dongri, Masjid Bunder", fullName: "Ward B (Sandhurst Road, Dongri)" },
  "C": { id: "C", name: "Ward C", locality: "Marine Lines, Bhuleshwar, Chira Bazaar", fullName: "Ward C (Marine Lines, Bhuleshwar)" },
  "D": { id: "D", name: "Ward D", locality: "Malabar Hill, Grant Road, Walkeshwar, Girgaon", fullName: "Ward D (Malabar Hill, Grant Road)" },
  "E": { id: "E", name: "Ward E", locality: "Byculla, Mazgaon, Mumbai Central", fullName: "Ward E (Byculla, Mazgaon)" },
  "F/N": { id: "F/N", name: "Ward F/North", locality: "Matunga, Sion, Wadala, Hindu Colony", fullName: "Ward F/North (Matunga, Sion, Wadala)" },
  "F/S": { id: "F/S", name: "Ward F/South", locality: "Parel, Sewri, Naigaon, Lalbaug", fullName: "Ward F/South (Parel, Sewri)" },
  "G/N": { id: "G/N", name: "Ward G/North", locality: "Dadar, Mahim, Dharavi", fullName: "Ward G/North (Dadar, Mahim, Dharavi)" },
  "G/S": { id: "G/S", name: "Ward G/South", locality: "Worli, Lower Parel, Prabhadevi", fullName: "Ward G/South (Worli, Lower Parel)" },
  "H/E": { id: "H/E", name: "Ward H/East", locality: "Bandra East, Khar East, Santacruz East, BKC", fullName: "Ward H/East (Bandra East, Santacruz East, BKC)" },
  "H/W": { id: "H/W", name: "Ward H/West", locality: "Bandra West, Khar West, Santacruz West", fullName: "Ward H/West (Bandra West, Khar West)" },
  "K/E": { id: "K/E", name: "Ward K/East", locality: "Andheri East, Jogeshwari East, Vile Parle East", fullName: "Ward K/East (Andheri East, Jogeshwari East)" },
  "K/W": { id: "K/W", name: "Ward K/West", locality: "Andheri West, Juhu, Versova, Oshiwara", fullName: "Ward K/West (Andheri West, Juhu, Versova)" },
  "L": { id: "L", name: "Ward L", locality: "Kurla, Sakinaka, Chandivali, Asalpha", fullName: "Ward L (Kurla, Sakinaka, Chandivali)" },
  "M/E": { id: "M/E", name: "Ward M/East", locality: "Govandi, Mankhurd, Deonar, Chembur East", fullName: "Ward M/East (Govandi, Mankhurd)" },
  "M/W": { id: "M/W", name: "Ward M/West", locality: "Chembur West, Tilak Nagar, Mahul", fullName: "Ward M/West (Chembur West, Tilak Nagar)" },
  "N": { id: "N", name: "Ward N", locality: "Ghatkopar, Vidyavihar, Pant Nagar", fullName: "Ward N (Ghatkopar, Vidyavihar)" },
  "P/N": { id: "P/N", name: "Ward P/North", locality: "Malad, Marve, Manori, Madh", fullName: "Ward P/North (Malad, Marve, Manori)" },
  "P/S": { id: "P/S", name: "Ward P/South", locality: "Goregaon, Oshiwara South", fullName: "Ward P/South (Goregaon)" },
  "R/C": { id: "R/C", name: "Ward R/Central", locality: "Borivali, Gorai", fullName: "Ward R/Central (Borivali, Gorai)" },
  "R/N": { id: "R/N", name: "Ward R/North", locality: "Dahisar", fullName: "Ward R/North (Dahisar)" },
  "R/S": { id: "R/S", name: "Ward R/South", locality: "Kandivali, Charkop", fullName: "Ward R/South (Kandivali, Charkop)" },
  "S": { id: "S", name: "Ward S", locality: "Bhandup, Powai, Kanjurmarg, Vikhroli", fullName: "Ward S (Bhandup, Powai, Vikhroli)" },
  "T": { id: "T", name: "Ward T", locality: "Mulund, Nahur", fullName: "Ward T (Mulund, Nahur)" }
};

const CATEGORY_DEPARTMENT_MAP = {
  "Streetlight": "Streetlight Department",
  "Road": "Roads Department",
  "Footpath": "Footpath Department",
  "Sewage": "Water & Sewage Department",
  "Drainage": "Water & Sewage Department",
  "Water Supply": "Water & Sewage Department",
  "Garbage": "Sanitation Department",
  "Public Toilet": "Public Facilities Department",
  "Bus Stop": "Public Facilities Department",
  "Garden": "Public Facilities Department",
  "Safety Issue": "Safety Department",
  "Other": "General Maintenance"
};

class DataService {
  constructor() {
    this.complaints = [];
    this.zones = null;
    this.workers = [];
    this.departments = [];
    this.assets = [];
    this.isLoaded = false;
  }

  async loadInitialData() {
    if (this.isLoaded) return;

    try {
      const [complaintsRes, zonesRes, workersRes, deptsRes, assetsRes] = await Promise.all([
        fetch('data/complaints.json'),
        fetch('data/zones.geojson'),
        fetch('data/workers.json'),
        fetch('data/departments.json'),
        fetch('data/assets.json')
      ]);

      const baseComplaints = await complaintsRes.json();
      this.zones = await zonesRes.json();
      const baseWorkers = await workersRes.json();
      const baseDepartments = await deptsRes.json();
      this.assets = await assetsRes.json();

      // 1. Enrich GeoJSON features with official ward names and localities
      if (this.zones && this.zones.features) {
        this.zones.features.forEach(f => {
          const rawCode = f.properties.name || f.properties.ward || f.properties.zone_id;
          const wardInfo = this.getWard(rawCode);
          f.properties.name = wardInfo.id;
          f.properties.zone_name = wardInfo.fullName;
          f.properties.locality = wardInfo.locality;
        });

        // Apply custom renamed zones from storage if any
        const customZoneNames = this.getStorageItem('municipal_custom_zones', {});
        Object.entries(customZoneNames).forEach(([zid, name]) => {
          const feat = this.zones.features.find(f => f.properties.name === zid);
          if (feat) {
            feat.properties.zone_name = name;
          }
        });
      }

      // 2. Load or initialize dynamic complaints & workers across all 24 wards and 12 categories
      const seedVersion = localStorage.getItem('municipal_seed_v5');
      const storedComplaints = this.getStorageItem('municipal_complaints', null);
      if (seedVersion !== 'true' || !storedComplaints || storedComplaints.length < 300) {
        this.complaints = Array.isArray(baseComplaints) ? baseComplaints : [];
        this.workers = Array.isArray(baseWorkers) ? baseWorkers : [];
        this.departments = Array.isArray(baseDepartments) ? baseDepartments : [];
        this.saveComplaints();
        this.saveWorkers();
        this.saveDepartments();
        localStorage.setItem('municipal_seed_v5', 'true');
      } else {
        this.complaints = storedComplaints;

        const storedWorkers = this.getStorageItem('municipal_workers', null);
        this.workers = (storedWorkers !== null && Array.isArray(storedWorkers)) ? storedWorkers : baseWorkers;

        const storedDepartments = this.getStorageItem('municipal_departments', null);
        this.departments = (storedDepartments !== null && Array.isArray(storedDepartments)) ? storedDepartments : baseDepartments;
      }

      // Update worker counts per department
      this.recalculateDepartmentWorkerCounts();

      this.isLoaded = true;
      console.log("Municipal DataService initialized with official BMC wards & dynamic persistence.");
    } catch (e) {
      console.error("Failed to load initial data:", e);
      alert("Failed to load municipal data. Please ensure you are running through a local web server (e.g. Live Server or python -m http.server) to avoid CORS issues.");
    }
  }

  getStorageItem(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      console.warn(`Could not read ${key} from localStorage:`, e);
      return fallback;
    }
  }

  setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Could not save ${key} to localStorage:`, e);
    }
  }

  saveComplaints() {
    this.setStorageItem('municipal_complaints', this.complaints);
  }

  saveWorkers() {
    this.setStorageItem('municipal_workers', this.workers);
    this.recalculateDepartmentWorkerCounts();
  }

  saveDepartments() {
    this.setStorageItem('municipal_departments', this.departments);
  }

  recalculateDepartmentWorkerCounts() {
    if (!this.departments || !this.workers) return;
    this.departments.forEach(dept => {
      const activeCount = this.workers.filter(w => w.department === dept.name && w.status === 'Active').length;
      dept.workerCount = activeCount;
    });
    this.setStorageItem('municipal_departments', this.departments);
  }

  // Official Wards API
  getOfficialWards() {
    return Object.values(OFFICIAL_WARDS);
  }

  getWard(code) {
    if (!code) return { id: "Unknown", name: "Unknown Ward", locality: "", fullName: "Unknown Ward" };
    const cleanCode = code.trim();
    if (OFFICIAL_WARDS[cleanCode]) {
      return OFFICIAL_WARDS[cleanCode];
    }
    // Try case-insensitive lookup
    const found = Object.values(OFFICIAL_WARDS).find(w => w.id.toLowerCase() === cleanCode.toLowerCase());
    if (found) return found;

    return {
      id: cleanCode,
      name: `Ward ${cleanCode}`,
      locality: "",
      fullName: `Ward ${cleanCode}`
    };
  }

  getDepartmentForCategory(category) {
    return CATEGORY_DEPARTMENT_MAP[category] || "General Maintenance";
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

  // Detect official BMC ward based on coordinates using Turf.js
  detectZone(latitude, longitude) {
    if (!this.zones || !this.zones.features) return null;
    const pt = turf.point([longitude, latitude]);
    for (let feature of this.zones.features) {
      if (turf.booleanPointInPolygon(pt, feature)) {
        const zoneId = feature.properties.name || feature.properties.ward || feature.properties.zone_id;
        const ward = this.getWard(zoneId);
        return {
          id: ward.id,
          name: feature.properties.zone_name || ward.fullName,
          code: ward.id,
          locality: ward.locality
        };
      }
    }
    return null;
  }

  // Submit a dynamic citizen complaint
  async submitComplaint(complaintData) {
    // Generate sequential ID
    let maxNum = 0;
    this.complaints.forEach(c => {
      const match = c.id && c.id.match(/CMP-2026-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextId = maxNum + 1;
    const id = `CMP-2026-${nextId.toString().padStart(4, '0')}`;

    const wardInfo = this.getWard(complaintData.zoneId);
    const category = complaintData.category || "General";
    const department = complaintData.department || this.getDepartmentForCategory(category);

    const newComplaint = {
      id,
      citizenId: complaintData.citizenId || "CIT001",
      citizenName: complaintData.citizenName || "Citizen User",
      citizenContact: complaintData.citizenContact || "+91 98765 43210",
      zoneId: wardInfo.id,
      zoneName: complaintData.zoneName || wardInfo.fullName,
      category: category,
      department: department,
      priority: complaintData.priority || "Medium",
      status: "Pending",
      latitude: parseFloat(complaintData.latitude),
      longitude: parseFloat(complaintData.longitude),
      description: complaintData.description || "",
      createdAt: complaintData.createdAt || new Date().toISOString().split('T')[0],
      assignedWorker: complaintData.assignedWorker || null,
      adminNotes: complaintData.adminNotes || ""
    };

    this.complaints.unshift(newComplaint); // Add to top
    this.saveComplaints();
    return newComplaint;
  }

  // Full update for admin complaint editor
  async updateComplaint(id, updatedFields) {
    const complaint = this.complaints.find(c => c.id === id);
    if (!complaint) return null;

    if (updatedFields.zoneId && updatedFields.zoneId !== complaint.zoneId) {
      const ward = this.getWard(updatedFields.zoneId);
      complaint.zoneId = ward.id;
      complaint.zoneName = ward.fullName;
    }

    if (updatedFields.status !== undefined) complaint.status = updatedFields.status;
    if (updatedFields.priority !== undefined) complaint.priority = updatedFields.priority;
    if (updatedFields.category !== undefined) complaint.category = updatedFields.category;
    if (updatedFields.department !== undefined) complaint.department = updatedFields.department;
    if (updatedFields.description !== undefined) complaint.description = updatedFields.description;
    if (updatedFields.citizenName !== undefined) complaint.citizenName = updatedFields.citizenName;
    if (updatedFields.citizenContact !== undefined) complaint.citizenContact = updatedFields.citizenContact;
    if (updatedFields.assignedWorker !== undefined) complaint.assignedWorker = updatedFields.assignedWorker;
    if (updatedFields.adminNotes !== undefined) complaint.adminNotes = updatedFields.adminNotes;
    if (updatedFields.latitude !== undefined) complaint.latitude = parseFloat(updatedFields.latitude);
    if (updatedFields.longitude !== undefined) complaint.longitude = parseFloat(updatedFields.longitude);

    this.saveComplaints();
    return complaint;
  }

  async updateComplaintStatus(id, newStatus) {
    const complaint = this.complaints.find(c => c.id === id);
    if (complaint) {
      complaint.status = newStatus;
      this.saveComplaints();
    }
    return complaint;
  }

  // Worker Management
  async addWorker(workerData) {
    let maxNum = 0;
    this.workers.forEach(w => {
      const match = w.id && w.id.match(/WRK-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextId = maxNum + 1;
    const id = `WRK-${nextId.toString().padStart(2, '0')}`;

    const ward = this.getWard(workerData.zoneId);

    const newWorker = {
      id,
      name: workerData.name,
      email: workerData.email || `${workerData.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.com`,
      department: workerData.department,
      zoneId: ward.id,
      status: workerData.status || "Active"
    };

    this.workers.push(newWorker);
    this.saveWorkers();
    return newWorker;
  }

  async updateWorker(id, updatedFields) {
    const worker = this.workers.find(w => w.id === id);
    if (!worker) return null;

    if (updatedFields.name !== undefined) worker.name = updatedFields.name;
    if (updatedFields.email !== undefined) worker.email = updatedFields.email;
    if (updatedFields.department !== undefined) worker.department = updatedFields.department;
    if (updatedFields.zoneId !== undefined) {
      const ward = this.getWard(updatedFields.zoneId);
      worker.zoneId = ward.id;
    }
    if (updatedFields.status !== undefined) worker.status = updatedFields.status;

    this.saveWorkers();
    return worker;
  }

  async updateWorkerStatus(id, newStatus) {
    return this.updateWorker(id, { status: newStatus });
  }

  async deleteWorker(id) {
    const idx = this.workers.findIndex(w => w.id === id);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
      this.saveWorkers();
      return true;
    }
    return false;
  }

  // Rename a zone/ward
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
    if (updated) {
      const customZoneNames = this.getStorageItem('municipal_custom_zones', {});
      customZoneNames[zoneId] = newName;
      this.setStorageItem('municipal_custom_zones', customZoneNames);

      // Update all complaints in this zone to have the new name
      this.complaints.forEach(c => {
        if (c.zoneId === zoneId) c.zoneName = newName;
      });
      this.saveComplaints();
    }
    return updated;
  }

  // Reset dataset to default complaints and workers
  async resetToDefaultDataset() {
    const [complaintsRes, workersRes] = await Promise.all([
      fetch('data/complaints.json'),
      fetch('data/workers.json')
    ]);
    this.complaints = await complaintsRes.json();
    this.workers = await workersRes.json();
    this.saveComplaints();
    this.saveWorkers();
    this.recalculateDepartmentWorkerCounts();
  }

  // Clear all complaints (for demo reset)
  clearAllComplaints() {
    this.complaints = [];
    this.saveComplaints();
  }
}

window.dataService = new DataService();
