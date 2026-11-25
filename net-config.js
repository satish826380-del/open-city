// Multiplayer settings. Leave url/key empty to play offline (single player).
// url: your Supabase project URL (https://xxxx.supabase.co)
// key: the project's PUBLISHABLE / anon key (safe to ship in a web game; never put the service_role key here)
export const NET = {
  url: 'https://nhggmnuxnqqljmcwjfyz.supabase.co',
  key: 'sb_publishable_CvgJ74N038fUX2B0hmZt6w_65n4AXyH',
  roomSize: 25,   // players per city room; extra players go to the next room
  maxRooms: 8,
  rate: 4,        // position updates per second while moving (lower = fewer realtime messages)
};
