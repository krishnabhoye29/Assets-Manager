import json
import random
from datetime import datetime, timedelta

def random_date(start, end):
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())),
    )

categories = [
    "Streetlight", "Road", "Footpath", "Sewage", "Drainage",
    "Garbage", "Public Toilet", "Bus Stop", "Water Supply", "Garden", "Safety Issue", "Other"
]
priorities = ["Low", "Medium", "High", "Critical"]
statuses = ["Pending", "Under Process", "Resolved"]
departments = {
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
}

zones = [
    {"id": "Z01", "name": "Zone 1 (Downtown)", "lon_range": (72.871, 72.879), "lat_range": (19.072, 19.078), "count": 60},
    {"id": "Z02", "name": "Zone 2 (North)", "lon_range": (72.868, 72.876), "lat_range": (19.082, 19.088), "count": 120},
    {"id": "Z03", "name": "Zone 3 (East)", "lon_range": (72.883, 72.891), "lat_range": (19.074, 19.079), "count": 30},
    {"id": "Z04", "name": "Zone 4 (Northeast)", "lon_range": (72.883, 72.889), "lat_range": (19.082, 19.089), "count": 160}
]

complaints = []
cmp_id = 1

start_date = datetime.now() - timedelta(days=60)
end_date = datetime.now()

for z in zones:
    for _ in range(z["count"]):
        cat = random.choice(categories)
        complaints.append({
            "id": f"CMP-2026-{cmp_id:04d}",
            "citizenId": f"CIT{random.randint(1, 100):03d}",
            "zoneId": z["id"],
            "zoneName": z["name"],
            "category": cat,
            "department": departments[cat],
            "priority": random.choice(priorities),
            "status": random.choices(statuses, weights=[30, 40, 30])[0],
            "latitude": round(random.uniform(z["lat_range"][0], z["lat_range"][1]), 6),
            "longitude": round(random.uniform(z["lon_range"][0], z["lon_range"][1]), 6),
            "description": f"Issue regarding {cat.lower()}",
            "createdAt": random_date(start_date, end_date).strftime("%Y-%m-%d"),
            "assignedWorker": f"WRK{random.randint(1, 20):03d}" if random.random() > 0.3 else None
        })
        cmp_id += 1

with open("data/complaints.json", "w") as f:
    json.dump(complaints, f, indent=2)

workers = []
for i in range(1, 21):
    workers.append({
        "id": f"WRK{i:03d}",
        "name": f"Worker {i}",
        "email": f"worker{i}@demo.com",
        "department": random.choice(list(set(departments.values()))),
        "zoneId": random.choice([z["id"] for z in zones]),
        "status": random.choice(["Active", "Inactive"])
    })

with open("data/workers.json", "w") as f:
    json.dump(workers, f, indent=2)

print("Data generated.")
