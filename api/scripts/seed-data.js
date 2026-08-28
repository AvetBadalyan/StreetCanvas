/**
 * Demo content for `npm run seed`.
 *
 * Coordinates are hardcoded so seeding does not hammer the Nominatim endpoint
 * (it is rate limited to roughly one request per second).
 *
 * The image URLs are neutral placeholders. Swap them for real street-art photos
 * before taking portfolio screenshots: any publicly reachable URL works, so
 * uploading them to Cloudinary once and pasting the delivery URLs here is the
 * simplest route.
 *
 * Passwords are not listed per user - the seeder hashes one shared demo
 * password for all of them (see DEMO_PASSWORD in seed.js).
 */

const placeholder = (seed) =>
  `https://picsum.photos/seed/${seed}/1200/900`;

const avatar = (seed) => `https://picsum.photos/seed/${seed}/300/300`;

const users = [
  {
    key: "maya",
    name: "Maya Ortega",
    email: "maya@streetcanvas.demo",
    image: avatar("sc-maya"),
  },
  {
    key: "tomas",
    name: "Tomas Ricci",
    email: "tomas@streetcanvas.demo",
    image: avatar("sc-tomas"),
  },
  {
    key: "nina",
    name: "Nina Haddad",
    email: "nina@streetcanvas.demo",
    image: avatar("sc-nina"),
  },
];

const artworks = [
  {
    owner: "maya",
    title: "Cascade Steps Mural",
    artist: "Unknown",
    form: "mural",
    tags: ["colour", "portrait", "stairs"],
    description:
      "A five-storey portrait running up the side of the stairwell, best seen in the late afternoon when the light hits the eastern wall.",
    address: "Cascade Complex, Yerevan, Armenia",
    location: { lat: 40.1911, lng: 44.5152 },
    image: placeholder("sc-yerevan-cascade"),
  },
  {
    owner: "maya",
    title: "Kond District Stencils",
    artist: "Kond Collective",
    form: "stencil",
    tags: ["stencil", "monochrome", "political"],
    description:
      "A run of small stencils along the retaining wall of the old quarter. Several have been painted over twice; the layering is now part of the piece.",
    address: "Kond, Yerevan, Armenia",
    location: { lat: 40.1836, lng: 44.5013 },
    image: placeholder("sc-yerevan-kond"),
  },
  {
    owner: "tomas",
    title: "East Side Gallery Panel 47",
    artist: "Various",
    form: "mural",
    tags: ["wall", "history", "colour"],
    description:
      "One of the surviving original panels on the longest remaining stretch of the Berlin Wall. Restored in 2009 and again after weather damage.",
    address: "East Side Gallery, Berlin, Germany",
    location: { lat: 52.505, lng: 13.4394 },
    image: placeholder("sc-berlin-eastside"),
  },
  {
    owner: "tomas",
    title: "Kreuzberg Paste-up Wall",
    artist: "Anonymous",
    form: "paste-up",
    tags: ["paste-up", "layered", "typography"],
    description:
      "A doorway completely covered in overlapping paste-ups, refreshed almost weekly. Photograph it twice and you get two different pieces.",
    address: "Oranienstrasse, Kreuzberg, Berlin, Germany",
    location: { lat: 52.5024, lng: 13.4243 },
    image: placeholder("sc-berlin-kreuzberg"),
  },
  {
    owner: "nina",
    title: "Hosier Lane Full-wall",
    artist: "Rotating",
    form: "graffiti",
    tags: ["laneway", "colour", "lettering"],
    description:
      "The most photographed laneway in the city. Nothing here survives more than a few months, which is exactly the point.",
    address: "Hosier Lane, Melbourne, Australia",
    location: { lat: -37.8157, lng: 144.969 },
    image: placeholder("sc-melbourne-hosier"),
  },
  {
    owner: "nina",
    title: "Beco do Batman Corner",
    artist: "Various",
    form: "mural",
    tags: ["alley", "colour", "portrait"],
    description:
      "An entire alley of murals in Vila Madalena, repainted continuously since the 1980s.",
    address: "Beco do Batman, Sao Paulo, Brazil",
    location: { lat: -23.5558, lng: -46.6896 },
    image: placeholder("sc-saopaulo-batman"),
  },
  {
    owner: "maya",
    title: "Cerro Alegre Staircase",
    artist: "Unknown",
    form: "mosaic",
    tags: ["mosaic", "stairs", "colour"],
    description:
      "Tiled risers climbing the hill, each step a different pattern. Slippery after rain, and worth the climb anyway.",
    address: "Cerro Alegre, Valparaiso, Chile",
    location: { lat: -33.0409, lng: -71.6255 },
    image: placeholder("sc-valparaiso-stairs"),
  },
  {
    owner: "tomas",
    title: "Bushwick Collective Gate",
    artist: "Various",
    form: "mural",
    tags: ["shutter", "colour", "lettering"],
    description:
      "A roller shutter that only shows its artwork when the shop is closed - come on a Sunday.",
    address: "Troutman Street, Bushwick, Brooklyn, New York, USA",
    location: { lat: 40.7061, lng: -73.9236 },
    image: placeholder("sc-nyc-bushwick"),
  },
  {
    owner: "nina",
    title: "Armazens do Chiado Wheatpaste",
    artist: "Anonymous",
    form: "paste-up",
    tags: ["paste-up", "monochrome", "portrait"],
    description:
      "A large monochrome portrait pasted across two panels of scaffolding cladding. Temporary by construction.",
    address: "Chiado, Lisbon, Portugal",
    location: { lat: 38.7108, lng: -9.1414 },
    image: placeholder("sc-lisbon-chiado"),
  },
  {
    owner: "maya",
    title: "Stokes Croft Corner Piece",
    artist: "Unknown",
    form: "stencil",
    tags: ["stencil", "satire", "monochrome"],
    description:
      "Stencil work on the corner of a former squat, one of the pieces that gave the street its reputation.",
    address: "Stokes Croft, Bristol, United Kingdom",
    location: { lat: 51.4632, lng: -2.5892 },
    image: placeholder("sc-bristol-stokescroft"),
  },
  {
    owner: "tomas",
    title: "Armenian Street Iron Sculpture",
    artist: "Local commission",
    form: "installation",
    tags: ["installation", "metal", "heritage"],
    description:
      "Wrought-iron caricature mounted on a shophouse wall, part of a city-wide trail of similar pieces.",
    address: "Armenian Street, George Town, Penang, Malaysia",
    location: { lat: 5.4165, lng: 100.3376 },
    image: placeholder("sc-penang-armenian"),
  },
  {
    owner: "nina",
    title: "La Candelaria Wall",
    artist: "Colectivo local",
    form: "mural",
    tags: ["colour", "indigenous", "wall"],
    description:
      "A wide mural on the side of a colonial building, mixing pre-Columbian motifs with contemporary lettering.",
    address: "La Candelaria, Bogota, Colombia",
    location: { lat: 4.5964, lng: -74.0731 },
    image: placeholder("sc-bogota-candelaria"),
  },
];

module.exports = { users, artworks };
