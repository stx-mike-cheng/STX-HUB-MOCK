# STX-HUB Mock (COA Search)

**Prepared by:** Mike Cheng  
**Purpose:** Internal testing **only** to help EMS validate flows while HUB APIs are not yet ready.  
**⚠️ IMPORTANT:** **Not** for real UAT or production use. No authentication, no database, and only basic hardening/logging.

---

## What this provides

- `GET /api/v1/coas/search` – returns a static/dummy COA search response.
- Optional scenarios via query:
  - `?mode=empty` → Success with `recordCount: 0`
  - `?mode=error` → Simulated failure payload
- `GET /healthz` – simple health check.

Default port: **3000**  
Default host bind: **0.0.0.0** (LAN‑reachable)

---

## Prerequisites

- **Node.js LTS 18+** (recommend latest LTS)
- Network access to/from the test client (EMS) and this server on TCP **3000**

---

## Installation

1. Create a folder, e.g.:
   - Windows: `C:\apps\stx-hub-mock`
   - Linux: `/opt/stx-hub-mock`

2. Copy in these files:
   - `package.json`
   - `server.js`
   - `README.md`

3. Install dependencies:
   ```bash
   npm install