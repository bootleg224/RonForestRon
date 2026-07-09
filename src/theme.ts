// Central design tokens. "Editorial ink" — a light, high-contrast paper theme:
// warm off-white surfaces, near-black ink, one coral accent. Built to stay
// legible outdoors in direct sun.
export const colors = {
  bg: '#F2EFE7', // warm paper — the page canvas
  bgElev: '#F2EFE7', // sheets / segmented tracks (paper, so white cards read on top)
  surface: '#FFFFFF', // cards, stat tiles, wheel band — the only true white
  surfaceAlt: '#E2DCCE', // switch-off track, insets
  hairline: '#E4DED0', // warm hairline for card borders
  text: '#171410', // near-black warm ink
  textDim: '#6F675A', // muted warm grey
  textFaint: '#A49B89', // faint labels / far wheel rows
  accent: '#E5432A', // coral — the one brand accent (GO, links, active segments)
  accentDark: '#FBE3DC', // light coral tint
  // Pace-state colors — tuned to read on light hero tints. On pace is calm ink;
  // only speed-up (amber) and ease-up (blue) light up in color.
  onTrack: '#1A1712',
  onTrackDark: '#EAE5DA',
  tooSlow: '#B25A09',
  tooSlowDark: '#F7E7CE',
  tooFast: '#1C5EA6',
  tooFastDark: '#E0EAF6',
  danger: '#1A1712', // STOP + errors — heavy ink, distinct from the coral accent
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const MILE_IN_METERS = 1609.344;
