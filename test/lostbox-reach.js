// Runs inside the game page. For every level: builds the list of standable surfaces, then fires the
// REAL player physics (LostBox._probe) from every take-off spot with single jumps, double jumps at
// several timings, short hops and walk-offs, with lifts/platforms frozen at the ends and middle of
// their paths. Reports whether the exit drawer and every checkpoint can be reached and whether any
// reachable surface is a dead end.
window.__ltReach = function (li) {
  const T = 48, PW = 30;
  const info = LostBox._probeSetup(li), rows = info.rows, W = info.W, M = info.movers;
  const L = window.LT_LEVELS[li].rows;
  const SOLID = "#=CU?RSD<>i", stand = (ch) => SOLID.includes(ch) || ch === "-" || ch === "q";
  const S = [];
  for (let y = 1; y < rows.length; y++) {
    let x = 0;
    while (x < W) {
      const ok = (cx) => stand(rows[y][cx]) && !SOLID.includes(rows[y - 1][cx]);
      if (ok(x)) { const x0 = x; while (x < W && ok(x)) x++; S.push({ x0: x0 * T, x1: x * T, y: y * T, cols: [x0, x] }); } else x++;
    }
  }
  const FR = [0, 0.5, 1];
  M.forEach((m, k) => FR.forEach((f) => S.push({ x0: m.x0 + m.dx * f, x1: m.x0 + m.dx * f + m.w, y: m.y0 - m.dy * f, mover: k, f })));
  const which = (r) => {
    if (r.on >= 0) { let best = -1, bd = 1e9; S.forEach((s, i) => { if (s.mover === r.on) { const d = Math.abs(s.y - r.y) + Math.abs(s.x0 - (r.x - 40)); if (d < bd) { bd = d; best = i; } } }); return best; }
    for (let i = 0; i < S.length; i++) { const s = S[i]; if (s.mover === undefined && Math.abs(s.y - r.y) < 1 && r.x >= s.x0 - 16 && r.x <= s.x1 + 16) return i; }
    return -1;
  };
  const edges = S.map(() => new Set());
  let probes = 0;
  S.forEach((s, i) => {
    if (s.mover !== undefined) S.forEach((o, j) => { if (o.mover === s.mover && j !== i) edges[i].add(j); });
    const spots = [s.x0 + PW / 2 + 1, s.x1 - PW / 2 - 1];
    for (let x = s.x0 + 24; x < s.x1 - 8; x += 24) spots.push(x);
    const frs = s.mover !== undefined ? [M.map((_, k) => (k === s.mover ? s.f : 0)), M.map((_, k) => (k === s.mover ? s.f : 0.5)), M.map((_, k) => (k === s.mover ? s.f : 1))] : [M.map(() => 0), M.map(() => 0.5), M.map(() => 1)];
    for (const fr of frs) {
      for (const x of spots) for (const d of [-1, 0, 1]) for (const da of [null, 0.12, 0.25, 0.35, 0.45, 0.6]) {
        if (d === 0 && da !== null && da !== 0.35) continue;
        probes++;
        const r = LostBox._probe(x, s.y, d, da, -640, fr);
        if (r.ground) { const j = which(r); if (j >= 0) edges[i].add(j); }
      }
      for (const [x, d] of [[s.x0 - 1, -1], [s.x1 + 1, 1]]) for (const da of [null, 0.2]) {
        probes++;
        const r = LostBox._probe(x, s.y, d, da, 1, fr);
        if (r.ground) { const j = which(r); if (j >= 0) edges[i].add(j); }
      }
    }
  });
  const find = (ch) => { const out = []; L.forEach((r, y) => [...r].forEach((c, x) => { if (c === ch) out.push([x, y, S.findIndex((s) => s.mover === undefined && s.y === (y + 1) * T && s.cols[0] <= x && x < s.cols[1])]); })); return out; };
  const start = find("@")[0][2], goals = find("X").map((g) => [g[2], S.findIndex((s) => s.mover === undefined && s.y === (g[1] + 1) * T && s.cols[0] <= g[0] + 1 && g[0] + 1 < s.cols[1])]);
  const seen = new Set([start]), q = [start];
  while (q.length) { const i = q.pop(); for (const j of edges[i]) if (!seen.has(j)) { seen.add(j); q.push(j); } }
  const goal = goals[0][0];
  const problems = [];
  if (!seen.has(goal)) problems.push("exit drawer not reachable");
  for (const c of find("!")) if (!seen.has(c[2])) problems.push("checkpoint at column " + c[0] + " not reachable");
  const rev = S.map(() => new Set()); edges.forEach((e, i) => e.forEach((j) => rev[j].add(i)));
  const good = new Set([goal]), q2 = [goal];
  while (q2.length) { const j = q2.pop(); for (const i of rev[j]) if (!good.has(i)) { good.add(i); q2.push(i); } }
  for (const i of seen) if (!good.has(i) && S[i].mover === undefined) problems.push("dead end on columns " + S[i].cols.join("-") + " row " + S[i].y / T);
  const unreached = S.map((s, i) => [s, i]).filter(([s, i]) => !seen.has(i) && s.mover === undefined).map(([s]) => s.cols.join("-") + "@" + s.y / T);
  return { level: li + 1, surfaces: S.length, reachable: seen.size, probes, problems, unreached };
};
