# VRoid characters for Mumbai Nagri

The game uses your VRoid character for the player when it finds `models/characters.json`.
If that file is missing or a model fails to load, the game falls back to the built-in three.js character.

## 1. Make the character in VRoid Studio

1. Install **VRoid Studio** (free, from vroid.com or Steam).
2. New model, then copy the look from the sheet: spiky black hair, black hoodie with red hood lining,
   light grey tee, necklace, cargo pants, black/white high-tops.
3. For each outfit you want in the game, change only the clothes and export again.
   Same body + same face in every export, only the clothes change.

## 2. Export (keep it light for a laptop with Intel UHD graphics)

Use **Export → VRM** (VRM 1.0 or 0.x both work), with these settings:

- **Reduce polygons**: on (aim for about 20–30k triangles)
- **Texture atlas resolution**: 1024 (not 2048 or 4096)
- **Material reduction**: merge as much as possible (2–4 materials)
- **Bone reduction**: on (spring bones for hair and hood can stay)

Each file should be under about 15 MB.

## 3. Put the files here

Save the exports in this `models` folder, for example:

```
models/male_hoodie.vrm
models/male_tshirt.vrm
models/female_cap.vrm
```

## 4. List the outfits

Copy `characters.example.json` to `characters.json` and edit the names and files:

```json
{
  "male":   [{"name": "Hoodie", "file": "male_hoodie.vrm"},
             {"name": "T-shirt", "file": "male_tshirt.vrm"}],
  "female": [{"name": "Cap", "file": "female_cap.vrm"}]
}
```

- `name` is the button text on the character screen ("Kapde (outfit)").
- Ladka uses the `male` list and Ladki uses `female`. A gender with an empty list uses the built-in character.
- In the game, the phone shop's "Naye kapde" switches to the next outfit.

## Testing a model without editing the JSON

Run `start-game.bat`, then open:

```
http://localhost:8000/index.html?vrm=models/male_hoodie.vrm
```

Add `&closeup=body` or `&closeup=head` (and `&yaw=1.57` to turn it) to inspect it up close.
