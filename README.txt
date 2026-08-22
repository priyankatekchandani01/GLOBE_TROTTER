GLOBETROTTER — RESPONSIVE PHP + SQLITE TRAVEL PLANNER
=====================================================

Folder structure is intentionally simple:
GlobeTrotter/
  frontend/   -> index.html, styles.css, script.js
  backend/    -> api.php
  database/   -> globetrotter.sqlite, schema.sql, seed.sql

FEATURES
--------
• Responsive light-blue modern UI
• Login / signup / logout / session authentication
• Dashboard with trip stats and inspiration
• Create, edit, delete and search trips
• Day-by-day itinerary builder
• Add cities/stops and activities
• Discover cities with search and filters
• Budget overview and category breakdown
• Calendar/timeline view
• Shared/public trip section
• Profile/settings
• SQLite relational database
• PHP backend API

RUN WITH XAMPP
--------------
1. Install XAMPP with Apache + PHP + SQLite support.
2. Put the GlobeTrotter folder inside C:\xampp\htdocs\
3. Start Apache.
4. Open: http://localhost/GlobeTrotter/frontend/

DEMO LOGIN
----------
Email: demo@globetrotter.com
Password: demo123

NOTES
-----
The frontend uses only HTML/CSS/vanilla JavaScript. The backend is one PHP file and the data layer is one SQLite database, so there are no unnecessary framework folders or complicated dependencies.

The screens and interactions are based on the supplied GlobeTrotter specification: authentication, dashboard, create trip, My Trips, itinerary builder/view, city/activity discovery, budget, calendar/timeline, public sharing and profile/settings.
