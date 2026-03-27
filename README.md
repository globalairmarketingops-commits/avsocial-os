# Av/SocialOS — GlobalAir.com Social Operations Hub

9-page SPA social operations dashboard for GlobalAir.com. Centralizes social command, content calendar, tasks & pipeline, Canva assets, performance analytics, competitor pulse, UTM tracking, channel strategy, and Ian Authority asset management into a single hub.

## Quick Start

```bash
npm start
# Open http://localhost:8093
```

## Architecture

- **Frontend:** Vanilla JavaScript SPA with hash-based routing
- **Server:** Node.js static file server + JSON data API
- **Data:** Pre-fetched via Windsor.ai MCP, stored as JSON in `data/`
- **Storage:** Browser localStorage for UI state (role, preferences)
- **Offline:** offline.js module for offline capability

## Pages

| Route | Page | Purpose |
|-------|------|---------|
| `#dashboard` | Social Operations Dashboard | Command center overview |
| `#calendar` | Content Calendar | Schedule and manage content |
| `#tasks` | Tasks & Pipeline | Social tasks and workflow |
| `#canva` | Canva & Assets | Asset library and production briefs |
| `#performance` | Performance Analytics | Social KPIs and reporting |
| `#competitor` | Competitor Pulse | Controller.com and competitor tracking |
| `#utm` | UTM Tracker | UTM builder and link management |
| `#channel` | Channel Strategy Playbook | Platform-level strategy docs |
| `#authority` | Ian Authority Asset Hub | Ian Lumpp content systematization |

## Data Refresh

Data is fetched via Windsor.ai MCP in Claude Code and written to `data/*.json`. To refresh:

1. Open Claude Code in the project directory
2. Use Windsor MCP tools to fetch updated data
3. Write results to `data/` directory
4. Commit and push

## Brand

- Navy: `#102297` | Green: `#97CB00` | Blue: `#4782D3`
- Fonts: Montserrat 700 (headings), DM Sans (body)

---

*GlobalAir.com — Aviation's Homepage Since 1995*
