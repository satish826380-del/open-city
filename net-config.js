// Multiplayer settings. Leave url/key empty to play offline (single player).
// url: your Supabase project URL (https://xxxx.supabase.co)
// key: the project's PUBLISHABLE / anon key (safe to ship in a web game; never put the service_role key here)
// Movement goes peer-to-peer over WebRTC (Trystero). Supabase is only used for login, presence
// (who is online, which cell) and a slow fallback for players whose WebRTC connection fails.
export const NET = {
  url: 'https://nhggmnuxnqqljmcwjfyz.supabase.co',
  key: 'sb_publishable_CvgJ74N038fUX2B0hmZt6w_65n4AXyH',
  appId: 'mumbai-nagri-navapur-v2', // Trystero namespace: change it to split test and live players
  cell: 80,          // grid cell size (m); you join your cell + the 8 around it (240 m square)
  zone: 240,         // presence area (3x3 cells); instances are counted per zone
  maxArea: 40,       // players per zone instance before newcomers go to instance #2, #3...
  showAt: 110,       // show a player within this distance (m)
  hideAt: 125,       // hide beyond this (hysteresis, no flicker)
  rate: 10,          // P2P movement updates per second (only when changed)
  nearCap: 12,       // full-rate updates go to the nearest N players; the rest get 1/s
  p2pTimeout: 2500,  // ms to wait for WebRTC before using the Supabase fallback for that player
  fallbackRate: 6,   // fallback updates per second while moving (1/s when standing still)
  chatRange: 20,     // chat messages only reach players within this distance (m)
};
