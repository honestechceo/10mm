// Where's My 10MM?! — main game code
"use strict";
const canvas = document.getElementById("scene"),
  ctx = canvas.getContext("2d"),
  W = 600,
  H = 460,
  ground = 373,
  $ = (id) => document.getElementById(id);
const garageScenes = [
  "garage-art-1.jpg",
  "garage-art-2.jpg",
  "garage-art-3.jpg",
].map((src) => {
  const im = new Image();
  im.onload = () => {
    if (state !== "running") render();
  };
  im.src = src;
  return im;
});
// Locations: every 25 levels the socket escapes somewhere new. Drop bg-<key>.jpg next to index.html to use real art;
// until then the garage art is color-graded as a stand-in.
const THEMES = [
  { key: "garage", name: "THE GARAGE" },
  { key: "driveway", name: "THE DRIVEWAY", tint: "#ffb47e", fx: "dusk" },
  { key: "parking", name: "PARKING GARAGE", tint: "#5d74b0", fx: "night" },
  { key: "junkyard", name: "THE JUNKYARD", tint: "#d2ad73", fx: "dust" },
  { key: "partsstore", name: "PARTS STORE", tint: "#eef4ff" },
  { key: "dealership", name: "DEALER SERVICE", tint: "#dbe6ff" },
  { key: "pitlane", name: "PIT LANE", tint: "#ffd8a3", fx: "dusk" },
  { key: "snow", name: "SNOWY ROADSIDE", tint: "#c8dcff", fx: "snow" },
  // levels 201-400
  { key: "engineshop", name: "ENGINE SHOP" },
  { key: "repairshop", name: "MAIN STREET REPAIR", fx: "dusk" },
  { key: "autoparts", name: "AUTO PARTS PLAZA" },
  { key: "usedcars", name: "USED CAR LOT", fx: "dusk" },
  { key: "carwash", name: "NEON CAR WASH", fx: "night" },
  { key: "salvage", name: "SALVAGE YARD", fx: "dust" },
  { key: "servicecenter", name: "SERVICE CENTER", fx: "dusk" },
  { key: "evtech", name: "EV TECH CENTER", fx: "night" },
];
const MAX_LEVEL = THEMES.length * 25;
const themeArt = {};
function themeOf(l) {
  return THEMES[Math.min(THEMES.length - 1, Math.floor((l - 1) / 25))];
}
function loadTheme(t) {
  if (themeArt[t.key]) return;
  const im = new Image();
  themeArt[t.key] = im;
  im.onload = () => {
    if (state !== "running") render();
  };
  im.src = "bg-" + t.key + ".jpg";
}
function sceneList() {
  const t = themeOf(level),
    im = themeArt[t.key];
  if (im && im.complete && im.naturalWidth)
    return { imgs: [im], real: true, t };
  return { imgs: garageScenes, real: t.key === "garage", t };
}
let flakes = [];
function weather(t) {
  if (t.fx === "snow") {
    if (flakes.length < 70)
      for (let i = 0; i < 70; i++)
        flakes.push({
          x: Math.random() * W,
          y: Math.random() * (H + OFF) - OFF,
          r: 1 + Math.random() * 2.6,
          v: 0.5 + Math.random() * 1.2,
          d: Math.random() * 6,
        });
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of flakes) {
      f.y += f.v;
      f.x += Math.sin((frames + f.d * 40) * 0.02) * 0.4 - 0.6;
      if (f.y > H) {
        f.y = -OFF;
        f.x = Math.random() * W;
      }
      if (f.x < 0) f.x += W;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 7);
      ctx.fill();
    }
  } else if (t.fx === "dust") {
    ctx.fillStyle = "rgba(255,230,180,.35)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 97 + frames * (0.6 + (i % 3) * 0.3)) % W,
        y = ground - 40 - ((i * 53) % 220) + Math.sin(frames * 0.03 + i) * 6;
      ctx.beginPath();
      ctx.arc(x, y, 1.5 + (i % 3), 0, 7);
      ctx.fill();
    }
  } else if (t.fx === "night") {
    const g = ctx.createRadialGradient(
      W * 0.5,
      -OFF,
      20,
      W * 0.5,
      -OFF,
      H + OFF,
    );
    g.addColorStop(0, "rgba(255,240,190,.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, -OFF, W, H + OFF);
  }
}
const premiumGarage = new Image();
let premiumReady = false;
premiumGarage.onload = () => {
  premiumReady = true;
  if (state !== "running") render();
};
premiumGarage.onerror = () => {
  premiumReady = false;
};
const chaserSprites = {};
for (const [key, src] of Object.entries({
  hand: "chaser-hand.svg",
  magnet: "chaser-magnet.webp",
})) {
  const im = new Image();
  im.src = src;
  chaserSprites[key] = im;
}
const finishSprites = {};
for (const [key, src] of Object.entries({
  car: "finish-car.svg",
  car1: "car-1.webp",
  car2: "car-2.webp",
  car3: "car-3.webp",
  car4: "car-4.webp",
  car5: "car-5.webp",
  car6: "car-6.webp",
  car7: "car-7.webp",
  bench: "finish-workbench.webp",
  cart: "finish-toolcart.webp",
})) {
  const im = new Image();
  im.onload = () => {
    if (state !== "running") render();
  };
  im.src = src;
  im.onerror = () => {
    if (src.endsWith(".webp") && !im.datasetFallback) {
      im.datasetFallback = "1";
      im.src = "finish-car-detail-" + key.slice(3).toLowerCase() + ".svg";
    }
  };
  finishSprites[key] = im;
}
{
  const im = new Image();
  im.onload = () => {
    if (state !== "running") render();
  };
  im.src = "finish-engine.webp";
  finishSprites.engine = im;
}
const powerSprites = {};
for (const k of ["shield", "slow", "spring", "boost", "magnet"]) {
  const im = new Image();
  im.src = "power-" + k + ".webp";
  powerSprites[k] = im;
}
const coinSprite = new Image();
coinSprite.src = "coin.webp";
const gloveSprite = new Image();
gloveSprite.src = "chaser-glove.webp";
chaserSprites.glove = gloveSprite;
const magnetArt = new Image();
magnetArt.src = "chaser-magnet.webp";
chaserSprites.magnetArt = magnetArt;
const heroSprites = {};
// Optional 12-frame 3D skin atlas; existing WebP sprites remain the fallback.
const ROLLING_SKIN_FOLDERS = {
  chrome:"shop_chrome", rusty:"junkyard_rust", black:"black_impact",
  candy:"candy_red", gold:"24k_gold", neon:"neon_blue",
  /* Finder’s Purple: use original sprite until its 3D frames are corrected */ champ:"daily_champ", afterburner:"afterburner",
  diamond:"diamond_chrome", santa:"christmas_lights",
  candycane:"candy_cane_santa", valentine:"sweetheart",
  shamrock:"lucky_shamrock", easter:"easter_egg",
  usa:"stars_stripes", pumpkin:"jack_o_lantern", turkey:"turkey_day"
};
const rollingSkinCache = new Map();
let activeRollingSkin = null;
function loadRollingSkin(id) {
  const folder = ROLLING_SKIN_FOLDERS[id];
  if (!folder) { activeRollingSkin = null; return; }
  if (rollingSkinCache.has(id)) { activeRollingSkin = rollingSkinCache.get(id); return; }
  const record = { frames: Array(12).fill(null), ready: 0, missing: false };
  rollingSkinCache.set(id, record);
  activeRollingSkin = record;
  for (let i=0; i<12; i++) {
    const img = new Image();
    img.onload = () => { record.frames[i] = img; record.ready++; if(state !== "running") render(); };
    img.onerror = () => { record.missing = true; record.frames.fill(null); };
    img.src = "skins3d/" + folder + "/frame_" + String(i).padStart(2,"0") + ".png";
  }
}

for (const [key, src] of Object.entries({
  socket: skinSrc(),
  toolboxOpen: "toolbox-open.webp",
  toolboxClosed: "toolbox-closed.webp",
})) {
  const im = new Image();
  im.onload = () => {
    if (state !== "running") render();
  };
  im.src = src;
  heroSprites[key] = im;
}
const toolSprites = {};
for (const kind of [
  "prybar",
  "phillips",
  "flathead",
  "wrench",
  "ratchet",
  "bolt",
  "nut",
  "meter",
  "jack",
  "floorjack",
  "flashlight",
  "tire",
  "drainpan",
  "evilsocket",
  "screw",
  "cone",
  "ball",
  "snowball",
  "wetsign",
  "dolly",
]) {
  const im = new Image();
  im.src = "tool-" + kind + ".webp";
  im.onerror = () => {
    if (!im.datasetFallback) {
      im.datasetFallback = "1";
      im.src = "obstacle-" + kind + ".svg";
    }
  };
  toolSprites[kind] = im;
}
const art = {};
["socket10"].forEach((n) => {
  let im = new Image();
  art[n] = im;
  im.src = n + ".png";
});
let OFF = 150,
  CH = 610;
const settings = loadSettings();
applyLayout();
let level = Math.max(
    1,
    Math.min(MAX_LEVEL, +(localStorage.getItem("tenmm-escape-current") || 1)),
  ),
  best = Math.max(
    1,
    Math.min(MAX_LEVEL, +(localStorage.getItem("tenmm-escape-best") || 1)),
  ),
  state = "menu",
  player = {
    x: 118,
    y: ground - 22,
    vy: 0,
    r: 22,
    angle: 0,
    jumps: 0,
    flightMode: false,
  },
  scroll = 0,
  world = 2300,
  obstacles = [],
  powerups = [],
  last = 0,
  frames = 0,
  shield = 0,
  slow = 0,
  boost = 0,
  goalMode = "under",
  chase = "none",
  soundOn = settings.sfx,
  tutorialSeen = localStorage.getItem("tenmm-tutorial") === "yes",
  storySeen = localStorage.getItem("tenmm-story") === "yes",
  tutorialStep = 0,
  mode = "adventure",
  rafId = 0,
  jumpBuffer = 0,
  lastJumpInput = 0;
const TOOL_SIZE = {
  prybar: [116, 50],
  phillips: [56, 73],
  flathead: [51, 73],
  wrench: [118, 50],
  ratchet: [116, 51],
  bolt: [58, 54],
  screw: [46, 62],
  nut: [54, 46],
  meter: [78, 70],
  jack: [74, 72],
  floorjack: [118, 59],
  flashlight: [114, 48],
  drainpan: [92, 59],
  evilsocket: [64, 57],
};
const TOOL_NAME = {
  wrench: "a wrench",
  prybar: "a pry bar",
  jack: "a jack stand",
  floorjack: "a floor jack",
  flashlight: "a flashlight",
  drainpan: "an oil drain pan",
  evilsocket: "an evil 12-point socket",
  screw: "a sharp screw",
  ratchet: "a ratchet",
  phillips: "a screwdriver",
  flathead: "a screwdriver",
  bolt: "a bolt",
  nut: "a nut",
  meter: "a multimeter",
};
const kinds = [
    "wrench",
    "prybar",
    "ratchet",
    "phillips",
    "flathead",
    "bolt",
    "nut",
    "meter",
    "jack",
    "floorjack",
    "flashlight",
    "drainpan",
    "evilsocket",
    "screw",
  ],
  destinations = ["TOOLBOX", "TOOL CART", "CAR", "WORKBENCH"];
function rnd(seed) {
  let x = Math.sin(seed * 127.1 + level * 83.7 + (window.runSeed || 0)) * 43758.5453;
  return x - Math.floor(x);
}
function createLevel() {
  loadTheme(themeOf(level));
  if (level > 1) loadTheme(themeOf(Math.min(MAX_LEVEL, level + 1)));
  flakes = [];
  scroll = 0;
  frames = 0;
  shield = 0;
  slow = 0;
  boost = 0;
  player = {
    x: 118,
    y: ground - 22,
    vy: 0,
    r: 22,
    angle: 0,
    jumps: 0,
    flightMode: false,
  };
  world =
    level <= 3
      ? 1750 + level * 310
      : 4800 + Math.min(7200, (level - 1) * 38) + Math.min(2400, Math.max(0, level - 200) * 12);
  obstacles = [];
  powerups = [];
  coins = [];
  runCoins = 0;
  runScore = 0;
  coinMagnet = 0;
  goalMode =
    level > 3 && level % 5 === 0
      ? "engine"
      : (level - 1) % 4 === 2
        ? "under"
        : (level - 1) % 4 === 3
          ? "bench"
          : (level - 1) % 4 === 1
            ? level % 2 === 0
              ? "shelf"
              : "drawer"
            : level % 3 === 0
              ? "drawer"
              : "under";
  chase = level >= 2 ? "hand" : "none";
  let spacing = level <= 3 ? 430 : Math.max(level > 200 ? 172 : 185, 300 - level * 0.48);
  for (
    let x = level <= 3 ? 680 : 640, i = 0;
    x < world - 450;
    x += spacing, i++
  ) {
    let kind = kinds[Math.floor(rnd(i + 2) * kinds.length)];
    const hz = THEME_HAZ[themeIndex(level)];
    if (hz && rnd(i + 91) < 0.38) kind = hz;
    const [w, h] = HAZ[kind] ? [HAZ[kind].w, HAZ[kind].h] : TOOL_SIZE[kind];
    obstacles.push({
      x: x + (rnd(i + 19) - 0.5) * 36,
      w,
      h,
      kind,
      angle: HAZ[kind] ? 0 : (rnd(i + 44) - 0.5) * 0.12,
      ph: rnd(i + 7) * 6,
    });
  }
  for (let x = level <= 3 ? 720 : 800, i = 0; x < world - 480; x += 950, i++) {
    powerups.push({
      x,
      y: ground - 108,
      type: ["shield", "slow", "spring", "boost"][i % 4],
      taken: false,
    });
  }
  for (let x = 420, i = 0; x < world - 360; x += 155, i++) {
    const nearObstacle = obstacles.some(
      (o) => Math.abs(o.x - x) < o.w * 0.55 + 58,
    );
    if (!nearObstacle)
      coins.push({
        x: x + (rnd(i + 71) - 0.5) * 24,
        y: ground - 35 - (i % 7 === 0 ? 25 : 0),
        taken: false,
      });
    if (i % 8 === 4 && !nearObstacle)
      powerups.push({
        x: x + 25,
        y: ground - 38,
        type: "magnet",
        taken: false,
      });
  }
  $("level").textContent = level + " / " + MAX_LEVEL;
  $("best").textContent = best;
  $("distance").textContent = "0%";
  $("coinsCount").textContent = totalCoins;
  $("scoreCount").textContent = totalScore;
  $("tip").textContent =
    "GOAL: " +
    (goalMode === "drawer"
      ? "jump into the open drawer"
      : goalMode === "engine"
        ? "land in the engine bay"
        : goalMode === "bench"
          ? "land on the workbench"
          : goalMode === "shelf"
            ? "land on the tool cart"
            : "roll under the " + destinations[(level - 1) % 4].toLowerCase());
  if (window.FX) FX.levelBuilt();
}
function start() {
  continued = false;
  fitCanvas();
  audioReady();
  lastGrabSoundCycle = -1;
  runSpeedBonus = 0;
  cancelAnimationFrame(rafId);
  jumpBuffer = 0;
  lastJumpInput = 0;
  createLevel();
  state = "running";
  hidePanels();
  $("overlay").classList.add("hidden");
  last = 0;
  startMusic();
  if ((level - 1) % 25 === 0 && level > 1) {
    $("tip").textContent =
      "NEW LOCATION: " +
      themeOf(level).name +
      "! Watch out for " +
      HAZ[THEME_HAZ[themeIndex(level)]].name.replace(/^an? /, "") +
      "s!";
  }
  if (level <= 3) {
    $("tip").textContent =
      level === 1
        ? "TUTORIAL 1: Tap to jump; tap again for a double jump!"
        : level === 2
          ? "TUTORIAL 2: Triple tap quickly to fly; stay below the magnet!"
          : "TUTORIAL 3: Grab a glowing power-up!";
  }
  if (settings.startMode !== "auto" && !start.retry) {
    state = "ready";
    stopMusic();
    render();
    showReady();
  } else rafId = requestAnimationFrame(tick);
  start.retry = false;
}
let continued = false;
function crash(title, desc, _, __, art) {
  popup(
    title,
    desc,
    "TRY AGAIN",
    async () => {
      if (window.Monetize) {
        await Monetize.beforeRetry(level);
      }
      start.retry = true;
      start();
    },
    art,
  );
  if (window.Monetize && Monetize.canContinue && !continued) {
    $("menuExtra").style.display = "";
    $("menuExtra").textContent = "WATCH AD: KEEP GOING";
    $("menuExtra").onclick = async () => {
      const ok = await Monetize.watchToContinue();
      if (!ok) {
        $("details").textContent = window.rewardMsg ? rewardMsg() : "Ad not available right now. Tap TRY AGAIN.";
        if (!(window.Monetize && ["closed", "loading"].includes(Monetize.lastRewardResult))) $("menuExtra").style.display = "none";
        return;
      }
      continued = true;
      shield = 170;
      player.vy = Math.min(player.vy, 0);
      state = "running";
      $("overlay").classList.add("hidden");
      $("tip").textContent = "BACK IN THE GAME! Shield on for 3 seconds.";
      last = 0;
      startMusic();
      rafId = requestAnimationFrame(tick);
    };
  }
}
function popup(title, desc, button, callback, art) {
  state = "stopped";
  hidePanels();
  setArt(art || "hero");
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("eyebrow").textContent = "LEVEL " + level + " • " + themeOf(level).name;
  $("menuExtra").style.display = "none";
  $("menuSettings").style.display = "none";
  $("message").textContent = title;
  $("details").textContent = desc;
  $("go").textContent = button;
  $("overlay").classList.remove("hidden");
  $("go").onclick = callback;
}
let audioCtx = null,
  lastGrabSoundCycle = -1,
  runSpeedBonus = 0,
  coins = [],
  runCoins = 0,
  runScore = 0,
  totalCoins = Math.max(0, +(localStorage.getItem("tenmm-coins") || 0)),
  totalScore = Math.max(0, +(localStorage.getItem("tenmm-score") || 0)),
  coinMagnet = 0;
function audioReady() {
  if (!soundOn && !settings.music) return;
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    if (audioCtx.state !== "running")
      audioCtx
        .resume()
        .then(() => {
          if (state === "running") sfx("power");
        })
        .catch(() => {});
  } catch (e) {}
}
function sfx(type) {
  if (!soundOn) return;
  audioReady();
  // a paused audio engine would play this late (after it wakes up), so skip it instead
  if (!audioCtx || audioCtx.state !== "running") return;
  const now = audioCtx.currentTime;
  const sounds = {
    jump: [[430, 660, 0.12, "sine"]],
    flap: [[520, 790, 0.09, "triangle"]],
    land: [[155, 85, 0.12, "triangle"]],
    grab: [[270, 115, 0.26, "sawtooth"]],
    miss: [[310, 210, 0.17, "triangle"]],
    hit: [[210, 65, 0.38, "sawtooth"]],
    win: [
      [520, 660, 0.12, "sine"],
      [660, 880, 0.22, "sine"],
    ],
    power: [[690, 980, 0.2, "sine"]],
  };
  for (const [i, [start, end, dur, wave]] of (sounds[type] || []).entries()) {
    const t = now + i * 0.13,
      osc = audioCtx.createOscillator(),
      gain = audioCtx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(start, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
}
function handReach() {
  const phase = ((((frames - 105) / 145) % 1) + 1) % 1;
  const p =
    phase < 0.34
      ? phase / 0.34
      : phase < 0.56
        ? 1
        : phase < 0.84
          ? 1 - (phase - 0.56) / 0.28
          : 0;
  return {
    p: Math.max(0, Math.min(1, p)),
    cycle: Math.floor((frames - 105) / 145),
  };
}
function performJump(force) {
  buzz("light");
  player.vy = force;
  player.y -= 1;
  player.jumps++;
  jumpBuffer = 0;
}
function jump() {
  if (state !== "running") return;
  audioReady();
  sfx(player.y >= ground - player.r - 3 ? "jump" : "flap");
  const now = performance.now();
  if (now - lastJumpInput < 105) return;
  const delay = now - lastJumpInput;
  lastJumpInput = now;
  const grounded = player.y >= ground - player.r - 3;
  if (grounded) {
    player.jumps = 0;
    player.flightMode = false;
    performJump(-10.7);
    return;
  }
  if (player.jumps === 1) {
    performJump(-9.7);
    return;
  }
  if (player.jumps === 2) {
    performJump(-8.8);
    if (delay < 480) {
      player.flightMode = true;
    }
    return;
  }
  if (player.flightMode) {
    performJump(-8.4);
    return;
  }
  if (delay < 480) {
    player.flightMode = true;
    performJump(-8.4);
  }
}
for (const jumpButton of [$("jumpLeft"), $("jump")]) {
  jumpButton.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      jump();
    },
    { passive: false },
  );
  jumpButton.addEventListener("contextmenu", (e) => e.preventDefault());
  jumpButton.addEventListener("selectstart", (e) => e.preventDefault());
  jumpButton.addEventListener("dragstart", (e) => e.preventDefault());
  jumpButton.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );
}
canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  jump();
});
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    jump();
  }
});
$("restart").onclick = () => {
  start();
};
$("pause").onclick = () => {
  if (state === "running") {
    state = "paused";
    stopMusic();
    hidePanels();
    $("menuLevels").style.display = "none";
    $("menuShop").style.display = "none";
    setArt("pause");
    $("eyebrow").textContent = "TAKE A BREAK";
    $("menuExtra").style.display = "";
    $("menuExtra").textContent = "MAIN MENU";
    $("menuSettings").style.display = "";
    $("message").textContent = "PAUSED";
    $("details").textContent = "Your socket is safe until you resume.";
    $("go").textContent = "RESUME";
    $("go").onclick = () => {
      state = "running";
      $("overlay").classList.add("hidden");
      last = 0;
      startMusic();
      rafId = requestAnimationFrame(tick);
    };
    $("menuExtra").onclick = showMenu;
    $("overlay").classList.remove("hidden");
  }
};
$("go").onclick = () => showStory();
function image(n, x, y, w, h, rotation = 0) {
  let im = art[n];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  if (im && im.complete && im.naturalWidth) {
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
  } else {
    ctx.fillStyle = "#cbd4db";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "#64727d";
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }
  ctx.restore();
}
function toolIllustration(kind, x, y, w, h, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(w / 100, h / 100);
  let metal = ctx.createLinearGradient(0, -24, 0, 24);
  metal.addColorStop(0, "#f8fcff");
  metal.addColorStop(0.23, "#9daeb9");
  metal.addColorStop(0.5, "#eef4f7");
  metal.addColorStop(0.75, "#6f8493");
  metal.addColorStop(1, "#d9e3ea");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#273c49";
  ctx.lineWidth = 3;
  function shape(path, fill = metal) {
    ctx.beginPath();
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  function circle(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  if (kind === "wrench") {
    shape(() => {
      ctx.moveTo(-47, -13);
      ctx.lineTo(-37, -5);
      ctx.lineTo(-24, -14);
      ctx.lineTo(-21, -27);
      ctx.lineTo(-36, -35);
      ctx.lineTo(-46, -29);
      ctx.lineTo(-49, -16);
      ctx.lineTo(-44, -5);
      ctx.lineTo(26, 5);
      ctx.arc(37, 9, 13, Math.PI, Math.PI * 3);
      ctx.lineTo(-35, 8);
      ctx.closePath();
    });
    circle(36, 9, 8, "#23333e");
    ctx.strokeStyle = "#ffffffaa";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-26, -2);
    ctx.lineTo(21, 6);
    ctx.stroke();
  } else if (kind === "ratchet") {
    shape(() => {
      ctx.roundRect(-42, -7, 73, 14, 6);
    });
    shape(() => {
      ctx.roundRect(22, -16, 27, 32, 7);
    });
    circle(35, 0, 10, "#465e70");
    circle(35, 0, 5, "#d8e3e9");
    ctx.fillStyle = "#536a7b";
    ctx.fillRect(-35, -4, 30, 8);
  } else if (kind === "pliers") {
    shape(() => {
      ctx.moveTo(-7, 0);
      ctx.lineTo(-49, -31);
      ctx.lineTo(-42, -39);
      ctx.lineTo(3, -9);
      ctx.lineTo(28, -32);
      ctx.lineTo(37, -27);
      ctx.lineTo(14, 0);
      ctx.lineTo(37, 30);
      ctx.lineTo(28, 36);
      ctx.lineTo(1, 9);
      ctx.lineTo(-42, 36);
      ctx.lineTo(-49, 29);
      ctx.closePath();
    });
    ctx.strokeStyle = "#bb3034";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(8, 10);
    ctx.lineTo(34, 31);
    ctx.moveTo(-1, 10);
    ctx.lineTo(-41, 31);
    ctx.stroke();
    ctx.strokeStyle = "#273c49";
    ctx.lineWidth = 3;
    circle(6, 0, 6, "#566c79");
  } else if (kind === "phillips" || kind === "flathead") {
    shape(() => {
      ctx.roundRect(-46, -4, 72, 8, 3);
    });
    shape(() => {
      ctx.roundRect(17, -12, 30, 24, 8);
    }, "#b82b30");
    ctx.fillStyle = "#f3a0a2";
    ctx.fillRect(23, -8, 5, 16);
    ctx.strokeStyle = "#e9f0f4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-46, 0);
    ctx.lineTo(-39, 0);
    ctx.stroke();
  } else if (kind === "bolt") {
    shape(() => {
      ctx.roundRect(-30, -8, 65, 16, 3);
    });
    shape(() => {
      ctx.moveTo(-45, -17);
      ctx.lineTo(-30, -22);
      ctx.lineTo(-18, -16);
      ctx.lineTo(-18, 16);
      ctx.lineTo(-30, 22);
      ctx.lineTo(-45, 16);
      ctx.closePath();
    });
    ctx.strokeStyle = "#607687";
    ctx.lineWidth = 2;
    for (let i = -12; i < 32; i += 7) {
      ctx.beginPath();
      ctx.moveTo(i, -8);
      ctx.lineTo(i + 6, 8);
      ctx.stroke();
    }
  } else if (kind === "nut") {
    shape(() => {
      for (let i = 0; i < 6; i++) {
        let a = (i * Math.PI) / 3;
        let xx = Math.cos(a) * 34,
          yy = Math.sin(a) * 37;
        if (!i) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.closePath();
    });
    circle(0, 0, 17, "#263945");
    circle(0, 0, 11, "#667d8c");
  } else if (kind === "meter") {
    shape(() => {
      ctx.roundRect(-31, -47, 62, 94, 11);
    }, "#ce3d32");
    shape(() => {
      ctx.roundRect(-24, -37, 48, 34, 4);
    }, "#c4e3d7");
    ctx.fillStyle = "#1a3532";
    ctx.font = "bold 16px monospace";
    ctx.fillText("12.6", -20, -15);
    circle(0, 22, 12, "#24333d");
    ctx.strokeStyle = "#e5edf2";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(6, 14);
    ctx.stroke();
  }
  ctx.restore();
}
function label(t, x, y) {
  ctx.save();
  ctx.font = "900 italic 20px system-ui";
  const w = ctx.measureText(t).width + 24;
  ctx.fillStyle = "rgba(7,21,38,.88)";
  ctx.strokeStyle = "#ffcb43";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - 17, w, 32, 16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffcb43";
  ctx.textAlign = "center";
  ctx.fillText(t, x, y + 7);
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 17);
  ctx.lineTo(x + 9, y + 17);
  ctx.lineTo(x, y + 28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function magnetList() {
  const d = settings.difficulty,
    sp = d === "easy" ? 0.016 : 0.023,
    a = [
      [300 + Math.sin(frames * sp) * 190, 15 + Math.sin(frames * 0.035) * 4],
    ];
  if (d === "hard")
    a.push([
      300 - Math.sin(frames * 0.029 + 1.3) * 190,
      15 + Math.sin(frames * 0.04 + 1) * 4,
    ]);
  return a;
}
function drawMagnet(mx, my, noRail) {
  const danger = Math.max(0, 1 - Math.abs(player.x - mx) / 170),
    t = frames;
  ctx.save();
  if (!noRail) {
    // steel I-beam rail with hazard ends
    const beam = ctx.createLinearGradient(0, 4, 0, 22);
    beam.addColorStop(0, "#8ea3b3");
    beam.addColorStop(0.25, "#e3ecf2");
    beam.addColorStop(0.6, "#5d7385");
    beam.addColorStop(1, "#2a3a47");
    ctx.fillStyle = "#1b2731";
    ctx.fillRect(56, 2, 488, 22);
    ctx.fillStyle = beam;
    ctx.fillRect(58, 4, 484, 18);
    ctx.fillStyle = "#1b2731";
    ctx.fillRect(58, 11, 484, 4);
    ctx.fillStyle = "#c9d6df";
    for (let x = 72; x < 540; x += 34) {
      ctx.beginPath();
      ctx.arc(x, 7.5, 1.6, 0, 7);
      ctx.arc(x, 18.5, 1.6, 0, 7);
      ctx.fill();
    }
    for (const ex of [44, 540]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ex, 0, 16, 26);
      ctx.clip();
      ctx.fillStyle = "#ffcb2e";
      ctx.fillRect(ex, 0, 16, 26);
      ctx.fillStyle = "#14202a";
      for (let k = -30; k < 40; k += 10) {
        ctx.beginPath();
        ctx.moveTo(ex + k, 0);
        ctx.lineTo(ex + k + 5, 0);
        ctx.lineTo(ex + k + 5 - 26, 26);
        ctx.lineTo(ex + k - 26, 26);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.strokeStyle = "#14202a";
      ctx.lineWidth = 2;
      ctx.strokeRect(ex, 0, 16, 26);
    }
  } // trolley
  ctx.fillStyle = "#14202a";
  ctx.beginPath();
  ctx.roundRect(mx - 24, 20, 48, 14, 4);
  ctx.fill();
  ctx.fillStyle = "#ffcb2e";
  ctx.beginPath();
  ctx.roundRect(mx - 22, 22, 44, 10, 3);
  ctx.fill();
  ctx.fillStyle = "#14202a";
  for (const wx of [-14, 14]) {
    ctx.beginPath();
    ctx.arc(mx + wx, 20, 5, 0, 7);
    ctx.fill();
  }
  // field zone (exactly where it grabs)
  const sway = Math.sin(t * 0.05) * 2,
    cx = mx + sway,
    top = my + 66,
    bottom = my + 84;
  if (danger > 0) {
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, top, 0, bottom + 12);
    g.addColorStop(0, "rgba(80,190,255," + 0.85 * danger + ")");
    g.addColorStop(1, "rgba(90,200,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx - 30, top);
    ctx.lineTo(cx + 30, top);
    ctx.lineTo(cx + 46, bottom + 12);
    ctx.lineTo(cx - 46, bottom + 12);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.05 + k / 3) % 1,
        yy = top + ph * 24,
        w = 22 + ph * 20;
      ctx.strokeStyle = "rgba(200,245,255," + (1 - ph) * danger + ")";
      ctx.beginPath();
      ctx.ellipse(cx, yy, w, 5 + ph * 4, 0, 0, Math.PI);
      ctx.stroke();
    }
    if (danger > 0.55) {
      ctx.strokeStyle = "rgba(235,252,255," + danger + ")";
      ctx.lineWidth = 2;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        let zx = cx + side * 18,
          zy = top - 2;
        ctx.moveTo(zx, zy);
        for (let k = 0; k < 4; k++) {
          zx += side * ((k + Math.floor(t / 3)) % 2 ? 5 : -3);
          zy += 5;
          ctx.lineTo(zx, zy);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  // cable + shackle
  ctx.strokeStyle = "#1b2731";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(mx, 34);
  ctx.lineTo(cx, my + 28);
  ctx.stroke();
  ctx.strokeStyle = "#14202a";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, my + 30, 6, Math.PI * 0.9, Math.PI * 2.1);
  ctx.stroke();
  ctx.strokeStyle = "#b8c8d3";
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // horseshoe magnet
  if (danger > 0.35) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.25),
      hg = ctx.createRadialGradient(cx, my + 56, 8, cx, my + 56, 58);
    hg.addColorStop(
      0,
      "rgba(120,215,255," + 0.55 * danger * (0.6 + 0.4 * pulse) + ")",
    );
    hg.addColorStop(1, "rgba(120,215,255,0)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(cx, my + 56, 58, 0, 7);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(cx, my + 50);
  ctx.rotate(sway * 0.02);
  const ms = chaserSprites.magnetArt;
  if (ms && ms.complete && ms.naturalWidth) {
    ctx.drawImage(ms, -44, -27, 88, 74);
  }
  ctx.restore();
  ctx.restore();
}

// Location hazards: each location after the garage adds its own obstacle
const HAZ = {
  ball: {
    w: 44,
    h: 44,
    move: "bounce",
    name: "a bouncing basketball",
    art: [2.1, 1.45, 0.36, 0.12],
  },
  cone: { w: 60, h: 55, name: "a traffic cone" },
  tire: { w: 92, h: 47, move: "roll", vx: 1.5, name: "a rolling tire" },
  cart: {
    w: 66,
    h: 56,
    move: "roll",
    vx: 1.1,
    name: "a runaway shopping cart",
  },
  wetsign: {
    w: 52,
    h: 60,
    name: "a wet-floor sign",
    art: [2.08, 1.2, 0.45, 0.1],
  },
  dolly: {
    w: 84,
    h: 46,
    move: "roll",
    vx: 2,
    name: "a speeding floor jack",
    art: [1.26, 1.55, 0.5, 0.27],
  },
  snowball: {
    w: 48,
    h: 48,
    move: "roll",
    vx: 1.3,
    name: "a rolling snowball",
    art: [2.1, 1.4, 0.3, 0.18],
  },
};
const THEME_HAZ = [
  null,
  "ball",
  "cone",
  "tire",
  "cart",
  "wetsign",
  "dolly",
  "snowball",
  "tire",
  "cone",
  "cart",
  "ball",
  "wetsign",
  "tire",
  "dolly",
  "cone",
];
function themeIndex(l) {
  return Math.min(THEMES.length - 1, Math.floor((l - 1) / 25));
}
function hazLift(o) {
  return HAZ[o.kind] && HAZ[o.kind].move === "bounce"
    ? Math.abs(Math.sin(frames * 0.055 + o.ph)) * 78
    : 0;
}
function drawHazard(o, x) {
  const k = o.kind,
    w = o.w,
    h = o.h,
    lift = hazLift(o);
  const sp = toolSprites[k];
  if (sp && sp.complete && sp.naturalWidth) {
    const bob = HAZ[k].art ? 0 : Math.abs(Math.sin(frames * 0.25 + o.ph)) * 2.5;
    const A = HAZ[k].art;
    if (A) {
      const dw = w * A[0],
        dh = h * A[1];
      ctx.drawImage(sp, x - dw * A[2], ground - lift - h - dh * A[3], dw, dh);
      return;
    }
    ctx.drawImage(sp, x - w / 2, ground - lift - h - bob, w, h);
    return;
  }
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(x, ground + 1, w * 0.45 * (1 - lift / 200), 5, 0, 0, 7);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, ground - lift - h / 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#14202a";
  ctx.lineJoin = "round";
  if (k === "ball") {
    ctx.rotate(frames * 0.05);
    ctx.fillStyle = "#f07a26";
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(20, 0);
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-26, 0, 18, -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(26, 0, 18, Math.PI - 0.9, Math.PI + 0.9);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.beginPath();
    ctx.arc(-7, -8, 6, 0, 7);
    ctx.fill();
  } else if (k === "cone") {
    ctx.fillStyle = "#ff6a1a";
    ctx.beginPath();
    ctx.moveTo(-7, -24);
    ctx.lineTo(7, -24);
    ctx.lineTo(16, 18);
    ctx.lineTo(-16, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#f4f8fb";
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(10, -6);
    ctx.lineTo(12.5, 4);
    ctx.lineTo(-12.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff6a1a";
    ctx.fillRect(-20, 17, 40, 7);
    ctx.strokeRect(-20, 17, 40, 7);
  } else if (k === "tire" || k === "snowball") {
    ctx.rotate(-frames * 0.12);
    if (k === "tire") {
      ctx.fillStyle = "#22282e";
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#3d474f";
      ctx.lineWidth = 4;
      for (let a = 0; a < 12; a++) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a * 0.52) * 20, Math.sin(a * 0.52) * 20);
        ctx.lineTo(Math.cos(a * 0.52) * 25, Math.sin(a * 0.52) * 25);
        ctx.stroke();
      }
      ctx.fillStyle = "#b9c6cf";
      ctx.strokeStyle = "#14202a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#14202a";
      for (let a = 0; a < 5; a++) {
        ctx.beginPath();
        ctx.arc(Math.cos(a * 1.257) * 6, Math.sin(a * 1.257) * 6, 1.8, 0, 7);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#f3f8ff";
      ctx.beginPath();
      ctx.arc(0, 0, 23, 0, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#c9dcf2";
      ctx.beginPath();
      ctx.arc(6, 7, 14, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-8, -8, 6, 0, 7);
      ctx.fill();
    }
  } else if (k === "cart") {
    ctx.translate(0, -4);
    ctx.strokeStyle = "#14202a";
    ctx.fillStyle = "rgba(185,205,220,.55)";
    ctx.beginPath();
    ctx.moveTo(-30, -22);
    ctx.lineTo(28, -22);
    ctx.lineTo(22, 8);
    ctx.lineTo(-24, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#8fa4b4";
    ctx.lineWidth = 2;
    for (let i = -22; i < 24; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, -21);
      ctx.lineTo(i * 0.85, 7);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-28, -8);
    ctx.lineTo(26, -8);
    ctx.stroke();
    ctx.strokeStyle = "#14202a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(28, -22);
    ctx.lineTo(36, -32);
    ctx.lineTo(42, -32);
    ctx.stroke();
    ctx.strokeStyle = "#e8343e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(36, -32);
    ctx.lineTo(42, -32);
    ctx.stroke();
    ctx.fillStyle = "#ffd23d";
    ctx.strokeStyle = "#14202a";
    ctx.lineWidth = 2.5;
    ctx.fillRect(-18, -30, 14, 10);
    ctx.strokeRect(-18, -30, 14, 10);
    ctx.fillStyle = "#1b56b8";
    ctx.fillRect(0, -28, 12, 8);
    ctx.strokeRect(0, -28, 12, 8);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-22, 8);
    ctx.lineTo(-18, 18);
    ctx.moveTo(20, 8);
    ctx.lineTo(16, 18);
    ctx.stroke();
    ctx.fillStyle = "#22282e";
    for (const wx of [-18, 16]) {
      ctx.beginPath();
      ctx.arc(wx, 22, 5, 0, 7);
      ctx.fill();
    }
  } else if (k === "wetsign") {
    ctx.fillStyle = "#ffd23d";
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.lineTo(4, -28);
    ctx.lineTo(18, 28);
    ctx.lineTo(-18, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#14202a";
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(9, 6);
    ctx.lineTo(-9, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd23d";
    ctx.font = "900 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("!", 0, 4);
    ctx.fillStyle = "#14202a";
    ctx.font = "900 7px system-ui";
    ctx.fillText("WET", 0, 18);
  } else if (k === "dolly") {
    ctx.fillStyle = "#e8343e";
    ctx.beginPath();
    ctx.roundRect(-36, -8, 62, 12, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b9c6cf";
    ctx.beginPath();
    ctx.roundRect(14, -14, 18, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#14202a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-36, -2);
    ctx.lineTo(-48, -24);
    ctx.stroke();
    ctx.strokeStyle = "#b9c6cf";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#22282e";
    for (const wx of [-28, 18]) {
      ctx.beginPath();
      ctx.arc(wx, 8, 6, 0, 7);
      ctx.fill();
    }
    if (frames % 8 < 4) {
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(34, -6);
      ctx.lineTo(46, -6);
      ctx.moveTo(34, 2);
      ctx.lineTo(42, 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function powerIcon(t, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#182733";
  ctx.fillStyle = "#182733";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  if (t === "shield") {
    ctx.moveTo(0, -11);
    ctx.lineTo(9, -7);
    ctx.quadraticCurveTo(9, 6, 0, 12);
    ctx.quadraticCurveTo(-9, 6, -9, -7);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-1, 3.5);
    ctx.lineTo(5, -4);
    ctx.stroke();
  } else if (t === "slow") {
    ctx.arc(0, 1, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(0, -5);
    ctx.moveTo(0, 1);
    ctx.lineTo(5, 4);
    ctx.stroke();
    ctx.fillRect(-3, -13, 6, 3);
  } else if (t === "boost") {
    for (const dx of [-6, 3]) {
      ctx.beginPath();
      ctx.moveTo(dx - 3, -8);
      ctx.lineTo(dx + 5, 0);
      ctx.lineTo(dx - 3, 8);
      ctx.stroke();
    }
  } else if (t === "wd40" || t === "rocket") {
    if (window.FX) FX.drawPowerIcon(t);
  } else if (t === "magnet") {
    ctx.lineWidth = 6;
    ctx.lineCap = "butt";
    ctx.strokeStyle = "#c62f34";
    ctx.arc(0, -1, 7, Math.PI, 0, false);
    ctx.moveTo(-7, -1);
    ctx.lineTo(-7, 6);
    ctx.moveTo(7, -1);
    ctx.lineTo(7, 6);
    ctx.stroke();
    ctx.fillStyle = "#f2f6f9";
    ctx.fillRect(-10, 6, 6, 4);
    ctx.fillRect(4, 6, 6, 4);
  } else {
    ctx.moveTo(-8, 10);
    ctx.lineTo(8, 10);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-7, 6 - i * 4);
      ctx.lineTo(7, 4 - i * 4);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.lineTo(0, -13);
    ctx.lineTo(4, -8);
    ctx.stroke();
  }
  ctx.restore();
}
function destination(x) {
  if (goalMode === "engine") {
    const im = finishSprites.engine;
    if (im && im.complete && im.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(x + 108, ground + 2, 145, 9, 0, 0, 7);
      ctx.fill();
      ctx.restore();
      ctx.drawImage(im, x - 43, 136, 302, 241);
    }
    label("LAND IN THE ENGINE", x + 108, 112);
    return;
  }
  let type = (level - 1) % 4;
  if (type === 1 || type === 2 || type === 3) {
    const im =
      finishSprites[
        type === 1
          ? "cart"
          : type === 2
            ? ["car1", "car2", "car3", "car4", "car5", "car6", "car7"][
                Math.floor((level - 1) / 4) % 7
              ]
            : "bench"
      ];
    if (im && im.complete && im.naturalWidth) {
      if (type === 2) {
        const cw = 360,
          chh = (cw * im.naturalHeight) / im.naturalWidth;
        ctx.drawImage(im, x - 60, ground + 6 - chh, cw, chh);
      } else
        ctx.drawImage(
          im,
          x - (type === 1 ? 44 : 63),
          type === 3 ? 109 : 117,
          type === 3 ? 356 : 285,
          type === 3 ? 268 : 260,
        );
      label(
        type === 2 ? "ROLL UNDER" : type === 3 ? "LAND ON TOP" : "LAND ON TOP",
        x + (type === 2 ? 120 : type === 3 ? 115 : 98),
        type === 2 ? 160 : type === 3 ? 88 : 95,
      );
      return;
    }
  }
  if (type === 0 || type === 1) {
    const im =
      heroSprites[goalMode === "drawer" ? "toolboxOpen" : "toolboxClosed"];
    if (im && im.complete && im.naturalWidth) {
      ctx.drawImage(im, x - 56, 166, 312, 211);
      label(goalMode === "drawer" ? "JUMP IN" : "ROLL UNDER", x + 100, 145);
      return;
    }
  }
  ctx.save();
  ctx.translate(x, 0);
  if (type === 0 || type === 1) {
    const red = type === 0;
    ctx.fillStyle = "#121b23";
    ctx.beginPath();
    ctx.ellipse(94, 362, 108, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d252b";
    for (const cx of [24, 161]) {
      ctx.fillRect(cx - 7, 345, 14, 13);
      ctx.beginPath();
      ctx.arc(cx, 361, 11, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#9eafb9";
      ctx.beginPath();
      ctx.arc(cx, 361, 5, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#1d252b";
    }
    const body = red ? "#c52c35" : "#2c6592",
      dark = red ? "#741e28" : "#1a405f";
    ctx.fillStyle = body;
    ctx.strokeStyle = "#18242d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(0, 200, 188, 148, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.fillRect(7, 208, 174, 134);
    ctx.fillStyle = body;
    ctx.fillRect(13, 213, 162, 122);
    ctx.fillStyle = "#f6a0a0";
    ctx.fillRect(16, 214, 4, 119);
    ctx.fillStyle = "#d8e3ea";
    ctx.fillRect(-3, 195, 194, 9);
    ctx.fillStyle = "#26343f";
    ctx.fillRect(153, 197, 25, 3);
    for (let j = 0; j < 4; j++) {
      const yy = 217 + j * 29;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.roundRect(20, yy, 148, 25, 3);
      ctx.fill();
      ctx.fillStyle = red ? "#a72b33" : "#245780";
      ctx.fillRect(23, yy + 3, 142, 18);
      ctx.fillStyle = "#dce8ee";
      ctx.beginPath();
      ctx.roundRect(78, yy + 7, 34, 5, 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff35";
      ctx.lineWidth = 1;
      ctx.strokeRect(24, yy + 3, 140, 18);
    }
    ctx.fillStyle = "#e2edf2";
    ctx.font = "bold 10px system-ui";
    ctx.fillText("10MM GARAGE", 31, 210);
    if (goalMode === "drawer") {
      ctx.fillStyle = "#141c25";
      ctx.fillRect(9, 240, 170, 60);
      ctx.fillStyle = body;
      ctx.strokeStyle = "#26343e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(12, 243);
      ctx.lineTo(176, 243);
      ctx.lineTo(192, 265);
      ctx.lineTo(192, 307);
      ctx.lineTo(23, 307);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#202e39";
      ctx.fillRect(24, 249, 151, 41);
      ctx.fillStyle = "#667985";
      ctx.fillRect(26, 250, 147, 4);
      ctx.fillStyle = "#d8e7ef";
      ctx.fillRect(85, 297, 32, 5);
      ctx.fillStyle = "#ffdf72";
      ctx.font = "bold 12px system-ui";
      ctx.fillText("JUMP INTO DRAWER", 17, 234);
    } else {
      ctx.fillStyle = "#101a22";
      ctx.fillRect(38, 343, 116, 22);
      ctx.fillStyle = "#ffdf72";
      ctx.font = "bold 13px system-ui";
      ctx.fillText("ROLL UNDER", 45, 190);
    }
  } else if (type === 2) {
    ctx.fillStyle = "#c9d4dc";
    ctx.beginPath();
    ctx.moveTo(-20, 298);
    ctx.lineTo(10, 265);
    ctx.lineTo(55, 249);
    ctx.lineTo(98, 204);
    ctx.lineTo(165, 204);
    ctx.lineTo(208, 259);
    ctx.lineTo(245, 275);
    ctx.lineTo(258, 328);
    ctx.lineTo(232, 341);
    ctx.lineTo(-20, 341);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#526677";
    ctx.fillRect(107, 213, 51, 45);
    ctx.fillStyle = "#161c23";
    for (let wx of [42, 194]) {
      ctx.beginPath();
      ctx.arc(wx, 341, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8c9aa8";
      ctx.beginPath();
      ctx.arc(wx, 341, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = "#9b6d43";
    ctx.fillRect(-5, 224, 242, 19);
    ctx.fillStyle = "#b1bdc9";
    ctx.fillRect(10, 243, 16, 126);
    ctx.fillRect(215, 243, 16, 126);
    ctx.fillStyle = "#516371";
    ctx.fillRect(25, 263, 190, 15);
  }
  if (goalMode === "drawer") {
    ctx.fillStyle = "#18232d";
    ctx.fillRect(8, 246, 170, 51);
    ctx.strokeStyle = "#f6d274";
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 246, 170, 51);
    ctx.fillStyle = "#ffdc68";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("OPEN DRAWER", 18, 237);
  }
  ctx.fillStyle = "#ffcb43";
  ctx.font = "bold 15px system-ui";
  ctx.fillText(goalMode === "drawer" ? "JUMP IN!" : "HIDE HERE", 20, 189);
  ctx.restore();
}
function illustratedCar(style, x, y, raised) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#182a38";
  const paint = style === 0 ? "#e7edf0" : style === 1 ? "#247cc0" : "#c63d40";
  ctx.fillStyle = "#0f1c26";
  ctx.beginPath();
  ctx.ellipse(0, 6, 119, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const wx of [-77, 78]) {
    ctx.fillStyle = "#121b24";
    ctx.beginPath();
    ctx.arc(wx, 0, 20, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b3c5d0";
    ctx.beginPath();
    ctx.arc(wx, 0, 11, 0, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#4b6577";
    ctx.beginPath();
    ctx.arc(wx, 0, 4, 0, 7);
    ctx.fill();
  }
  ctx.fillStyle = paint;
  ctx.beginPath();
  if (style === 0) {
    ctx.moveTo(-119, -12);
    ctx.lineTo(-117, -45);
    ctx.lineTo(-75, -52);
    ctx.lineTo(-53, -83);
    ctx.lineTo(29, -83);
    ctx.lineTo(56, -49);
    ctx.lineTo(116, -45);
    ctx.lineTo(119, -9);
  } else if (style === 1) {
    ctx.moveTo(-118, -10);
    ctx.lineTo(-105, -42);
    ctx.lineTo(-48, -50);
    ctx.lineTo(-15, -75);
    ctx.lineTo(54, -75);
    ctx.lineTo(84, -47);
    ctx.lineTo(113, -38);
    ctx.lineTo(119, -9);
  } else {
    ctx.moveTo(-119, -10);
    ctx.lineTo(-114, -48);
    ctx.lineTo(-80, -58);
    ctx.lineTo(-54, -81);
    ctx.lineTo(60, -81);
    ctx.lineTo(83, -57);
    ctx.lineTo(113, -49);
    ctx.lineTo(119, -9);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#233f53";
  ctx.beginPath();
  ctx.moveTo(-45, -75);
  ctx.lineTo(25, -75);
  ctx.lineTo(49, -49);
  ctx.lineTo(-69, -49);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#a6d2e7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-38, -70);
  ctx.lineTo(17, -70);
  ctx.stroke();
  ctx.strokeStyle = "#172b3b";
  ctx.beginPath();
  ctx.moveTo(-2, -73);
  ctx.lineTo(-2, -49);
  ctx.stroke();
  ctx.fillStyle = "#fff0a4";
  ctx.fillRect(-114, -35, 14, 10);
  ctx.fillStyle = "#e84c43";
  ctx.fillRect(102, -34, 14, 9);
  ctx.strokeStyle = "#a8c5d5";
  ctx.beginPath();
  ctx.moveTo(-98, -19);
  ctx.lineTo(97, -19);
  ctx.stroke();
  if (style === 0) {
    ctx.fillStyle = "#273845";
    ctx.fillRect(-111, -40, 43, 24);
    ctx.strokeStyle = "#e6edf1";
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(-106, -35 + j * 5);
      ctx.lineTo(-72, -35 + j * 5);
      ctx.stroke();
    }
  }
  ctx.restore();
}
function illustratedLift(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#142c45";
  ctx.fillStyle = "#256db2";
  for (const c of [-139, 139]) {
    ctx.fillRect(c - 12, -276, 24, 276);
    ctx.strokeRect(c - 12, -276, 24, 276);
    ctx.fillStyle = "#ffce49";
    ctx.fillRect(c - 10, -188, 20, 32);
    ctx.fillStyle = "#256db2";
  }
  ctx.fillStyle = "#245381";
  ctx.fillRect(-150, -280, 300, 14);
  ctx.strokeRect(-150, -280, 300, 14);
  ctx.fillStyle = "#e5b83f";
  ctx.beginPath();
  ctx.moveTo(-126, -90);
  ctx.lineTo(-51, -90);
  ctx.lineTo(-40, -79);
  ctx.lineTo(-126, -79);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(126, -90);
  ctx.lineTo(51, -90);
  ctx.lineTo(40, -79);
  ctx.lineTo(126, -79);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
function illustratedMechanic(x, y, pose = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = "round";
  ctx.strokeStyle = "#16283b";
  ctx.lineWidth = 5;
  ctx.fillStyle = "#243e5d";
  ctx.beginPath();
  ctx.moveTo(-15, -47);
  ctx.lineTo(-20, -7);
  ctx.lineTo(-5, -7);
  ctx.lineTo(0, -31);
  ctx.lineTo(7, -7);
  ctx.lineTo(22, -7);
  ctx.lineTo(17, -47);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#244f7a";
  ctx.beginPath();
  ctx.moveTo(-17, -91);
  ctx.lineTo(18, -91);
  ctx.lineTo(26, -46);
  ctx.lineTo(-23, -46);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#dfad83";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-17, -82);
  ctx.lineTo(-30, -60);
  ctx.lineTo(-23, -49);
  ctx.moveTo(18, -82);
  ctx.lineTo(34, -63);
  ctx.lineTo(28, -48);
  ctx.stroke();
  ctx.fillStyle = "#dba87b";
  ctx.strokeStyle = "#65442f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -108, 17, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1d2d40";
  ctx.beginPath();
  ctx.arc(0, -113, 18, Math.PI, Math.PI * 2);
  ctx.lineTo(17, -110);
  ctx.lineTo(-17, -110);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-18, -115, 36, 5);
  ctx.fillStyle = "#1a2a32";
  ctx.beginPath();
  ctx.arc(-6, -107, 2, 0, 7);
  ctx.arc(6, -107, 2, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "#754a35";
  ctx.beginPath();
  ctx.moveTo(-5, -99);
  ctx.quadraticCurveTo(0, -95, 7, -100);
  ctx.stroke();
  ctx.fillStyle = "#202831";
  ctx.fillRect(-24, -12, 19, 12);
  ctx.fillRect(6, -12, 19, 12);
  ctx.restore();
}
function drawPolishedFloor() {
  const grad = ctx.createLinearGradient(0, ground, 0, H);
  grad.addColorStop(0, "#77859a");
  grad.addColorStop(0.18, "#364b65");
  grad.addColorStop(0.58, "#526985");
  grad.addColorStop(1, "#253b55");
  ctx.fillStyle = grad;
  ctx.fillRect(0, ground, W, H - ground);
  ctx.save();
  ctx.globalAlpha = 0.22;
  const scene = garageScenes[Math.floor(level / 3) % garageScenes.length];
  if (scene && scene.complete && scene.naturalWidth) {
    ctx.translate(0, 2 * ground + 9);
    ctx.scale(1, -0.36);
    ctx.drawImage(
      scene,
      0,
      0,
      scene.naturalWidth,
      scene.naturalHeight,
      0,
      0,
      W,
      ground,
    );
  }
  ctx.restore();
  const stripe = ground + 59;
  ctx.fillStyle = "#e8a62a";
  ctx.fillRect(0, stripe, W, 5);
  ctx.fillStyle = "#ffe15c";
  ctx.fillRect(0, stripe, W, 2);
  ctx.strokeStyle = "rgba(225,236,255,.13)";
  ctx.lineWidth = 1;
  for (let x = -((scroll * 0.6) % 155); x < W + 155; x += 155) {
    ctx.beginPath();
    ctx.moveTo(x, ground);
    ctx.lineTo(x - 35, H);
    ctx.stroke();
  }
  const shine = ctx.createLinearGradient(0, ground, 0, H);
  shine.addColorStop(0, "rgba(255,255,255,.19)");
  shine.addColorStop(0.3, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(255,255,255,.04)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, ground, W, H - ground);
}
function drawGarageBackground() {
  const sc = sceneList(),
    imgs = sc.imgs;
  if (imgs.some((im) => im.complete && im.naturalWidth)) {
    const top = -Math.max(OFF, 275),
      tileH = H - top,
      ref = imgs.find((im) => im.naturalWidth),
      tileW = Math.round((tileH * ref.naturalWidth) / ref.naturalHeight),
      progress = scroll * 0.18,
      base = Math.floor(progress / tileW),
      offset = progress % tileW;
    for (let i = -1; i < 3; i++) {
      const im = imgs[(((base + i) % imgs.length) + imgs.length) % imgs.length];
      if (im.complete && im.naturalWidth) {
        const tx = -offset + i * tileW;
        if (sc.real && imgs.length === 1 && (((base + i) % 2) + 2) % 2 === 1) {
          ctx.save();
          ctx.translate(tx + tileW, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(
            im,
            0,
            0,
            im.naturalWidth,
            im.naturalHeight,
            0,
            top,
            tileW,
            tileH,
          );
          ctx.restore();
        } else
          ctx.drawImage(
            im,
            0,
            0,
            im.naturalWidth,
            im.naturalHeight,
            tx,
            top,
            tileW,
            tileH,
          );
      } else {
        ctx.fillStyle = "#334c5d";
        ctx.fillRect(-offset + i * tileW, top, tileW, tileH);
      }
    }
    if (!sc.real && sc.t.tint) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = sc.t.tint;
      ctx.fillRect(0, top, W, tileH);
      ctx.restore();
    }
    if (sc.t.fx === "dusk" && !sc.real) {
      const g = ctx.createLinearGradient(0, top, 0, ground);
      g.addColorStop(0, "rgba(255,120,60,.25)");
      g.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, top, W, ground - top);
    }
    weather(sc.t);
    const fade = ctx.createLinearGradient(0, ground - 30, 0, H);
    fade.addColorStop(0, "rgba(8,19,31,0)");
    fade.addColorStop(1, "rgba(8,19,31,.55)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, ground - 30, W, H - ground + 30);
    return;
  }
  const wall = ctx.createLinearGradient(0, 0, 0, ground);
  wall.addColorStop(0, "#344c61");
  wall.addColorStop(0.7, "#536b79");
  wall.addColorStop(1, "#2a3a47");
  ctx.fillStyle = wall;
  ctx.fillRect(0, -OFF, W, ground + OFF);
  ctx.fillStyle = "#223644";
  ctx.fillRect(0, 0, W, 36);
  ctx.fillStyle = "#b6c8d2";
  for (let x = 35; x < W; x += 180) {
    ctx.fillRect(x, 15, 110, 8);
    ctx.fillStyle = "#f4f4c9";
    ctx.fillRect(x + 8, 19, 94, 4);
    ctx.fillStyle = "#b6c8d2";
  }
  const bayWidth = 340,
    offset = (scroll * 0.22) % bayWidth;
  for (let i = -1; i < 4; i++) {
    const x = i * bayWidth - offset,
      variation = (((i + Math.floor((scroll * 0.22) / bayWidth)) % 4) + 4) % 4;
    ctx.save();
    ctx.translate(x, 0);
    ctx.fillStyle = "#243849";
    ctx.fillRect(14, 55, 312, 266);
    ctx.fillStyle = "#a2b6c2";
    ctx.fillRect(12, 50, 9, 275);
    ctx.fillRect(319, 50, 9, 275);
    ctx.fillStyle = "#7892a3";
    ctx.fillRect(20, 51, 300, 10);
    ctx.fillStyle = "#2a4355";
    ctx.fillRect(29, 67, 280, 244);
    ctx.fillStyle = "#a4b8c6";
    ctx.fillRect(40, 78, 90, 38);
    ctx.fillStyle = "#d3e2e7";
    ctx.fillRect(46, 84, 78, 25);
    ctx.fillStyle = "#ffda6a";
    ctx.font = "bold 15px system-ui";
    ctx.fillText("SERVICE BAY " + (variation + 1), 83, 44);
    ctx.fillStyle = "#415967";
    ctx.fillRect(35, 293, 268, 13);
    const lifted = variation === 0 || variation === 2,
      carY = lifted ? 160 : 255;
    illustratedLift(168, 313);
    const carColors = ["#d9e4ec", "#c94d42", "#6ca4cb", "#a5b6c1"],
      paint = carColors[variation];
    if (lifted) {
      ctx.fillStyle = "#e5bf4c";
      ctx.fillRect(70, carY + 80, 197, 6);
      ctx.fillStyle = "#d7e0e5";
      ctx.fillRect(148, carY + 87, 39, 12);
    }
    illustratedMechanic(variation % 2 === 0 ? 297 : 43, 315);
    ctx.restore();
  }
  ctx.fillStyle = "#283b48";
  ctx.fillRect(0, 318, W, ground - 318);
  ctx.fillStyle = "#536673";
  ctx.fillRect(0, 319, W, 5);
  ctx.fillStyle = "#7b8488";
  ctx.fillRect(0, ground, W, 7);
  ctx.fillStyle = "#4a5054";
  ctx.fillRect(0, ground + 7, W, H - ground - 7);
  ctx.strokeStyle = "#626b71";
  ctx.lineWidth = 1.5;
  for (let x = -(scroll % 95); x < W + 95; x += 95) {
    ctx.beginPath();
    ctx.moveTo(x, ground + 7);
    ctx.lineTo(x - 45, H);
    ctx.stroke();
  }
}
function drawEscapeTrail() {
  if (state !== "running" || scroll < world - 650) return;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#b8dfff";
  for (let i = 0; i < 5; i++) {
    let x = player.x - 18 - i * 12;
    ctx.beginPath();
    ctx.ellipse(x, ground - 11, 10 + i * 2, 2 + i * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function render() {
  // mirror levels flip the whole scene left-to-right
  ctx.setTransform(window.mirrorOn ? -1 : 1, 0, 0, 1, window.mirrorOn ? W : 0, 0);
  ctx.clearRect(0, 0, W, CH);
  ctx.translate(0, OFF);
  drawGarageBackground();
  for (const o of obstacles) {
    let x = o.x - scroll;
    if (x < -110 || x > W + 120) continue;
    if (HAZ[o.kind]) {
      drawHazard(o, x);
      continue;
    }
    ctx.save();
    ctx.translate(x, ground - o.h / 2);
    ctx.rotate(o.angle);
    const sprite = toolSprites[o.kind] || art[o.kind];
    if (sprite && sprite.complete && sprite.naturalWidth) {
      ctx.drawImage(sprite, -o.w / 2, -o.h / 2, o.w, o.h);
    } else {
      toolIllustration(o.kind, 0, 0, o.w, o.h);
    }
    ctx.restore();
  }
  if (level >= 3 && scroll < world - 450) {
    magnetList().forEach(([mx, my], i) => drawMagnet(mx, my, i > 0));
  }
  if (window.FX) FX.drawWorld();
  let dx = world - scroll - 210;
  if (dx < W + 290) destination(dx);
  for (const c of coins) {
    if (c.taken) continue;
    const cx = c.x - scroll;
    if (cx < -30 || cx > W + 30) continue;
    const cy = c.y + Math.sin(frames * 0.09 + c.x) * 2;
    if (coinSprite.complete && coinSprite.naturalWidth) {
      const sq = Math.abs(Math.cos(frames * 0.06 + c.x * 0.01));
      ctx.drawImage(
        coinSprite,
        cx - 15 * Math.max(0.35, sq),
        cy - 13,
        30 * Math.max(0.35, sq),
        26,
      );
    } else {
      ctx.fillStyle = "#ffd34b";
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, 7);
      ctx.fill();
    }
  }
  for (const p of powerups) {
    if (p.taken) continue;
    let px = p.x - scroll;
    if (px < -30 || px > W + 30) continue;
    const ps = window.FX && FX.isNewPower(p.type) ? FX.powerSprite(p.type) : powerSprites[
        ["shield", "slow", "boost", "magnet"].includes(p.type)
          ? p.type
          : "spring"
      ];
    if (ps && ps.complete && ps.naturalWidth) {
      const bob = Math.sin(frames * 0.08 + p.x) * 3,
        sz = 58 + Math.sin(frames * 0.12) * 2;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(frames * 0.12);
      ctx.fillStyle = "#4fc3ff";
      ctx.beginPath();
      ctx.arc(px, p.y + bob, 32, 0, 7);
      ctx.fill();
      ctx.restore();
      const ar = ps.naturalWidth / ps.naturalHeight,
        dh = ar > 1 ? sz / ar : sz,
        dw = ar > 1 ? sz : sz * ar;
      ctx.drawImage(ps, px - dw / 2, p.y + bob - dh / 2, dw, dh);
      continue;
    }
    ctx.fillStyle =
      p.type === "shield"
        ? "#55d7ed"
        : p.type === "slow"
          ? "#a6e478"
          : p.type === "boost"
            ? "#ff8854"
            : p.type === "magnet"
              ? "#cb85ff"
              : p.type === "wd40"
                ? "#2f6fd6"
                : p.type === "rocket"
                  ? "#ff5a3c"
                  : "#ffca48";
    ctx.beginPath();
    ctx.arc(px, p.y, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();
    powerIcon(p.type, px, p.y);
  }
  if (chase === "hand") {
    const im = chase === "hand" ? chaserSprites.glove : chaserSprites[chase];
    let chasePulse = handReach().p;
    let hx = -40 + chasePulse * 120 - (boost > 0 ? 36 : 0),
      hy = ground - 94 + Math.sin(frames * 0.07) * 3;
    if (im && im.complete && im.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.98;
      if (chase === "hand") {
        ctx.drawImage(im, hx - 128, hy - 6, 215, 108);
        if (chasePulse > 0.55) {
          ctx.save();
          ctx.translate(hx + 75, hy + 48);
          ctx.rotate(-0.55 * chasePulse);
          for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.moveTo(-8, k * 12 - 12);
            ctx.quadraticCurveTo(
              20,
              k * 12 - 17,
              27 - k * 5,
              k * 12 + 3 + chasePulse * 13,
            );
            ctx.strokeStyle = "#151d28";
            ctx.lineWidth = 13;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.strokeStyle = "#778696";
            ctx.lineWidth = 5;
            ctx.stroke();
          }
          ctx.restore();
        }
      } else {
        ctx.drawImage(im, hx - 25, hy - 32, 85, 99);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = chase === "hand" ? "#ed9d68" : "#e43539";
      ctx.beginPath();
      ctx.roundRect(hx - 30, hy, 65, 42, 14);
      ctx.fill();
    }
  }
  if (shield > 0) {
    const fl = shield < 60 && Math.floor(frames / 5) % 2;
    ctx.save();
    ctx.globalAlpha = fl ? 0.25 : 0.55;
    ctx.strokeStyle = "#63e5f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x - 18, player.y, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const ps = powerSprites.shield;
    if (ps && ps.complete && ps.naturalWidth && !fl) {
      ctx.drawImage(ps, player.x + 14, player.y - 38, 24, 25);
    }
  }
  drawEscapeTrail();
  {
    const lift = Math.max(0, Math.min(1, (ground - player.r - player.y) / 160));
    ctx.save();
    ctx.globalAlpha = 0.35 * (1 - lift * 0.7);
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(
      player.x,
      ground + 2,
      30 * (1 - lift * 0.5),
      6 * (1 - lift * 0.5),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.sin(player.angle) * 0.22);
  const hero = heroSprites.socket;
  const rollFrame = activeRollingSkin && !activeRollingSkin.missing && activeRollingSkin.ready === 12
    ? activeRollingSkin.frames[Math.floor(Math.abs(player.angle) * 12 / (Math.PI * 2)) % 12] : null;
  if (rollFrame && rollFrame.naturalWidth) {
    ctx.rotate(-Math.sin(player.angle) * 0.22);
    ctx.drawImage(rollFrame, -46, -46, 92, 92);
  } else if (hero && hero.complete && hero.naturalWidth) {
    ctx.drawImage(hero, -87, -33, 131, 62);
  } else {
    image("socket10", 0, 0, 52, 52);
  }
  ctx.restore();
  if (window.FX) FX.drawOver();

  ctx.fillStyle = "#ffcb43";
  ctx.fillRect(
    0,
    -OFF,
    W * Math.min(1, (scroll + player.x) / (world - 100)),
    5,
  );
}
function tick(t) {
  if (state !== "running") return;
  let dt = Math.min(2.2, (t - (last || t)) / 16.67);
  last = t;
  let speed =
    (3.25 + Math.min(2.9, level * 0.022) + Math.min(0.55, Math.max(0, level - 200) * 0.003)) *
    DIFF[settings.difficulty].speed *
    (1 + runSpeedBonus) *
    (slow > 0 ? 0.68 : 1) *
    (boost > 0 ? 1.45 : 1) *
    (window.FX ? FX.speedMul() : 1) *
    dt;
  scroll += speed;
  frames += dt;
  if (shield > 0) shield -= dt;
  if (slow > 0) slow -= dt;
  if (boost > 0) boost -= dt;
  if (coinMagnet > 0) coinMagnet -= dt;
  if (window.FX && FX.tick(dt, speed) === "stop") return;
  player.vy = Math.min(10, player.vy + 0.64 * dt);
  player.y += player.vy * dt;
  if (player.y < 48) {
    player.y = 48;
    player.vy = Math.max(0, player.vy);
  }
  if (player.y >= ground - player.r) {
    player.y = ground - player.r;
    player.vy = 0;
    player.jumps = 0;
    player.flightMode = false;
    if (jumpBuffer > 0) performJump(-10.7);
  }
  if (jumpBuffer > 0) jumpBuffer = Math.max(0, jumpBuffer - dt);
  player.angle += speed * 0.12 + (player.vy !== 0 ? 0.045 : 0);
  $("speedLabel").textContent = (1 + runSpeedBonus).toFixed(2) + "×";
  $("speedFill").style.width = ((runSpeedBonus / 0.6) * 100).toFixed(1) + "%";
  $("distance").textContent =
    Math.min(100, Math.floor(((scroll + player.x) / (world - 170)) * 100)) +
    "%";
  for (const o of obstacles) {
    const hz = HAZ[o.kind];
    if (hz && hz.move === "roll" && o.x - scroll < W + 60) o.x -= hz.vx * dt;
    const lift = hazLift(o);
    let x = o.x - scroll;
    if (
      !o.cleared &&
      Math.abs(x - player.x) < o.w * 0.5 + player.r &&
      player.y + player.r < ground - lift - o.h + 9
    )
      o.jumpCleared = true;
    if (!o.cleared && x + o.w * 0.5 < player.x - player.r) {
      o.cleared = true;
      if (o.jumpCleared) {
        runSpeedBonus = Math.min(0.6, runSpeedBonus + 0.04);
        sfx("power");
        $("tip").textContent =
          "CLEAN JUMP! SPEED +" + Math.round(runSpeedBonus * 100) + "%";
      }
    }
    if (
      shield <= 0 &&
      !(window.FX && FX.ghost()) &&
      Math.abs(x - player.x) < player.r + o.w * 0.4 &&
      player.y + player.r > ground - lift - o.h + 7 &&
      player.y - player.r < ground - lift - 3
    ) {
      sfx("hit");
      buzz("heavy");
      stopMusic();
      render();
      crash(
        "CLANK!",
        "Your 10mm rolled into " +
          (hz ? hz.name : TOOL_NAME[o.kind]) +
          ". " +
          (hz && hz.move === "bounce"
            ? "Roll under it while it bounces up, or jump over it."
            : hz && hz.move === "roll"
              ? "It rolls toward you, so jump a little earlier."
              : "Jump earlier, or double-tap to get more height."),
        "TRY AGAIN",
        null,
        hz && !toolSprites[o.kind] ? "hero" : "tool:" + o.kind,
      );
      return;
    }
  }
  for (const c of coins) {
    if (c.taken) continue;
    const dx = c.x - scroll - player.x,
      dy = c.y - player.y;
    const attracted =
      coinMagnet > 0 && Math.abs(dx) < 115 && Math.abs(dy) < 105;
    if ((Math.abs(dx) < 30 && Math.abs(dy) < 33) || attracted) {
      c.taken = true;
      runCoins++;
      if (window.FX) runCoins += FX.coinBonus();
      runScore += 100;
      sfx("power");
      $("coinsCount").textContent = totalCoins + runCoins;
      $("scoreCount").textContent = totalScore + runScore;
      $("tip").textContent = "+100 POINTS! 10MM COIN!";
    }
  }
  for (const p of powerups) {
    if (
      !p.taken &&
      Math.abs(p.x - scroll - player.x) < 37 &&
      Math.abs(p.y - player.y) < 52
    ) {
      p.taken = true;
      sfx("power");
      buzz("medium");
      const pm = window.FX ? FX.powerMul() : 1;
      if (window.FX && FX.pickup(p.type, pm)) {
      } else if (p.type === "shield") shield = 320 * pm;
      else if (p.type === "slow") slow = 340 * pm;
      else if (p.type === "boost") boost = 300 * pm;
      else if (p.type === "magnet") coinMagnet = 400 * pm;
      else {
        player.vy = -12;
        player.jumps = 1;
      }
      $("tip").textContent =
        p.type === "shield"
          ? "Shield activated!"
          : p.type === "slow"
            ? "Slow motion activated!"
            : p.type === "boost"
              ? "SPEED BOOST! 45% faster for 5 seconds!"
              : p.type === "magnet"
                ? "COIN MAGNET! Collect nearby coins!"
                : window.FX && FX.pickupText(p.type)
                  ? FX.pickupText(p.type)
                  : "Spring bounce!";
    }
  }
  if (
    chase === "magnet" &&
    shield <= 0 &&
    frames > 60 &&
    frames % 210 < 65 &&
    player.y < ground - player.r - 30
  ) {
    player.vy -= 0.09 * dt;
  }
  if (level >= 3 && frames > 90 && scroll < world - 450) {
    const near = magnetList().some(
      ([mx, my]) => Math.abs(player.x - mx) < 42 && player.y < my + 80,
    );
    if (near && shield <= 0 && !(window.FX && FX.rocketOn())) {
      sfx("hit");
      buzz("heavy");
      stopMusic();
      render();
      crash(
        "MAGNETIZED!",
        "The overhead magnet grabbed your 10mm. Stay low when it passes, or grab a shield.",
        "TRY AGAIN",
        null,
        "magnet",
      );
      return;
    }
    if (near && shield > 0) {
      $("tip").textContent = "Shield blocked the magnet!";
    }
  }
  if (chase === "hand" && frames > 140 && scroll < world - 450) {
    const grab = handReach(),
      reach = grab.p;
    const handTip = -40 + reach * 120 - (boost > 0 ? 36 : 0) + 87;
    if (reach > 0.72 && grab.cycle !== lastGrabSoundCycle) {
      lastGrabSoundCycle = grab.cycle;
      sfx("grab");
    }
    const grounded = player.y >= ground - player.r - 8;
    if (reach > 0.65 && shield <= 0 && boost <= 0 && grounded) {
      $("tip").textContent = "HAND REACHING! JUMP!";
    }
    if (
      reach > 0.88 &&
      handTip >= player.x - player.r * 0.55 &&
      shield <= 0 &&
      !(window.FX && FX.ghost()) &&
      boost <= 0 &&
      grounded
    ) {
      sfx("hit");
      buzz("heavy");
      stopMusic();
      render();
      crash(
        "GOT GRABBED!",
        "The mechanic snatched your 10mm. Jump when the glove reaches out, or grab a shield or speed boost.",
        "TRY AGAIN",
        null,
        "glove",
      );
      return;
    }
  }
  if (scroll + player.x >= world - 170) {
    scroll = world - 288;
    const grounded = player.y >= ground - player.r - 3;
    const airborne = player.vy >= -1;
    let success = false;
    if (goalMode === "under") {
      if (!grounded && player.vy >= 0 && player.y > ground - player.r - 60) {
        player.y = ground - player.r;
        player.vy = 0;
      }
      success = player.y >= ground - player.r - 3;
    } else if (goalMode === "drawer")
      success = airborne && player.y >= 222 && player.y <= 305;
    else if (goalMode === "bench")
      success = airborne && player.y >= 179 && player.y <= 257;
    else if (goalMode === "engine")
      success = airborne && player.y >= 166 && player.y <= 257;
    else if (goalMode === "shelf")
      success = airborne && player.y >= 147 && player.y <= 251;
    if (!success) {
      $("distance").textContent = "99%";
      $("tip").textContent =
        goalMode === "under"
          ? "Roll under the vehicle or toolbox!"
          : goalMode === "drawer"
            ? "Jump into the open drawer!"
            : goalMode === "engine"
              ? "Land in the engine!"
              : goalMode === "bench"
                ? "Land on the workbench!"
                : "Land on the tool cart shelf!";
      render();
      rafId = requestAnimationFrame(tick);
      return;
    }
    sfx("win");
    buzz("success");
    stopMusic();
    if (window.FX && FX.onWin()) return;
    totalCoins += runCoins;
    totalScore += runScore + 500;
    localStorage.setItem("tenmm-coins", totalCoins);
    localStorage.setItem("tenmm-score", totalScore);
    $("coinsCount").textContent = totalCoins;
    $("scoreCount").textContent = totalScore;
    $("distance").textContent = "100%";
    best = Math.max(best, Math.min(MAX_LEVEL, level + 1));
    localStorage.setItem("tenmm-escape-best", best);
    localStorage.setItem("tenmm-escape-current", Math.min(MAX_LEVEL, level + 1));
    render();
    popup(
      "ESCAPED!",
      "You " +
        (goalMode === "drawer"
          ? "jumped into the open drawer"
          : goalMode === "engine"
            ? "hid inside the engine"
            : goalMode === "bench"
              ? "landed on the workbench"
              : goalMode === "shelf"
                ? "landed on the tool cart shelf"
                : "escaped underneath the " +
                  destinations[(level - 1) % 4].toLowerCase()) +
        "! +" +
        runCoins +
        " coin" +
        (runCoins === 1 ? "" : "s") +
        " • +" +
        (runScore + 500) +
        " points.",
      level % 10 === 0
        ? "BONUS ROUND!"
        : level === MAX_LEVEL
          ? "PLAY AGAIN"
          : "NEXT LEVEL",
      () => {
        const go = () => {
          level = level === MAX_LEVEL ? 1 : level + 1;
          start();
        };
        if (level % 10 === 0) bonusIntro(go);
        else go();
      },
      "win",
    );
    if (window.FX) FX.afterWin();
    return;
  }
  render();
  rafId = requestAnimationFrame(tick);
}
function showMenu() {
  cancelAnimationFrame(rafId);
  stopMusic();
  state = "menu";
  hidePanels();
  $("overlay").classList.remove("hidden");
  $("eyebrow").textContent = "THE GREAT SOCKET ESCAPE";
  setArt("hero");
  $("menuLevels").style.display = "";
  $("menuLevels").onclick = showLevels;
  $("menuShop").style.display = "";
  $("menuShop").onclick = showShop;
  $("message").textContent = "WHERE’S MY 10MM?!";
  $("details").textContent =
    "Every mechanic loses a 10mm. This one is running away! Roll, double-jump, triple-jump and hide before you get caught.";
  $("go").textContent =
    best > 1 ? "CONTINUE LEVEL " + Math.max(best, level) : "PLAY ADVENTURE";
  $("go").onclick = () => {
    level = Math.max(best, level);
    if (!storySeen) showStory();
    else if (!tutorialSeen) showTutorial();
    else start();
  };
  $("menuExtra").style.display = "";
  $("menuExtra").textContent = "HOW TO PLAY";
  $("menuExtra").onclick = showTutorial;
  $("menuSettings").style.display = "";
  $("menuSettings").textContent = "SETTINGS";
  $("menuSettings").onclick = showSettings;
  if (window.showHome) showHome(showMenu.intro === true);
  showMenu.intro = false;
}
function showStory() {
  state = "story";
  hidePanels();
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("overlay").classList.remove("hidden");
  $("menuSettings").style.display = "none";
  $("menuExtra").style.display = "";
  $("menuExtra").textContent = "SKIP INTRO";
  $("menuExtra").onclick = () => {
    storySeen = true;
    localStorage.setItem("tenmm-story", "yes");
    showTutorial();
  };
  const scenes = [
    ["glove", "A mechanic reaches for the 10mm socket…"],
    ["hero", "…but this socket has other plans. It rolls away!"],
    ["danger", "Tools, a magnet and a grabbing glove stand in its way."],
    ["toolbox", "Can the 10mm vanish into the garage before it gets caught?"],
  ];
  let index = 0;
  function next() {
    if (index >= scenes.length) {
      storySeen = true;
      localStorage.setItem("tenmm-story", "yes");
      showTutorial();
      return;
    }
    setArt(scenes[index][0]);
    $("eyebrow").textContent = "THE STORY • " + (index + 1) + "/4";
    $("message").textContent = "THE GREAT ESCAPE";
    $("details").textContent = scenes[index][1];
    $("go").textContent = index === scenes.length - 1 ? "LET’S PLAY" : "NEXT";
    $("go").onclick = () => {
      index++;
      next();
    };
  }
  next();
}
function showTutorial() {
  state = "tutorial";
  hidePanels();
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("overlay").classList.remove("hidden");
  setArt("hero");
  $("eyebrow").textContent = "HOW TO PLAY";
  $("message").textContent = "LEARN THE ESCAPE";
  $("details").textContent =
    "Tap JUMP (or anywhere on the garage). Tap once to jump, again to double jump. A quick third tap unlocks Flappy-style flying until you land. Avoid the overhead magnet. Collect glowing power-ups, avoid tools, and reach the hiding place. The first three levels are shorter and easier.";
  $("go").textContent = "START LEVEL 1";
  $("go").onclick = () => {
    tutorialSeen = true;
    localStorage.setItem("tenmm-tutorial", "yes");
    level = Math.max(1, level);
    start();
  };
  $("menuExtra").style.display = "";
  $("menuExtra").textContent = "MAIN MENU";
  $("menuExtra").onclick = showMenu;
  $("menuSettings").style.display = "none";
}
const DIFF = {
  easy: { speed: 0.85, label: "EASY" },
  normal: { speed: 1, label: "NORMAL" },
  hard: { speed: 1.15, label: "HARD" },
};
function loadSettings() {
  const d = {
    sfx: localStorage.getItem("tenmm-sound") !== "off",
    music: true,
    haptics: true,
    difficulty: "normal",
    layout: "two",
    startMode: "tap",
    radio: null,
  };
  try {
    const saved = JSON.parse(localStorage.getItem("tenmm-settings") || "{}");
    for (const k of Object.keys(d)) if (k in saved) d[k] = saved[k];
  } catch (e) {}
  if (!["easy", "normal", "hard"].includes(d.difficulty))
    d.difficulty = "normal";
  if (!["game", "mine", "off"].includes(d.radio)) d.radio = d.music ? "game" : "off";
  d.music = d.radio === "game";
  return d;
}
function saveSettings() {
  try {
    localStorage.setItem("tenmm-settings", JSON.stringify(settings));
    localStorage.setItem("tenmm-sound", settings.sfx ? "on" : "off");
  } catch (e) {}
}
function applyLayout() {
  document.body.classList.toggle("one-button", settings.layout === "one");
  $("jump").textContent = settings.layout === "one" ? "TAP TO JUMP" : "JUMP";
}
const ICON = {
  pause:
    '<svg viewBox="0 0 96 96" width="88"><rect x="8" y="8" width="80" height="80" rx="22" fill="#0d2035" stroke="#79cfff" stroke-width="4"/><rect x="30" y="26" width="13" height="44" rx="4" fill="#ffcb43"/><rect x="53" y="26" width="13" height="44" rx="4" fill="#ffcb43"/></svg>',
  gear:
    '<svg viewBox="0 0 96 96" width="88"><rect x="8" y="8" width="80" height="80" rx="22" fill="#0d2035" stroke="#79cfff" stroke-width="4"/><g transform="translate(48 48)" fill="#ffcb43">' +
    [0, 45, 90, 135, 180, 225, 270, 315]
      .map(
        (a) =>
          '<rect x="-6" y="-30" width="12" height="14" rx="3" transform="rotate(' +
          a +
          ')"/>',
      )
      .join("") +
    '<circle r="20"/><circle r="8" fill="#0d2035"/></g></svg>',
  map:
    '<svg viewBox="0 0 96 96" width="88"><rect x="8" y="8" width="80" height="80" rx="22" fill="#0d2035" stroke="#79cfff" stroke-width="4"/>' +
    [0, 1, 2]
      .map((r) =>
        [0, 1, 2]
          .map(
            (c) =>
              '<rect x="' +
              (22 + c * 19) +
              '" y="' +
              (22 + r * 19) +
              '" width="14" height="14" rx="4" fill="' +
              (r * 3 + c < 5 ? "#ffcb43" : "#3d5266") +
              '"/>',
          )
          .join(""),
      )
      .join("") +
    "</svg>",
  win:
    '<svg viewBox="0 0 120 40" width="120" style="display:block;margin:0 auto 4px">' +
    [20, 60, 100]
      .map(
        (x, i) =>
          '<polygon transform="translate(' +
          x +
          " " +
          (i === 1 ? 18 : 24) +
          ") scale(" +
          (i === 1 ? 1.25 : 1) +
          ')" points="0,-15 4.4,-4.6 15,-4.6 6.5,2.2 9.6,13 0,6.6 -9.6,13 -6.5,2.2 -15,-4.6 -4.4,-4.6" fill="#ffcb43" stroke="#b97a08" stroke-width="2"/>',
      )
      .join("") +
    "</svg>",
};
function setArt(x) {
  const el = $("menuArt"),
    img = (src, st) =>
      '<img src="' + src + '" alt="" style="' + (st || "") + '">';
  let h;
  if (x === "hero") h = img(skinSrc());
  else if (x === "win") h = ICON.win + img(skinSrc(), "width:170px");
  else if (x === "glove") h = img("chaser-glove.webp", "width:200px");
  else if (x === "magnet")
    h =
      img("chaser-magnet.webp", "width:110px") +
      img(skinSrc(), "width:130px;margin-top:-6px;transform:rotate(-14deg)");
  else if (x === "toolbox") h = img("toolbox-open.webp", "width:170px");
  else if (x === "danger")
    h =
      '<div style="display:flex;align-items:center;justify-content:center;gap:10px">' +
      img("tool-wrench.webp", "width:90px;display:inline-block;margin:0") +
      img("chaser-magnet.webp", "width:60px;display:inline-block;margin:0") +
      img("chaser-glove.webp", "width:90px;display:inline-block;margin:0") +
      "</div>";
  else if (x.startsWith("tool:"))
    h =
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px">' +
      img(
        "tool-" + x.slice(5) + ".webp",
        "width:" +
          ([
            "tool:meter",
            "tool:jack",
            "tool:phillips",
            "tool:flathead",
            "tool:evilsocket",
            "tool:bolt",
            "tool:screw",
            "tool:nut",
          ].includes(x)
            ? 80
            : 140) +
          "px;display:inline-block;margin:0",
      ) +
      img(
        skinSrc(),
        "width:120px;display:inline-block;margin:0;transform:rotate(18deg)",
      ) +
      "</div>";
  else if (ICON[x]) h = ICON[x];
  else {
    el.textContent = x;
    return;
  }
  el.innerHTML = h;
}
function hidePanels() {
  {
    const r = document.getElementById("ready");
    if (r && state !== "ready") r.classList.add("hidden");
  }
  if (window.hideHome && state !== "menu") hideHome();
  $("opts").classList.remove("on");
  $("levels").classList.remove("on");
  $("shop").classList.remove("on");
}
function buzz(kind) {
  if (!settings.haptics) return;
  try {
    const C = window.Capacitor,
      native = !!(
        C &&
        typeof C.isNativePlatform === "function" &&
        C.isNativePlatform()
      );
    const H =
      native && typeof C.registerPlugin === "function"
        ? (window.__hap = window.__hap || C.registerPlugin("Haptics"))
        : null;
    if (H) {
      (kind === "success"
        ? H.notification({ type: "SUCCESS" })
        : H.impact({
            style:
              kind === "heavy"
                ? "HEAVY"
                : kind === "medium"
                  ? "MEDIUM"
                  : "LIGHT",
          })
      ).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate(
        kind === "heavy" ? 60 : kind === "success" ? [30, 40, 30] : 12,
      );
    } else webTick(kind === "success" || kind === "heavy" ? 2 : 1);
  } catch (e) {}
}
// Background music: a short procedural garage loop (no audio files to ship or license).
let musicTimer = 0,
  musicStep = 0,
  musicNext = 0,
  musicGain = null;
const BASS = [45, 45, 52, 45, 48, 48, 43, 43],
  LEAD = [69, 0, 72, 0, 76, 74, 72, 0, 67, 0, 71, 0, 74, 72, 71, 0];
function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}
function note(freq, t, dur, type, vol) {
  const o = audioCtx.createOscillator(),
    g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + dur + 0.02);
}
// ---- Original chiptune soundtrack (composed for this game) ----
const NOTE_IX = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};
function nm(t) {
  const m = t.match(/^([A-G][#b]?)(\d)$/);
  return m ? 12 * (+m[2] + 1) + NOTE_IX[m[1]] : 0;
}
// a bar is 16 sixteenth-steps: a note starts it, '.' holds, '_' is a rest
function bar(str) {
  const out = [];
  let cur = null;
  for (const tk of str.trim().split(/\s+/)) {
    if (tk === ".") {
      if (cur) cur.len++;
      out.push(null);
    } else if (tk === "_") {
      cur = null;
      out.push(null);
    } else {
      cur = { n: nm(tk), len: 1 };
      out.push(cur);
    }
  }
  while (out.length < 16) out.push(null);
  return out;
}
const CHORD = {
  Am: [57, 60, 64],
  F: [53, 57, 60],
  C: [48, 52, 55],
  G: [55, 59, 62],
  Dm: [50, 53, 57],
  E: [52, 56, 59],
  Bb: [46, 50, 53],
  A: [45, 49, 52],
  Em: [52, 55, 59],
  B: [47, 51, 54],
};
const SONGS = {
  level: {
    bpm: 140,
    chords: "Am F C G Am F C G Dm Am F E Dm Am F E",
    drums: "beat",
    lead: [
      "E5 _ A5 _ G5 _ E5 _ D5 _ E5 . . . _ _",
      "C5 _ D5 _ E5 _ F5 _ E5 _ D5 _ C5 . . .",
      "G4 _ C5 _ E5 _ G5 _ F5 _ E5 _ D5 _ C5 _",
      "D5 . . . B4 _ G4 _ B4 _ D5 _ G5 . . .",
      "E5 _ A5 _ G5 _ E5 _ D5 _ E5 . . . _ _",
      "A5 _ G5 _ F5 _ E5 _ D5 _ C5 _ D5 . . .",
      "E5 _ G5 _ C6 . . . B5 _ G5 _ E5 _ G5 _",
      "D5 . . . . . . . E5 _ G#5 _ B5 _ E6 _",
      "F5 . . . E5 _ D5 _ A4 . . . D5 _ F5 _",
      "E5 . . . C5 _ A4 _ E4 . . . A4 _ C5 _",
      "A5 . . . G5 _ F5 _ C5 . . . F5 _ A5 _",
      "G#5 . . . B5 . . . E6 . . . D6 _ B5 _",
      "A5 _ F5 _ D5 _ F5 _ A5 _ D6 _ C6 _ A5 _",
      "C6 _ A5 _ E5 _ A5 _ C6 _ E6 _ D6 _ C6 _",
      "B5 . . . A5 _ G5 _ F5 . . . E5 _ D5 _",
      "E5 . . . . . . . _ _ _ _ _ _ _ _",
    ],
    bass: [
      0,
      null,
      12,
      null,
      0,
      null,
      12,
      null,
      0,
      null,
      12,
      null,
      0,
      null,
      7,
      null,
    ],
    arp: true,
  },
  title: {
    bpm: 108,
    chords: "Dm Dm Bb A Dm Dm Bb A",
    drums: "soft",
    lead: [
      "D5 _ _ F5 _ _ A5 _ G#5 _ A5 _ _ _ _ _",
      "D6 _ _ C6 _ _ A5 _ F5 _ G5 _ A5 _ _ _",
      "F5 _ _ D5 _ _ Bb4 _ D5 _ F5 _ Bb5 . . .",
      "A5 _ G5 _ F5 _ E5 _ C#5 . . . A4 _ _ _",
      "D5 _ _ F5 _ _ A5 _ G#5 _ A5 _ _ _ _ _",
      "D6 _ _ E6 _ _ F6 _ E6 _ D6 _ A5 _ _ _",
      "G5 _ _ F5 _ _ D5 _ F5 _ Bb5 _ D6 . . .",
      "C#6 . . . A5 . . . E5 . . . C#5 . . .",
    ],
    bass: [
      0,
      null,
      null,
      12,
      null,
      null,
      7,
      null,
      0,
      null,
      null,
      12,
      null,
      null,
      10,
      null,
    ],
    arp: false,
  },
  bonus: {
    bpm: 156,
    chords: "Em Em C B Em Em C B",
    drums: "tense",
    lead: [
      "B5 _ B5 _ _ _ B5 _ C6 _ B5 _ A5 _ G5 _",
      "F#5 _ G5 _ A5 _ B5 _ E5 . . . _ _ _ _",
      "C6 _ C6 _ _ _ C6 _ D6 _ C6 _ B5 _ A5 _",
      "G5 _ F#5 _ E5 _ D#5 _ F#5 . . . B5 . . .",
      "E6 _ D6 _ B5 _ G5 _ E5 _ G5 _ B5 _ D6 _",
      "C6 . . . B5 _ A5 _ G5 . . . F#5 _ E5 _",
      "E5 _ G5 _ C6 _ E6 _ D6 _ C6 _ B5 _ A5 _",
      "B5 . . . . . . . D#6 . . . F#6 . . .",
    ],
    bass: [0, 0, 12, 0, 0, 10, 0, 12, 0, 0, 12, 0, 0, 7, 0, 10],
    arp: false,
  },
};
for (const k in SONGS) {
  const s = SONGS[k];
  s.bars = s.lead.map(bar);
  s.ch = s.chords.split(" ");
}
let musicSong = "level",
  musicKey = 0,
  noiseBuf = null;
function noise(t, dur, vol, hp) {
  if (!noiseBuf) {
    noiseBuf = audioCtx.createBuffer(
      1,
      audioCtx.sampleRate * 0.3,
      audioCtx.sampleRate,
    );
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = audioCtx.createBufferSource(),
    f = audioCtx.createBiquadFilter(),
    g = audioCtx.createGain();
  s.buffer = noiseBuf;
  f.type = "highpass";
  f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(musicGain);
  s.start(t);
  s.stop(t + dur + 0.02);
}
function kick(t, vol) {
  const o = audioCtx.createOscillator(),
    g = audioCtx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(musicGain);
  o.start(t);
  o.stop(t + 0.18);
}
function playStep(song, step, t, sx) {
  const b = step >> 4,
    i = step & 15,
    barN = b % song.bars.length,
    root = CHORD[song.ch[barN % song.ch.length]],
    k = musicKey;
  const L = song.bars[barN][i];
  if (L) note(midi(L.n + k), t, sx * L.len * 0.92, "square", 0.026);
  const bs = song.bass[i];
  if (bs !== null)
    note(midi(root[0] - 12 + bs + k), t, sx * 0.85, "triangle", 0.07);
  if (song.arp && i % 2 === 0)
    note(midi(root[(i / 2) % 3] + 12 + k), t, sx * 0.7, "square", 0.009);
  if (song.drums === "beat") {
    if (i === 0 || i === 6 || i === 8 || i === 11) kick(t, 0.16);
    if (i === 4 || i === 12) noise(t, 0.12, 0.07, 1200);
    if (i % 2 === 0) noise(t, 0.03, 0.025, 7000);
  } else if (song.drums === "soft") {
    if (i === 0 || i === 8) kick(t, 0.1);
    if (i === 4 || i === 12) noise(t, 0.05, 0.03, 3000);
    if (i % 4 === 2) noise(t, 0.025, 0.015, 8000);
  } else if (song.drums === "tense") {
    if (i % 4 === 0) kick(t, 0.13);
    if (i === 12) noise(t, 0.1, 0.06, 1500);
    noise(t, 0.02, 0.02, 9000);
  }
}
function startMusic(which) {
  if (!settings.music) return;
  audioReady();
  if (!audioCtx) return;
  which = which || "level";
  const key =
    which === "level" ? [0, 2, -2, 3, 5, -3, 1, -5][themeIndex(level) % 8] : 0;
  if (musicTimer && musicSong === which && musicKey === key) return;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = 0;
  }
  musicSong = which;
  musicKey = key;
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.connect(audioCtx.destination);
  }
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(0.6, audioCtx.currentTime);
  const song = SONGS[which],
    bpm = song.bpm + (which === "level" ? Math.min(16, level * 0.08) : 0),
    sx = 60 / bpm / 4;
  musicStep = 0;
  musicNext = audioCtx.currentTime + 0.06;
  musicTimer = setInterval(() => {
    if (!audioCtx || audioCtx.state !== "running") return;
    // if the game stalled (busy screen, phone hiccup), skip the missed beats instead of playing them all at once
    if (musicNext < audioCtx.currentTime - 0.05) {
      const missed = Math.ceil((audioCtx.currentTime - musicNext) / sx);
      musicNext += missed * sx;
      musicStep += missed;
    }
    while (musicNext < audioCtx.currentTime + 0.25) {
      playStep(song, musicStep, musicNext, sx);
      musicNext += sx;
      musicStep++;
    }
  }, 60);
}
function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = 0;
  }
  if (musicGain && audioCtx) {
    try {
      musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
      musicGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    } catch (e) {}
  }
}
// iPhone can interrupt or silently break the game's sound (full-screen ads, calls, Siri, other apps).
// Rebuild the sound engine when that happens and pick the music back up.
function audioReset() {
  const wasSong = musicTimer ? musicSong : null;
  stopMusic();
  try { audioCtx && audioCtx.close(); } catch (e) {}
  audioCtx = null;
  musicGain = null;
  noiseBuf = null;
  audioReady();
  watchAudio();
  if (wasSong) startMusic(wasSong);
}
window.audioReset = audioReset;
let watchedCtx = null;
function watchAudio() {
  if (!audioCtx || watchedCtx === audioCtx) return;
  watchedCtx = audioCtx;
  audioCtx.onstatechange = () => {
    if (!audioCtx || document.hidden) return;
    if (audioCtx.state === "interrupted" || audioCtx.state === "suspended")
      audioCtx.resume().catch(() => {});
  };
}
setInterval(() => {
  if (document.hidden || !audioCtx) return;
  watchAudio();
  // the clock stops moving when iOS has taken the sound away without saying so
  const t = audioCtx.currentTime;
  if (audioCtx.state === "running" && t === watchAudio.lastT && (state === "running" || state === "bonus")) audioReset();
  watchAudio.lastT = t;
  if (audioCtx.state !== "running" && (state === "running" || state === "bonus")) audioCtx.resume().catch(() => {});
}, 1500);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (state === "running") $("pause").onclick();
    stopMusic();
    if (audioCtx && audioCtx.state === "running")
      audioCtx.suspend().catch(() => {});
  }
});
let settingsFrom = "menu",
  resetArmed = false;
function showSettings() {
  if (state === "paused" || state === "menu") settingsFrom = state;
  state = "settings";
  resetArmed = false;
  $("overlay").classList.remove("hidden");
  $("levels").classList.remove("on");
  setArt("gear");
  $("eyebrow").textContent = "SETTINGS";
  $("message").textContent = "GAME OPTIONS";
  $("details").textContent =
    "Sound plays through the ringer. If you hear nothing, check the Silent switch and volume.";
  $("menuExtra").style.display = "none";
  $("menuSettings").style.display = "none";
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("go").textContent = "BACK";
  $("go").onclick = () => {
    hidePanels();
    if (settingsFrom === "paused") {
      state = "running";
      $("pause").onclick();
    } else showMenu();
  };
  renderOptions();
  $("opts").classList.add("on");
}
function renderOptions() {
  const rows = [
    [
      "Sound effects",
      settings.sfx ? "ON" : "OFF",
      settings.sfx,
      () => {
        settings.sfx = !settings.sfx;
        soundOn = settings.sfx;
        if (soundOn) {
          audioReady();
          sfx("power");
        }
      },
    ],
    [
      "Music",
      settings.radio === "mine" ? "MY MUSIC" : settings.music ? "GAME" : "OFF",
      settings.radio !== "off",
      () => {
        if (window.RadioUI) return RadioUI.open();
        settings.music = !settings.music;
        settings.radio = settings.music ? "game" : "off";
        if (settings.music && settingsFrom !== "paused") {
          audioReady();
        } else stopMusic();
      },
    ],
    [
      "Vibration",
      settings.haptics ? "ON" : "OFF",
      settings.haptics,
      () => {
        settings.haptics = !settings.haptics;
        buzz("medium");
        if (
          !(
            window.Capacitor &&
            Capacitor.isNativePlatform &&
            Capacitor.isNativePlatform()
          ) &&
          !navigator.vibrate
        )
          $("details").textContent =
            "In the iPhone browser, vibration only works on taps (iOS 18 or newer). The App Store version vibrates on crashes and wins too.";
      },
    ],
    [
      "Difficulty",
      DIFF[settings.difficulty].label,
      true,
      () => {
        const o = ["easy", "normal", "hard"];
        settings.difficulty = o[(o.indexOf(settings.difficulty) + 1) % 3];
        $("details").textContent = {
          easy: "EASY: slower game, slower magnet.",
          normal: "NORMAL: regular speed, one overhead magnet.",
          hard: "HARD: faster game and a SECOND magnet on the rail. Flying gets risky!",
        }[settings.difficulty];
      },
    ],
    [
      "Jump buttons",
      settings.layout === "one" ? "ONE BIG" : "TWO",
      true,
      () => {
        settings.layout = settings.layout === "one" ? "two" : "one";
        applyLayout();
      },
    ],
    [
      "Next level",
      settings.startMode === "auto" ? "START RIGHT AWAY" : "TAP TO START",
      true,
      () => {
        settings.startMode = settings.startMode === "auto" ? "tap" : "auto";
        $("details").textContent =
          settings.startMode === "auto"
            ? "START RIGHT AWAY: each level begins as soon as it loads."
            : "TAP TO START: each level waits until you tap, so you can get ready.";
      },
    ],
    [
      "Cloud save",
      window.SaveSync
        ? SaveSync.cloud
          ? "iCLOUD ON"
          : SaveSync.status.toUpperCase()
        : "THIS DEVICE",
      !!(window.SaveSync && SaveSync.cloud),
      () => {
        $("details").textContent =
          window.SaveSync && SaveSync.cloud
            ? "Your coins, finishes and progress back up to iCloud and come back on any iPhone signed in to the same Apple ID."
            : window.SaveSync && SaveSync.native
              ? "Saved on this iPhone. Sign in to iCloud in iPhone Settings to back up and sync your progress."
              : "Saved in this browser.";
      },
    ],
    [
      "Privacy policy",
      "OPEN",
      false,
      () =>
        window.open(
          "https://honestechceo.github.io/10mm/privacy.html",
          "_blank",
        ),
    ],
    ...(window.Monetize && Monetize.native
      ? [
          [
            "Remove ads",
            Monetize.adsRemoved
              ? "REMOVED"
              : Monetize.paying
                ? "…"
                : Monetize.price,
            Monetize.adsRemoved,
            async () => {
              if (Monetize.adsRemoved || Monetize.paying) return;
              $("details").textContent = "Opening the App Store…";
              const r = await Monetize.buyRemoveAds();
              if (!r.skip) {
                $("details").textContent = r.msg;
                toast(r.msg, r.ok);
              }
              renderOptions();
            },
          ],
          [
            "Restore purchase",
            Monetize.paying ? "…" : "RESTORE",
            false,
            async () => {
              if (Monetize.paying) return;
              $("details").textContent = "Checking the App Store…";
              const r = await Monetize.restore();
              if (!r.skip) {
                $("details").textContent = r.msg;
                toast(r.msg, r.ok);
              }
              renderOptions();
            },
          ],
          ["Ad privacy", "CHOICES", false, () => Monetize.privacy()],
        ]
      : []),
    [
      "Progress",
      resetArmed ? "TAP TO CONFIRM" : "RESET",
      false,
      () => {
        if (!resetArmed) {
          resetArmed = true;
          return;
        }
        resetProgress();
      },
      "danger",
    ],
  ];
  const box = $("opts");
  box.innerHTML = "";
  for (const [label, value, on, act, cls] of rows) {
    const row = document.createElement("div");
    row.className = "opt";
    const span = document.createElement("span");
    span.textContent = label;
    const b = document.createElement("button");
    b.textContent = value;
    b.className = cls || (on ? "on" : "");
    if (
      window.Monetize &&
      Monetize.paying &&
      (label === "Remove ads" || label === "Restore purchase")
    )
      b.disabled = true;
    b.onclick = (e) => {
      e.preventDefault();
      if (b.disabled) return;
      act();
      saveSettings();
      renderOptions();
    };
    row.append(span, b);
    box.append(row);
  }
}
function resetProgress() {
  for (const k of [
    "tenmm-escape-current",
    "tenmm-escape-best",
    "tenmm-coins",
    "tenmm-score",
    "tenmm-story",
    "tenmm-tutorial",
  ])
    localStorage.removeItem(k);
  level = 1;
  best = 1;
  totalCoins = 0;
  totalScore = 0;
  storySeen = false;
  tutorialSeen = false;
  resetArmed = false;
  settingsFrom = "menu";
  createLevel();
  render();
  $("details").textContent = "Progress reset. You are back at level 1.";
  buzz("heavy");
}

const SKINS = [
  { id: "chrome", name: "Shop Chrome", price: 0 },
  { id: "rusty", name: "Junkyard Rust", price: 100 },
  { id: "black", name: "Black Impact", price: 150 },
  { id: "candy", name: "Candy Red", price: 250 },
  { id: "gold", name: "24K Gold", price: 400 },
  { id: "neon", name: "Neon Blue", price: 600 },
  { id: "purple", name: "Finder's Purple", price: 0, bonus: 3 },
  { id: "champ", name: "Daily Champ", price: 0, lock: "7-DAY DAILY STREAK" },
  { id: "afterburner", name: "Afterburner", price: 0, lock: "ENDLESS: RUN 1000 M" },
  { id: "diamond", name: "Diamond Finder", price: 0, bonus: 6 },
  { id: "santa", name: "Santa Socket", price: 300, holiday: [12, 1, 12, 31] },
  {
    id: "candycane",
    name: "Candy Cane",
    price: 300,
    holiday: [11, 25, 12, 31],
  },
  { id: "valentine", name: "Sweetheart", price: 300, holiday: [2, 1, 2, 14] },
  {
    id: "shamrock",
    name: "Lucky Shamrock",
    price: 300,
    holiday: [3, 1, 3, 17],
  },
  { id: "easter", name: "Easter Egg", price: 300, holiday: [3, 20, 4, 30] },
  { id: "usa", name: "Stars & Stripes", price: 300, holiday: [6, 20, 7, 10] },
  {
    id: "pumpkin",
    name: "Jack-o-Lantern",
    price: 300,
    holiday: [10, 1, 10, 31],
  },
  { id: "turkey", name: "Turkey Day", price: 300, holiday: [11, 1, 11, 30] },
];
function inSeason(sk) {
  if (!sk.holiday) return false;
  const d = new Date(),
    v = (d.getMonth() + 1) * 100 + d.getDate(),
    [m1, d1, m2, d2] = sk.holiday;
  return v >= m1 * 100 + d1 && v <= m2 * 100 + d2;
}
function skinPrice(sk) {
  return inSeason(sk) ? Math.round(sk.price / 2) : sk.price;
}
function skinFile(id) {
  return "socket-" + id + ".webp";
}
function ownedSkins() {
  try {
    const o = JSON.parse(localStorage.getItem("tenmm-skins") || '["chrome"]');
    return Array.isArray(o) ? o : ["chrome"];
  } catch (e) {
    return ["chrome"];
  }
}
function equippedSkin() {
  const e = localStorage.getItem("tenmm-skin") || "chrome";
  return ownedSkins().includes(e) ? e : "chrome";
}
function skinSrc() {
  return skinFile(equippedSkin());
}
function applySkin() {
  if (heroSprites && heroSprites.socket) heroSprites.socket.src = skinSrc();
  loadRollingSkin(equippedSkin());
}
loadRollingSkin(equippedSkin());
function showShop() {
  state = "shop";
  $("overlay").classList.remove("hidden");
  $("opts").classList.remove("on");
  $("levels").classList.remove("on");
  setArt("hero");
  $("eyebrow").textContent = "SOCKET SHOP";
  $("message").textContent = "PICK YOUR 10MM";
  $("details").textContent =
    "You have " +
    totalCoins +
    " coins. Grab coins in every level to unlock new finishes.";
  $("menuExtra").style.display = "none";
  $("menuSettings").style.display = "none";
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("go").textContent = "BACK";
  $("go").onclick = showMenu;
  renderShop();
  $("shop").classList.add("on");
}
function renderShop() {
  const box = $("shop"),
    own = ownedSkins(),
    eq = equippedSkin();
  box.innerHTML = "";
  const list = [
    ...SKINS.filter((k) => !k.holiday),
    ...SKINS.filter((k) => k.holiday && inSeason(k)),
    ...SKINS.filter((k) => k.holiday && !inSeason(k)),
  ];
  let headed = false;
  for (const sk of list) {
    if (sk.holiday && !headed) {
      headed = true;
      const hd = document.createElement("div");
      hd.className = "lvhead";
      hd.textContent = "HOLIDAY FINISHES";
      box.append(hd);
    }
    const price = skinPrice(sk);
    const card = document.createElement("div");
    card.className = "skin" + (sk.id === eq ? " eq" : "");
    const im = document.createElement("img");
    im.src = skinFile(sk.id);
    im.alt = sk.name;
    const nm = document.createElement("div");
    nm.textContent = sk.name;
    const b = document.createElement("button");
    if (sk.id === eq) {
      b.textContent = "EQUIPPED";
      b.className = "own";
      b.disabled = true;
    } else if (own.includes(sk.id)) {
      b.textContent = "EQUIP";
      b.className = "own";
      b.onclick = () => {
        localStorage.setItem("tenmm-skin", sk.id);
        applySkin();
        setArt("hero");
        buzz("light");
        renderShop();
      };
    } else if (sk.bonus || sk.lock) {
      b.textContent = sk.lock || "WIN " + sk.bonus + " BONUS ROUNDS";
      b.className = "no";
      b.disabled = true;
    } else if (totalCoins >= price) {
      b.textContent = "BUY • " + price;
      b.className = "buy";
      b.onclick = () => {
        totalCoins -= price;
        localStorage.setItem("tenmm-coins", totalCoins);
        own.push(sk.id);
        localStorage.setItem("tenmm-skins", JSON.stringify(own));
        localStorage.setItem("tenmm-skin", sk.id);
        applySkin();
        setArt("hero");
        $("coinsCount").textContent = totalCoins;
        $("details").textContent =
          "Unlocked " + sk.name + "! You have " + totalCoins + " coins left.";
        sfx("win");
        buzz("success");
        renderShop();
      };
    } else {
      b.textContent = price + " COINS";
      b.className = "no";
      b.disabled = true;
    }
    card.append(im, nm);
    if (inSeason(sk)) {
      const tg = document.createElement("div");
      tg.className = "tag";
      tg.textContent = "IN SEASON -50%";
      card.append(tg);
    }
    card.append(b);
    box.append(card);
  }
}
function showLevels() {
  state = "levels";
  $("overlay").classList.remove("hidden");
  $("opts").classList.remove("on");
  setArt("map");
  $("eyebrow").textContent = "LEVEL SELECT";
  $("message").textContent = "PICK A GARAGE";
  $("details").textContent =
    "Replay any level you have unlocked (" + best + " of " + MAX_LEVEL + ").";
  $("menuExtra").style.display = "none";
  $("menuSettings").style.display = "none";
  $("menuLevels").style.display = "none";
  $("menuShop").style.display = "none";
  $("go").textContent = "BACK";
  $("go").onclick = showMenu;
  const box = $("levels");
  box.innerHTML = "";
  const frag = document.createDocumentFragment();
  for (let n = 1; n <= MAX_LEVEL; n++) {
    if ((n - 1) % 25 === 0) {
      const hd = document.createElement("div");
      hd.className = "lvhead";
      hd.textContent = themeOf(n).name;
      frag.append(hd);
    }
    const b = document.createElement("button");
    b.textContent = n;
    if (window.FX) FX.decorateLevelButton(b, n);
    b.disabled = n > best;
    if (n === level) b.className = "cur";
    b.onclick = () => {
      level = n;
      try {
        localStorage.setItem("tenmm-escape-current", n);
      } catch (e) {}
      storySeen = true;
      tutorialSeen = true;
      start();
    };
    frag.append(b);
  }
  box.append(frag);
  box.classList.add("on");
  const cur =
    box.querySelectorAll("button")[Math.max(0, Math.min(best, level) - 1)];
  if (cur) cur.scrollIntoView({ block: "center" });
}

function fitCanvas() {
  const stage = document.querySelector(".stage"),
    bt = document.querySelector(".buttons");
  if (!stage || !bt) return;
  const w = canvas.clientWidth || stage.clientWidth - 8;
  const top = canvas.getBoundingClientRect().top,
    bottom = bt.getBoundingClientRect().top;
  const avail = bottom - top - 50;
  if (!w || avail < 120) return;
  let h = Math.max(300, Math.min(980, Math.floor((600 * avail) / w)));
  if (h !== CH) {
    CH = h;
    OFF = CH - 460;
    canvas.height = CH;
  }
  canvas.style.height = Math.floor((w * CH) / 600) + "px";
  render();
}
window.addEventListener("resize", fitCanvas);
if (window.ResizeObserver)
  new ResizeObserver(() => requestAnimationFrame(fitCanvas)).observe(
    document.querySelector("main"),
  );
window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 250));
createLevel();
showMenu.intro = true;
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", () => showMenu());
else showMenu();
fitCanvas();
requestAnimationFrame(fitCanvas);
