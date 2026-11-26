# Startup City

A browser open-world game set in **Startup City**, a fictional Indian island city: an old-city bazaar grid, a CBD,
IT Park, residential lanes, slums, an airport, port and docks, Bandra Bay beach, a fort, the Sea Link,
hills, a dam and a metro line. Built with [three.js](https://threejs.org/), no build step.

## Run it

It must be served over HTTP (opening `index.html` directly will not load the modules).

```
python -m http.server 8000
```

Then open http://localhost:8000. On Windows you can double-click `start-game.bat`.

Deploys as a static site (e.g. Vercel: `vercel.json` is included, no build command).

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Walk |
| Shift | Run (9 m/s) |
| Space | Jump |
| E | Get in / out of any vehicle (traffic too), use things, board the metro at Nagri Junction |
| X | Sit on a bench / stand up |
| P | Phone (jobs, map, UPI, shop, settings) |
| M | Full map (click to set GPS) |
| H | Horn · C photo mode |
| T / Enter | Chat (only players within 20 m see it) |
| V | Wave (also happens on its own when you meet another player) |
| Mouse drag / wheel | Camera / zoom |

## Accounts

Start screen: **Log in / Sign up** with email and password, **Continue with Google**, or play as a **Guest**.
Supabase sends a confirmation email after sign up (Authentication > Sign In / Providers > Email: "Confirm email").

## Multiplayer

Movement is peer-to-peer over WebRTC ([Trystero](https://github.com/dmotz/trystero)) in 50 m grid cells; Supabase is only used for login
(guest or Google), presence (online count, instances of 40 per area) and a 1 update/s fallback when WebRTC fails.
Settings are in `net-config.js` (project URL + **publishable** key; leave empty to play offline). Never put a `service_role` key there.
Details and test steps: `PHASE-1.md`, `PHASE-2.md`.

## Characters

VRoid / VRM characters are listed in `models/characters.json` (see `models/README.md` to add your own).
Mixamo animations in `models/anim/` (idle, walk, run, sit, phone, wave) are retargeted onto any VRM at runtime;
if a file is missing the built-in procedural animation is used.

## Files

| File | What it does |
|---|---|
| `game.js` | Core game: renderer, old city, people, traffic, jobs, phone, map, main loop |
| `navapur.js` | The island, coastline, curvy roads and all districts |
| `dressing.js` | Street dressing: Hindi signs, awnings, bollards, benches, murals, fort gate, station, clouds |
| `facades.js` | 20 facade textures (wall colours x window styles) |
| `trees.js` | Neem / gulmohar / jacaranda trees (branches + leaf cards) |
| `vehicles.js` | Sedan, Padmini taxi, auto rickshaw, BEST-style bus, scooter |
| `metro.js` | Metro coaches with interior and passengers |
| `vrm.js` | VRM loading, Mixamo retargeting, colour customiser, phone prop |
| `net.js`, `net-config.js` | Multiplayer |

## Credits and licences

- three.js and @pixiv/three-vrm (MIT), loaded from the jsDelivr CDN.
- Girl model: `VRM1_Constraint_Twist_Sample` by pixiv Inc., VRM Public License 1.0 (avatar use by everyone, redistribution allowed, credit not required).
- Kyle, Chad, David: Polygonal Mind 100Avatars, CC0.
- Animations: Adobe Mixamo, used inside this game under Mixamo's terms.

## Networking (Startup City)

- Players pick a **role** (Founder, Co-founder, Developer, Designer, Marketer, Product, Investor, Mentor, Student, Job seeker, Explorer) on the start screen or in the phone's **Profile** app. It shows on their name tag.
- Phone apps: **Profile** (role, startup, pitch, stage, skills, looking for, LinkedIn), **Nearby** (players around you: Connect, Chat, Meet, Wave), **Network** (requests and connections), **Chats** (private messages, live), **Café** (GPS to the Startup Café), **Billboard**.
- Data is in Supabase tables `sc_profiles`, `sc_connections`, `sc_messages` (row-level security: you only see your own connections and chats; guests can browse but need email/Google login to connect or chat).

### Putting a startup on the billboards

The billboards by the Startup Café and in the City Center show the active rows of the `sc_billboard` table, rotating every 9 seconds.
In the Supabase dashboard: **Table Editor → sc_billboard → Insert row**, fill `title` (max 40), `tagline` (max 90), optional `url`, optional `image_url` (a logo, must allow cross-origin loading), colours `bg` / `fg` (like `#141414`), `sort` (order) and `active`. Players cannot edit this table.
