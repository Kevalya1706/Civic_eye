---
name: Admin Command Center v7
description: Full admin dashboard with Leaflet map, heatmap, assign/resolve workflow, audit modal, cost tracker, MTTR
type: feature
---
- **Map**: Leaflet with ESRI satellite tiles + OSM overlay. Pins color-coded by S-Score (red≥80, yellow≥50, green<50). 10m accuracy circles. Heatmap toggle via leaflet.heat.
- **Assign/Resolve Workflow**: Open tickets get "Assign to Dept" dropdown. In Progress tickets get "Resolve" button, disabled until fix photo uploaded. Evidence-based closure.
- **Audit Modal**: Side-by-side Before (citizen) vs After (municipal) photo comparison for resolved tickets.
- **Verification Badge**: Green Shield (AI>98% + GPS≤5m), Red Flag (no photo or GPS>50m), Standard otherwise.
- **Cost Tracker**: Per-category estimated cost (Pothole=₹1500, Pole=₹5000, etc). Total repaired value in stat card.
- **MTTR**: Mean Time to Repair in hours, displayed in stat cards.
- **Nudge Alerts**: Dept with 5+ nudges shows OVERDUE badge. Tickets with 10+ nudges trigger SURGE ALERT banner.
- **Dept Filtering**: Stats cards update to show dept-specific data when filtered.
- **Footer**: "Government Systems Infrastructure | Data Integrity Validated | Team Minions"
- **Admin Key**: "MINIONS" via AdminGuard component.
