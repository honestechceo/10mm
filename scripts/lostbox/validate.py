# Reachability check for every Lost Toolbox level, using the SAME physics as lt/lostbox.js.
# For each standable surface it simulates real jumps (single, double at several timings,
# walk-offs, both directions, several take-off spots) and records which surfaces they land on.
# Then it checks: exit + every checkpoint reachable from start, and exit reachable from every
# surface you can reach (no soft-locks). Moving platforms are sampled at both ends and middle.
import sys, math
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from levels import LEVELS

T = 48
P = dict(MAXV=260, ACC=1900, ACC_AIR=1300, G_HOLD=1500, G=2600, JUMP=640, DJUMP=560, MAXFALL=1000, SPRING=1050)
PW, PH = 30, 44
SOLID = set('#=CU?RSD<>')       # full solids
ONEWAY = set('-')                # semisolid: land from above only
DT = 1 / 120

def solid_at(grid, cx, cy, extra):
    if cy < 0: return None
    if cy >= len(grid) or cx < 0 or cx >= len(grid[0]): return None
    ch = grid[cy][cx]
    if ch in SOLID: return 'S'
    if ch in ONEWAY: return 'O'
    return None

def sim(grid, movers, x, y, vx_dir, double_at, start_vy, walk=False):
    """x = player center, y = feet. returns landing point (x, y, surface id) or None (pit)."""
    vx = vx_dir * P['MAXV']; vy = start_vy; t = 0; held = True; jumped_twice = False
    for step in range(int(4 / DT)):
        t += DT
        if double_at is not None and not jumped_twice and t >= double_at:
            vy = -P['DJUMP']; jumped_twice = True; held = True
        g = P['G_HOLD'] if (held and vy < 0) else P['G']
        vy = min(P['MAXFALL'], vy + g * DT)
        # horizontal: keep holding the direction, re-accelerate after bumping a wall
        if vx_dir: vx = max(-P['MAXV'], min(P['MAXV'], vx + vx_dir * P['ACC_AIR'] * DT))
        nx = x + vx * DT
        top, bot = y - PH, y - 1
        hit = False
        for cy in range(int(top // T), int(bot // T) + 1):
            edge = nx + vx_dir * PW / 2
            if solid_at(grid, int(edge // T), cy, movers) == 'S': hit = True
        if hit: vx = 0
        else: x = nx
        # vertical
        ny = y + vy * DT
        if vy < 0:
            for cx in range(int((x - PW / 2 + 1) // T), int((x + PW / 2 - 1) // T) + 1):
                if solid_at(grid, cx, int((ny - PH) // T), movers) == 'S':
                    vy = 0; ny = y; break
        else:
            landed = None
            for cx in range(int((x - PW / 2 + 1) // T), int((x + PW / 2 - 1) // T) + 1):
                r0, r1 = int(y // T), int(ny // T)
                for cy in range(r0, r1 + 1):
                    k = solid_at(grid, cx, cy, movers)
                    if k and cy * T >= y - 0.01 and cy * T <= ny:
                        if landed is None or cy * T < landed: landed = cy * T
            for m in movers:   # moving platform samples act as one-way tops
                if m['x0'] <= x <= m['x1'] and y <= m['y'] <= ny: landed = m['y'] if landed is None else min(landed, m['y'])
            if landed is not None and t > 0.02:
                return (x, landed)
        y = ny
        if y > len(grid) * T + 200: return None
    return None

def surfaces(grid, movers):
    S = []
    H, W = len(grid), len(grid[0])
    for cy in range(H):
        x = 0
        while x < W:
            def ok(cx):
                ch = grid[cy][cx]
                above = grid[cy - 1][cx] if cy > 0 else '.'
                return (ch in SOLID or ch in ONEWAY) and above not in SOLID and above not in 'P'
            if ok(x):
                x0 = x
                while x < W and ok(x): x += 1
                S.append(dict(x0=x0 * T, x1=x * T, y=cy * T, kind='tile', cols=(x0, x)))
            else:
                x += 1
    for i, m in enumerate(movers):
        S.append(dict(x0=m['x0'], x1=m['x1'], y=m['y'], kind='mover', group=m['group']))
    return S

def build_movers(l):
    out = []
    g = l.text()
    for x, y, kw in l.ext:
        ch = g[y][x]
        if ch == 'L':
            for f in (0, 0.5, 1):
                yy = (y + 1) * T - f * kw['dy'] * T - 0  # platform top when lowered = row bottom? top of cell y+1
                out.append(dict(x0=x * T - 8, x1=(x + 2) * T + 8, y=(y + 1) * T - 12 - f * kw['dy'] * T, group=('L', x, y)))
        if ch == 'M':
            for f in (0, 0.5, 1):
                xx = x * T + f * kw['dx'] * T
                out.append(dict(x0=xx - 8, x1=xx + 2 * T + 8, y=(y + 1) * T - 12, group=('M', x, y)))
    return out

def check(l):
    g = l.text()
    # springs launch: mark positions
    springs = [(x, y) for y, r in enumerate(g) for x, c in enumerate(r) if c == 'Z']
    movers = build_movers(l)
    S = surfaces(g, movers)
    def which(pt):
        x, y = pt
        best = None
        for i, s in enumerate(S):
            if abs(s['y'] - y) < 1 and s['x0'] - 16 <= x <= s['x1'] + 16: best = i
        return best
    edges = {i: set() for i in range(len(S))}
    for i, s in enumerate(S):
        if s['kind'] == 'mover':
            for j, t in enumerate(S):
                if t.get('group') == s.get('group') and j != i: edges[i].add(j)
        spots = sorted(set([s['x0'] + PW / 2 + 1, s['x1'] - PW / 2 - 1] + [s['x0'] + k * T / 2 for k in range(1, int((s['x1'] - s['x0']) / (T / 2)))]))
        for x in spots:
            for d in (-1, 1, 0):
                jv = -P['JUMP']
                on_spring = any(abs((sx + .5) * T - x) < T * .8 and (sy + 1) * T == s['y'] for sx, sy in springs)
                if on_spring: jv = -P['SPRING']
                for da in (None, 0.12, 0.25, 0.35, 0.45, 0.6):
                    if d == 0 and da not in (None, 0.35): continue
                    r = sim(g, movers, x, s['y'], d, da, jv)
                    if r is not None:
                        j = which(r)
                        if j is not None: edges[i].add(j)
            # walk off the edges
        for x, d in ((s['x0'] - 1, -1), (s['x1'] + 1, 1)):
            for da in (None, 0.2):
                r = sim(g, movers, x, s['y'], d, da, 0)
                if r is not None:
                    j = which(r)
                    if j is not None: edges[i].add(j)
    def find(ch):
        pts = [(x, y) for y, r in enumerate(g) for x, c in enumerate(r) if c == ch]
        res = []
        for (x, y) in pts:
            k = None
            for i, s in enumerate(S):
                if s['kind'] == 'tile' and s['y'] == (y + 1) * T and s['cols'][0] <= x < s['cols'][1]: k = i
            res.append(((x, y), k))
        return res
    start = find('@')[0][1]
    goal = find('X')[0][1]
    seen = {start}; q = [start]
    while q:
        i = q.pop()
        for j in edges[i]:
            if j not in seen: seen.add(j); q.append(j)
    ok = True
    if goal not in seen: print('  !! exit NOT reachable'); ok = False
    for (pt, k) in find('!'):
        if k not in seen: print('  !! checkpoint', pt, 'not reachable'); ok = False
    # soft-lock: every reachable surface must reach the goal (pits respawn, so falling is fine)
    rev = {i: set() for i in edges}
    for i in edges:
        for j in edges[i]: rev[j].add(i)
    good = {goal}; q = [goal]
    while q:
        j = q.pop()
        for i in rev[j]:
            if i not in good: good.add(i); q.append(i)
    stuck = [S[i] for i in seen if i not in good]
    for s in stuck:
        if s['kind'] == 'tile': print('  !! can get stuck on surface cols', s['cols'], 'row', s['y'] // T); ok = False
    unreached = [S[i]['cols'] for i in range(len(S)) if i not in seen and S[i]['kind'] == 'tile' and S[i]['y'] < 12 * T]
    print(f"  surfaces {len(S)} reachable {len(seen)}  unreached tile surfaces: {unreached[:12]}")
    return ok

if __name__ == '__main__':
    allok = True
    for l in LEVELS:
        print(l.name)
        allok &= check(l)
    print('ALL OK' if allok else 'PROBLEMS FOUND')
