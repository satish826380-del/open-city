# Open City · Mumbai Nagri

A browser open-world game set in **Navapur**, a fictional Indian island city: an old-city bazaar grid, a CBD,
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
| Shift | Run |
| Space | Jump |
| E | Get in / out of any vehicle (traffic too), use things, board the metro at Nagri Junction |
| X | Sit on a bench / stand up |
| P | Phone (jobs, map, UPI, shop, settings) |
| M | Full map (click to set GPS) |
| H | Horn · C photo mode |
| T / Enter | Chat (multiplayer) · G wave |
| Mouse drag / wheel | Camera / zoom |

## Multiplayer

Players join city rooms of up to 25 over **Supabase Realtime** (presence + broadcast: positions, chat, emotes).
Settings are in `net-config.js`: the project URL and its **publishable** key. Leave them empty to play offline.
Never put a `service_role` key in this file.

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
