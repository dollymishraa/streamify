// Demo catalogue. Audio: royalty-free SoundHelix samples. Replace with your own tracks / API.
const SRC = n => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

const TRACKS = [
  { id: 1, title: "Neon Drive",     artist: "Vela Sound",  album: "Midnight Grid", hue: 280, cover: "assets/covers/neon.jpg",    src: SRC(1) },
  { id: 2, title: "Paper Planes",   artist: "Kite & Co",   album: "Low Altitude",  hue: 200, cover: "assets/covers/planes.jpg",  src: SRC(2) },
  { id: 3, title: "Slow Bloom",     artist: "Marigold",    album: "Petals",        hue: 330, cover: "assets/covers/slow-bloom.jpg",    src: SRC(3) },
  { id: 4, title: "Static Hearts",  artist: "Vela Sound",  album: "Midnight Grid", hue: 260, cover: "assets/covers/static-heart.jpg", src: SRC(4) },
  { id: 5, title: "Harbor Lights",  artist: "The Tides",   album: "Salt",          hue: 180, cover: "assets/covers/harbor-lights.jpg", src: SRC(5) },
  { id: 6, title: "Golden Hour",    artist: "Marigold",    album: "Petals",        hue: 40,  cover: "assets/covers/golden-hour.jpg",   src: SRC(6) },
  { id: 7, title: "Run It Back",    artist: "Kite & Co",   album: "Low Altitude",  hue: 10,  cover: "assets/covers/run-it-back.jpg",   src: SRC(7) },
  { id: 8, title: "Undertow",       artist: "The Tides",   album: "Salt",          hue: 220, cover: "assets/covers/undertow.jpg",    src: SRC(8) },
];

const PLAYLISTS = [
  { id: "all",   name: "Liked Songs", desc: "All tracks", hue: 265, cover: "assets/covers/liked-songs.jpg", ids: [1,2,3,4,5,6,7,8] },
  { id: "chill", name: "Chill Vibes", desc: "Playlist",   hue: 180, cover: "assets/covers/chill-vibes.jpg", ids: [3,5,6,8] },
  { id: "drive", name: "Night Drive", desc: "Playlist",   hue: 280, cover: "assets/covers/night-drive.jpg", ids: [1,4,7] },
  { id: "focus", name: "Deep Focus",  desc: "Playlist",   hue: 210, cover: "assets/covers/deep-focus.jpg", ids: [2,5,8] },
];