# Builds the 5 Lost Toolbox levels as ASCII grids and writes lt/levels.js.
# Grid: 13 rows (0 = top, 12 = bottom). Ground surface is row 11 unless raised/lowered.
import json, sys

ROWS = 13

class L:
    def __init__(self, name, cols, bg, music):
        self.name, self.cols, self.bg, self.music = name, cols, bg, music
        self.g = [['.'] * cols for _ in range(ROWS)]
        self.ext = []  # extra params for movers: (x, y, dict)
    def put(self, x, y, ch):
        if 0 <= x < self.cols and 0 <= y < ROWS: self.g[y][x] = ch
    def floor(self, x0, x1, top=11, ch='#'):
        for x in range(x0, x1):
            for y in range(top, ROWS): self.put(x, y, ch)
    def pit(self, x0, x1):
        for x in range(x0, x1):
            for y in range(ROWS):
                if self.g[y][x] in '#': self.g[y][x] = '.'
    def row(self, x0, x1, y, ch):
        for x in range(x0, x1): self.put(x, y, ch)
    def coins(self, x0, x1, y):
        self.row(x0, x1, y, 'o')
    def arc(self, x0, n, y):
        for i in range(n):
            d = abs(i - (n - 1) / 2)
            self.put(x0 + i, y - (1 if d < n / 4 else 0), 'o')
    def mover(self, x, y, ch, **kw):
        self.put(x, y, ch); self.ext.append([x, y, kw])
    def text(self):
        return [''.join(r) for r in self.g]


def level1():
    l = L('GARAGE ESCAPE', 112, 'garage', 'garage')
    l.floor(0, 112)
    l.put(2, 10, '@')
    l.coins(6, 10, 10)
    l.put(12, 10, 'P')                     # first oil pan: hop it
    l.row(15, 18, 8, '?'); l.put(16, 8, 'U')   # power-up block (shield)
    l.ext.append([16, 8, {'pu': 'shield'}])
    l.put(21, 10, 'D')                     # drum to hop
    l.pit(25, 27)                          # 2-tile pit
    l.arc(24, 4, 8)
    l.row(30, 34, 8, '-'); l.coins(30, 34, 7)   # first raised bench
    l.put(36, 10, 'D'); l.put(37, 10, 'D'); l.put(37, 9, 'D')
    l.put(41, 10, 'T')                     # rolling tire
    l.put(45, 10, 'P')
    l.put(48, 10, '!')                     # checkpoint
    l.pit(52, 55)                          # 3 wide, single jump with run
    l.coins(52, 55, 8)
    l.row(57, 60, 7, 'C')                  # crates (bonk from below)
    l.put(61, 8, 'H')                      # hidden block
    l.put(63, 10, 'P')
    # staircase up and down
    for i in range(4): l.floor(66 + i, 67 + i, 10 - i)
    l.floor(70, 74, 7)
    l.coins(70, 74, 6)
    l.pit(74, 77)
    l.floor(77, 80, 9)
    l.put(84, 10, 'T')
    l.row(87, 90, 8, '-'); l.put(88, 7, 'o'); l.put(89, 7, 'o')
    l.put(92, 10, 'P'); l.put(93, 10, 'P')
    l.coins(96, 102, 10)
    l.put(106, 10, 'X')                    # exit drawer (2 wide)
    return l


def level2():
    l = L('LIFT BAY MAYHEM', 140, 'servicecenter', 'service')
    l.floor(0, 140)
    l.put(2, 10, '@')
    l.coins(5, 9, 10)
    l.pit(11, 16)
    l.mover(12, 10, 'M', dx=3, speed=60)   # moving platform across first pit
    l.put(19, 10, 'T')
    l.floor(23, 27, 9); l.put(24, 8, 'U'); l.ext.append([24, 8, {'pu': 'spring'}])
    l.pit(28, 34)
    l.mover(29, 9, 'L', dy=4, speed=55)    # lift goes up and down
    l.mover(32, 7, 'L', dy=3, speed=65, phase=0.5)
    l.floor(34, 38, 8)
    l.coins(34, 38, 7)
    l.put(40, 10, 'J')                     # floor jack patrol
    l.put(44, 10, 'T')
    l.row(47, 50, 8, '='); l.row(51, 54, 6, '=')
    l.coins(51, 54, 5)
    l.put(56, 10, '!')
    l.pit(59, 66)
    l.mover(60, 10, 'M', dx=4, speed=70)
    l.arc(60, 5, 7)
    l.row(68, 72, 10, '>')                 # conveyor
    l.put(74, 10, 'T'); l.put(78, 10, 'T')
    l.pit(81, 84)
    l.floor(84, 88, 9)
    l.pit(88, 96)
    l.mover(89, 9, 'L', dy=4, speed=60)
    l.mover(92, 6, 'M', dx=2, speed=60)
    l.floor(96, 100, 7); l.put(97, 6, 'U'); l.ext.append([97, 6, {'pu': 'speed'}])
    l.put(101, 10, 'J')
    l.put(104, 10, '!')
    l.row(108, 112, 10, '<')
    l.pit(113, 118); l.put(114, 9, 'Z')     # spring in pit? no: spring on a post
    l.floor(114, 115, 10)
    l.row(116, 120, 6, '='); l.coins(116, 120, 5)
    l.floor(118, 140)
    l.put(122, 10, 'J'); l.put(126, 10, 'T')
    l.coins(128, 132, 10)
    l.put(134, 10, 'X')
    return l


def level3():
    l = L('PARTS DEPARTMENT PANIC', 168, 'partsstore', 'parts')
    l.floor(0, 168)
    l.put(2, 10, '@')
    l.row(6, 10, 7, 'C'); l.put(8, 7, 'U'); l.ext.append([8, 7, {'pu': 'magnet'}])
    l.put(13, 10, 'D'); l.put(14, 10, 'D'); l.put(14, 9, 'D'); l.put(15, 10, 'D'); l.put(15, 9, 'D'); l.put(15, 8, 'D')
    l.put(18, 2, 'f')                      # falling parts
    l.put(21, 2, 'f')
    l.put(24, 10, 'k')                     # rolling tool cart
    l.pit(28, 32)
    l.arc(28, 4, 8)
    l.floor(32, 36, 9)
    l.row(37, 41, 7, '-'); l.coins(37, 41, 6)
    l.row(42, 46, 5, '-'); l.put(44, 4, 'H'); l.put(43, 4, 'o'); l.put(45, 4, 'o')
    l.put(40, 10, 'K')
    l.put(48, 2, 'f')
    l.put(51, 10, '!')
    l.row(54, 58, 8, 'C'); l.put(56, 4, 'H'); l.put(57, 4, 'H')
    l.put(60, 10, 'k'); l.put(66, 10, 'k')
    l.pit(70, 75)
    l.mover(71, 9, 'M', dx=2, speed=70)
    l.floor(75, 78, 8)
    l.pit(78, 83)
    l.floor(83, 86, 7)
    l.coins(83, 86, 6)
    l.pit(86, 90)
    l.floor(90, 100, 11)
    l.put(92, 2, 'f'); l.put(95, 2, 'f'); l.put(98, 2, 'f')
    l.put(101, 10, '!')
    l.row(104, 107, 8, '?'); l.put(105, 8, 'U'); l.ext.append([105, 8, {'pu': 'slow'}])
    l.put(108, 10, 'K'); l.put(113, 10, 'k')
    for i in range(5): l.floor(117 + i, 118 + i, 10 - i)
    l.pit(122, 127)
    l.floor(127, 131, 6)
    l.coins(127, 131, 5)
    l.pit(131, 135)
    l.floor(135, 168, 11)
    l.row(138, 142, 8, 'C'); l.put(144, 10, 'K'); l.put(148, 2, 'f'); l.put(151, 2, 'f')
    l.put(153, 10, 'k')
    l.coins(155, 160, 10)
    l.put(162, 10, 'X')
    return l


def level4():
    l = L('ENGINE ROOM CHAOS', 196, 'engineshop', 'engine')
    l.floor(0, 196)
    l.put(2, 10, '@')
    l.put(8, 10, 'p'); l.put(12, 10, 'p')    # pistons pump up and down
    l.coins(9, 12, 7)
    l.pit(16, 21)
    l.floor(21, 25, 9)
    l.mover(19, 3, 'c', len=3)               # swinging chain over pit approach
    l.put(27, 9, 'g')                        # spinning gear
    l.pit(30, 36)
    l.mover(31, 9, 'L', dy=4, speed=75)
    l.floor(36, 40, 7)
    l.put(38, 6, 'U'); l.ext.append([38, 6, {'pu': 'shield'}])
    l.pit(40, 46)
    l.floor(46, 49, 8)
    l.put(51, 10, 'p'); l.put(54, 10, 'p'); l.put(57, 10, 'p')
    l.mover(55, 3, 'c', len=4, phase=0.5)
    l.put(60, 10, '!')
    l.row(63, 67, 10, '>'); l.put(66, 7, 'g')
    l.pit(68, 74)
    l.mover(69, 9, 'M', dx=3, speed=85)
    l.floor(74, 77, 9)
    l.pit(77, 82)
    l.floor(82, 85, 7)
    l.pit(85, 90)
    l.floor(90, 93, 8)
    l.mover(88, 2, 'c', len=4)
    l.put(95, 10, 'J'); l.put(99, 10, 'p')
    l.put(103, 10, '!')
    l.row(106, 110, 8, '-'); l.row(111, 115, 6, '-'); l.row(116, 120, 4, '-')
    l.coins(116, 120, 3)
    l.put(113, 9, 'g')
    l.pit(121, 128)
    l.mover(122, 4, 'M', dx=4, speed=80)
    l.floor(128, 132, 8)
    l.put(134, 10, 'p'); l.put(137, 10, 'p'); l.mover(136, 3, 'c', len=4, phase=0.3)
    l.put(141, 10, '!')
    l.pit(144, 150)
    l.mover(145, 9, 'L', dy=5, speed=80)
    l.floor(150, 154, 6); l.put(152, 3, 'g')
    l.pit(154, 160)
    l.mover(155, 6, 'M', dx=3, speed=90)
    l.floor(160, 196, 11)
    l.put(164, 10, 'J'); l.put(168, 10, 'p'); l.put(172, 9, 'g'); l.put(176, 10, 'p')
    l.coins(180, 186, 10)
    l.put(190, 10, 'X')
    return l


def level5():
    l = L('MASTER TOOLBOX', 236, 'evtech', 'master')
    l.floor(0, 236)
    l.put(2, 10, '@')
    l.put(7, 10, 'P'); l.put(11, 10, 'T')
    l.pit(15, 19); l.arc(15, 4, 8)
    l.put(22, 10, 'p'); l.put(26, 9, 'g')
    l.pit(29, 35); l.mover(30, 9, 'L', dy=4, speed=80)
    l.floor(35, 39, 7); l.put(37, 6, 'U'); l.ext.append([37, 6, {'pu': 'shield'}])
    l.pit(39, 43)
    l.put(44, 2, 'f'); l.put(47, 2, 'f')
    l.put(49, 10, 'k')
    l.put(53, 10, '!')
    l.row(56, 60, 10, '>'); l.put(62, 10, 'K'); l.mover(64, 3, 'c', len=4)
    l.pit(67, 73); l.mover(68, 9, 'M', dx=3, speed=90)
    l.floor(73, 77, 8)
    l.put(79, 10, 'p'); l.put(82, 10, 'p')
    l.put(86, 10, '!')
    # magnet chase: from here a giant magnet chases from the left until the gate
    l.put(88, 10, 'W')
    l.coins(90, 96, 10)
    l.put(97, 10, 'P')
    l.pit(100, 104)
    l.floor(104, 108, 9)
    l.pit(108, 112)
    l.put(114, 10, 'T'); l.put(118, 10, 'D'); l.put(119, 10, 'D'); l.put(119, 9, 'D')
    l.pit(122, 126)
    l.put(130, 10, 'p'); l.put(133, 9, 'g')
    l.row(136, 140, 8, '-'); l.pit(137, 141)
    l.floor(141, 144, 10)
    l.put(146, 10, 'w')                      # chase ends
    l.put(148, 10, '!')
    l.row(151, 155, 7, '?'); l.put(153, 7, 'U'); l.ext.append([153, 7, {'pu': 'speed'}])
    l.pit(157, 164); l.mover(158, 9, 'L', dy=4, speed=85); l.mover(161, 6, 'M', dx=2, speed=80)
    l.floor(164, 168, 7)
    l.pit(168, 173)
    l.floor(173, 176, 8)
    l.put(178, 10, 'J'); l.put(182, 10, 'k'); l.put(186, 2, 'f'); l.put(189, 2, 'f')
    l.put(192, 10, '!')
    l.put(195, 10, 'p'); l.put(198, 10, 'p'); l.mover(197, 3, 'c', len=4, phase=0.5)
    l.pit(202, 208); l.mover(203, 9, 'L', dy=5, speed=90)
    l.floor(208, 212, 6); l.coins(208, 212, 5)
    l.pit(212, 216)
    l.floor(216, 236, 11)
    l.coins(219, 226, 10)
    l.put(229, 10, 'X')                      # golden drawer
    return l


LEVELS = [level1(), level2(), level3(), level4(), level5()]

if __name__ == '__main__':
    out = []
    for l in LEVELS:
        out.append({'name': l.name, 'bg': l.bg, 'music': l.music, 'rows': l.text(), 'ext': l.ext})
    js = '// generated by lt-tools/levels.py — do not hand edit\nwindow.LT_LEVELS = ' + json.dumps(out) + ';\n'
    open(sys.argv[1] if len(sys.argv) > 1 else 'levels.js', 'w').write(js)
    for l in LEVELS:
        print('==', l.name, l.cols)
        for r in l.text(): print(r)
