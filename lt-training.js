// Lost Toolbox TRAINING DRAWER: one short level that teaches the moves by doing them, with a tip
// popping up as you reach each part. Pays no coins. Offered before Drawer 1 the first time.
(() => {
  const W = 114, ROWS = 13;
  const g = Array.from({ length: ROWS }, (_, y) => Array(W).fill(y >= 11 ? "#" : "."));
  const put = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) g[y][x] = c; };
  const pit = (a, b) => { for (let x = a; x < b; x++) for (let y = 0; y < ROWS; y++) if (g[y][x] === "#") g[y][x] = "."; };
  const row = (a, b, y, c) => { for (let x = a; x < b; x++) put(x, y, c); };
  const ext = [];
  put(2, 10, "@");
  row(10, 13, 10, "=");                      // a small step to hop onto
  pit(17, 20); row(16, 21, 8, "o");          // first gap
  for (let y = 7; y <= 10; y++) row(25, 27, y, "="); row(25, 27, 6, "o"); // tall wall: double jump
  row(31, 37, 9, "o");                        // coins
  put(44, 10, "T");                           // a tire to stomp
  row(50, 55, 7, "?"); put(52, 7, "U"); ext.push([52, 7, { pu: "shield" }]); // ? blocks, one power-up
  put(58, 10, "!");                           // checkpoint
  put(64, 10, "e");                           // zapper
  pit(70, 77); row(71, 73, 9, "q"); row(74, 76, 8, "q");   // crumbly ledges over a pit
  pit(80, 88); put(81, 10, "M"); ext.push([81, 10, { dx: 4, speed: 60 }]); row(82, 86, 7, "o"); // moving platform
  // boss arena (same shape as the real drawers)
  const x0 = 94;
  for (let x = x0 - 4; x < W; x++) for (let y = 0; y < ROWS; y++) g[y][x] = y >= 11 ? "#" : ".";
  put(x0 - 2, 10, "!"); row(x0 + 1, x0 + 4, 7, "-"); row(x0 + 8, x0 + 11, 7, "-");
  put(x0 + 6, 10, "B"); ext.push([x0 + 6, 10, { boss: "walker", hp: 2, spd: 0.75, name: "THE PRACTICE FILTER" }]);
  put(x0 + 14, 10, "X");
  const tips = [
    [1, "Hold ▶ to run. Hold ◀ to go back."],
    [7, "Tap JUMP to hop up the step."],
    [14, "Jump the gap! Hold JUMP to jump higher."],
    [22, "Too tall? Tap JUMP again in the air to DOUBLE JUMP."],
    [29, "Grab coins as you go."],
    [39, "Jump on bad guys to STOMP them."],
    [48, "Hit ? blocks from below. This one has a shield inside."],
    [56, "Touch the red flag to save your spot."],
    [61, "Blue strips zap when they spark. Run past between sparks."],
    [67, "Cracked ledges fall when you stand on them. Keep moving!"],
    [78, "Ride the moving platform across."],
    [90, "Every drawer has a boss. Stomp it on the head to open the drawer!"],
  ];
  window.LT_LEVELS = window.LT_LEVELS || [];
  window.LT_LEVELS.push({ name: "TRAINING DRAWER", bg: "garage", music: "garage", rows: g.map((r) => r.join("")), ext, room: null, train: true, tips });
})();
