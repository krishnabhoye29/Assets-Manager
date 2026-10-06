# Municipal Asset & Complaint Management System

A professional frontend prototype for a Municipal Asset & Complaint Management System.

## Features
- **Role-based Dashboards:** Citizen, Worker, and Admin interfaces.
- **Interactive Zone Map:** Uses Leaflet and OpenStreetMap to display real municipal zones from GeoJSON.
- **Dynamic Zone Colouring:** Zones are coloured based on complaint density, which recalculates when filters are applied.
- **Automatic Zone Detection:** Uses Turf.js to automatically determine the zone when a user clicks on the map (Point-in-Polygon).
- **Mock Data Layer:** Uses a `data-service.js` to simulate a database (fetching from JSON files). This is designed to be easily swappable with a real backend like Supabase in the future.

## Prerequisites
Because this project fetches local JSON files using JavaScript `fetch()`, running it directly by double-clicking `index.html` (using the `file://` protocol) will result in **CORS (Cross-Origin Resource Sharing)** errors in modern browsers.

You **MUST** run this project through a local web server.

## How to Run

### Option 1: VS Code (Recommended)
1. Open this folder in Visual Studio Code.
2. Install the **"Live Server"** extension by Ritwick Dey.
3. Right-click on `index.html` and select **"Open with Live Server"**.

### Option 2: Python (If installed)
1. Open a terminal or command prompt in this folder.
2. Run: `python -m http.server 8000` (or `python3 -m http.server 8000`)
3. Open your browser and go to `http://localhost:8000`

### Option 3: Node.js (If installed)
1. Open a terminal in this folder.
2. Run: `npx serve`
3. Open the provided localhost link in your browser.

## Demo Accounts
When you open `index.html`, you will see three demo portals to choose from:
- **Citizen Portal**: Submit complaints, auto-detect zones via map click, view complaint history.
- **Worker Portal**: View assigned complaints and update their status.
- **Admin Portal**: View full dashboard, map filters, top zones, and asset management.

## Technologies Used
- HTML5, Vanilla CSS, Vanilla JavaScript
- **Leaflet.js**: Map rendering
- **Turf.js**: Geospatial analysis (Point in Polygon)
- **Chart.js**: Dashboard charts

## Future Database Integration
The `js/data-service.js` file handles all data operations. To connect to Supabase, you would simply replace the `fetch()` calls and array manipulations inside this class with Supabase API calls, leaving the UI code mostly untouched.
