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
    def arena(self, x0, boss, hp, spd=1.0, name=''):
        # boss fight: checkpoint, a 15-tile arena with two dodge benches, the boss, then the locked drawer
        need = x0 + 20
        if need > self.cols:
            for r in self.g: r.extend(['.'] * (need - self.cols))
            self.cols = need
        for x in range(x0 - 4, self.cols):
            for y in range(ROWS):
                if y >= 11: self.g[y][x] = '#'
                elif x >= x0: self.g[y][x] = '.'
        self.put(x0 - 2, 10, '!')
        self.row(x0 + 1, x0 + 4, 7, '-'); self.row(x0 + 8, x0 + 11, 7, '-')
        self.put(x0 + 6, 10, 'B'); self.ext.append([x0 + 6, 10, {'boss': boss, 'hp': hp, 'spd': spd, 'name': name}])
        self.put(x0 + 14, 10, 'X')
        self.cols = len(self.g[0])
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
    l.put(84, 10, 'T'); l.put(80, 7, 'b')
    l.row(87, 90, 8, '-'); l.put(88, 7, 'o'); l.put(89, 7, 'o')
    l.put(92, 10, 'P'); l.put(93, 10, 'P')
    l.coins(96, 102, 10)
    l.put(103, 8, 'b')
    l.arena(108, 'walker', 2, 0.8, 'THE FILTER FIEND')
    return l


def level2():
    l = L('LIFT BAY MAYHEM', 140, 'servicecenter', 'service')
    l.floor(0, 140)
    l.put(2, 10, '@')
    l.coins(5, 9, 10)
    l.pit(11, 16)
    l.mover(12, 10, 'M', dx=3, speed=60)   # moving platform across first pit
    l.put(19, 10, 'T')
    l.floor(23, 27, 9); l.put(24, 6, 'U'); l.ext.append([24, 6, {'pu': 'spring'}])
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
    l.put(74, 10, 'T'); l.put(78, 10, 'T'); l.put(76, 6, 'b')
    l.pit(81, 84)
    l.floor(84, 88, 9)
    l.pit(88, 96)
    l.mover(89, 9, 'L', dy=4, speed=60)
    l.mover(92, 6, 'M', dx=2, speed=60)
    l.floor(96, 100, 7); l.put(97, 4, 'U'); l.ext.append([97, 4, {'pu': 'speed'}])
    l.put(101, 10, 'J')
    l.put(104, 10, '!')
    l.row(108, 112, 10, '<')
    l.pit(113, 118); l.put(114, 9, 'Z')     # spring in pit? no: spring on a post
    l.floor(114, 115, 10)
    l.row(116, 120, 6, '='); l.coins(116, 120, 5)
    l.floor(118, 140)
    l.put(122, 10, 'J'); l.put(126, 10, 'T'); l.put(124, 6, 'h')
    l.coins(128, 132, 10)
    l.arena(136, 'charger', 3, 1.0, 'JACKHAMMER JACK')
    return l


def level3():
    l = L('PARTS DEPARTMENT PANIC', 168, 'partsstore', 'parts')
    l.floor(0, 168)
    l.put(2, 10, '@')
    l.row(6, 10, 7, 'C'); l.put(8, 7, 'U'); l.ext.append([8, 7, {'pu': 'lucky'}])
    l.put(13, 10, 'D'); l.put(14, 10, 'D'); l.put(14, 9, 'D'); l.put(15, 10, 'D'); l.put(15, 9, 'D'); l.put(15, 8, 'D')
    l.put(18, 2, 'f')                      # falling parts
    l.put(21, 2, 'f')
    l.put(24, 10, 'k')                     # rolling tool cart
    l.pit(28, 32)
    l.arc(28, 4, 8)
    l.floor(32, 36, 9)
    l.row(37, 41, 7, '-'); l.coins(37, 41, 6)
    l.row(42, 46, 5, '-'); l.put(44, 2, 'H'); l.put(43, 3, 'o'); l.put(45, 3, 'o')
    l.put(40, 10, 'K')
    l.put(48, 2, 'f')
    l.put(51, 10, '!')
    l.row(54, 58, 8, 'C'); l.put(56, 4, 'H'); l.put(57, 4, 'H')
    l.put(60, 10, 'k'); l.put(66, 10, 'k'); l.put(63, 4, 'v')
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
    l.row(104, 107, 8, '?'); l.put(105, 8, 'U'); l.ext.append([105, 8, {'pu': 'air'}])
    l.put(108, 10, 'K'); l.put(113, 10, 'k'); l.put(111, 6, 'h')
    for i in range(5): l.floor(117 + i, 118 + i, 10 - i)
    l.pit(122, 127)
    l.floor(127, 131, 6)
    l.coins(127, 131, 5)
    l.pit(131, 135)
    l.floor(135, 168, 11)
    l.row(138, 142, 8, 'C'); l.put(144, 10, 'K'); l.put(148, 2, 'f'); l.put(151, 2, 'f')
    l.put(153, 10, 'k')
    l.coins(155, 160, 10)
    l.arena(164, 'flyer', 3, 1.0, 'MAD METER')
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
    l.put(38, 4, 'U'); l.ext.append([38, 4, {'pu': 'wrench'}])
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
    l.put(95, 10, 'J'); l.put(99, 10, 'p'); l.put(97, 4, 'v')
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
    l.put(164, 10, 'J'); l.put(168, 10, 'p'); l.put(172, 9, 'g'); l.put(176, 10, 'p'); l.put(170, 6, 'b'); l.put(182, 6, 'h')
    l.coins(180, 186, 10)
    l.arena(192, 'roller', 3, 1.0, 'THE GEAR GRINDER')
    return l


def level5():
    l = L('MASTER TOOLBOX', 236, 'evtech', 'master')
    l.floor(0, 236)
    l.put(2, 10, '@')
    l.put(7, 10, 'P'); l.put(11, 10, 'T')
    l.pit(15, 19); l.arc(15, 4, 8)
    l.put(22, 10, 'p'); l.put(26, 9, 'g')
    l.pit(29, 35); l.mover(30, 9, 'L', dy=4, speed=80)
    l.floor(35, 39, 7); l.put(37, 4, 'U'); l.ext.append([37, 4, {'pu': 'shield'}])
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
    l.row(151, 155, 7, '?'); l.put(153, 7, 'U'); l.ext.append([153, 7, {'pu': 'pound'}])
    l.pit(157, 164); l.mover(158, 9, 'L', dy=4, speed=85); l.mover(161, 6, 'M', dx=2, speed=80)
    l.floor(164, 168, 7)
    l.pit(168, 173)
    l.floor(173, 176, 8)
    l.put(178, 10, 'J'); l.put(182, 10, 'k'); l.put(186, 2, 'f'); l.put(189, 2, 'f'); l.put(180, 4, 'v'); l.put(188, 7, 'b')
    l.put(192, 10, '!')
    l.put(195, 10, 'p'); l.put(198, 10, 'p'); l.mover(197, 3, 'c', len=4, phase=0.5)
    l.pit(202, 208); l.mover(203, 9, 'L', dy=5, speed=90)
    l.floor(208, 212, 6); l.coins(208, 212, 5)
    l.pit(212, 216)
    l.floor(216, 236, 11)
    l.coins(219, 226, 10)
    l.arena(230, 'magnet', 4, 1.0, 'MEGA MAGNET')
    return l



def level6():
    l = L("CAR WASH SLIP 'N SLIDE", 200, 'carwash', 'wash')
    l.floor(0, 200)
    l.put(2, 10, '@')
    l.row(8, 20, 11, 'i'); l.row(8, 20, 12, 'i')         # soapy floor: slippery
    l.put(12, 10, 'P'); l.put(17, 10, 'P'); l.put(15, 7, 'b')
    l.row(23, 26, 7, '?'); l.put(24, 7, 'U'); l.ext.append([24, 7, {'pu': 'heart'}])
    l.pit(29, 35)
    l.row(30, 32, 9, 'q'); l.row(33, 35, 8, 'q')           # crumbling ledges over the pit
    l.floor(35, 40, 11)
    l.put(38, 10, 'T')
    l.row(42, 54, 11, 'i'); l.row(42, 54, 12, 'i')
    l.put(46, 10, 'e'); l.put(47, 10, 'e'); l.put(51, 7, 'b')
    l.put(56, 10, '!')
    l.pit(59, 64); l.mover(60, 9, 'M', dx=2, speed=70); l.arc(59, 5, 6)
    l.put(67, 10, 'J'); l.put(70, 6, 'h')
    l.row(73, 77, 8, '-'); l.coins(73, 77, 7); l.put(79, 10, 'Z')
    l.row(80, 84, 4, '-'); l.coins(80, 84, 3)
    l.pit(85, 91); l.row(86, 88, 9, 'q'); l.row(89, 91, 9, 'q')
    l.row(92, 105, 11, 'i'); l.row(92, 105, 12, 'i')
    l.put(95, 10, 'e'); l.put(96, 10, 'e'); l.put(100, 10, 'T'); l.put(98, 6, 'b')
    l.put(108, 10, '!')
    l.row(111, 115, 7, 'C'); l.put(113, 7, 'U'); l.ext.append([113, 7, {'pu': 'wrench'}])
    l.pit(118, 126); l.mover(119, 9, 'L', dy=3, speed=60); l.mover(122, 7, 'M', dx=2, speed=70)
    l.floor(126, 130, 8); l.put(128, 4, 'v')
    l.put(133, 10, 'K'); l.put(138, 10, 'e'); l.put(139, 10, 'e'); l.put(136, 6, 'h')
    l.row(142, 156, 11, 'i'); l.row(142, 156, 12, 'i'); l.put(147, 10, 'P'); l.put(151, 10, 'P'); l.put(149, 7, 'b')
    l.coins(158, 164, 10)
    l.arena(170, 'walker', 4, 1.25, 'THE SUDS SLINGER')
    return l


def level7():
    l = L('SALVAGE YARD SMASH', 210, 'salvage', 'salvage')
    l.floor(0, 210)
    l.put(2, 10, '@')
    for x in (8, 9): l.put(x, 10, 'D')
    l.put(9, 9, 'D')
    l.put(13, 2, 'f'); l.put(16, 2, 'f')
    l.put(19, 10, 'K'); l.put(22, 4, 'v')
    l.pit(26, 32); l.row(27, 29, 9, 'q'); l.row(30, 32, 8, 'q')
    l.floor(32, 36, 9); l.put(34, 6, 'U'); l.ext.append([34, 6, {'pu': 'magnet'}])
    l.pit(36, 40)
    l.put(42, 10, 'k'); l.put(47, 2, 'f'); l.put(50, 2, 'f'); l.put(48, 7, 'b')
    l.put(54, 10, '!')
    for i in range(4): l.floor(57 + i, 58 + i, 10 - i)
    l.floor(61, 66, 7); l.put(63, 2, 'v')
    l.pit(66, 72); l.mover(67, 7, 'M', dx=3, speed=80)
    l.floor(72, 76, 8); l.pit(76, 82); l.mover(77, 9, 'L', dy=4, speed=70)
    l.floor(82, 86, 6); l.coins(82, 86, 5)
    l.pit(86, 90)
    l.put(92, 10, 'J'); l.put(96, 10, 'K'); l.put(94, 6, 'h')
    l.put(100, 10, '!')
    l.row(103, 107, 7, 'C'); l.put(105, 3, 'H')
    l.put(109, 2, 'f'); l.put(112, 2, 'f'); l.put(115, 2, 'f')
    l.put(110, 10, 'D'); l.put(116, 10, 'D'); l.put(116, 9, 'D')
    l.pit(120, 127); l.row(121, 123, 9, 'q'); l.row(124, 127, 8, 'q'); l.put(123, 4, 'v')
    l.floor(127, 131, 9); l.pit(131, 135)
    l.put(138, 10, 'k'); l.put(142, 10, 'k'); l.put(140, 6, 'b')
    l.put(146, 10, '!')
    l.row(149, 153, 7, '?'); l.put(151, 7, 'U'); l.ext.append([151, 7, {'pu': 'air'}])
    l.put(156, 10, 'J'); l.put(160, 2, 'f'); l.put(163, 2, 'f'); l.put(162, 6, 'h')
    l.coins(168, 174, 10)
    l.arena(180, 'charger', 4, 1.25, 'THE CRUSHER CART')
    return l


def level8():
    l = L('PIT LANE RUSH', 220, 'pitlane', 'pit')
    l.floor(0, 220)
    l.put(2, 10, '@')
    l.row(7, 15, 10, '>'); l.put(14, 6, 'b')
    l.put(18, 10, 'T'); l.put(22, 10, 'T')
    l.pit(26, 33); l.mover(27, 9, 'M', dx=4, speed=95)
    l.floor(33, 37, 9); l.put(35, 5, 'U'); l.ext.append([35, 5, {'pu': 'lucky'}])
    l.put(40, 10, 'p'); l.put(43, 10, 'p'); l.put(41, 4, 'v')
    l.row(47, 55, 10, '<'); l.put(51, 6, 'h')
    l.put(58, 10, '!')
    l.pit(61, 69); l.mover(62, 8, 'M', dx=2, speed=85); l.mover(65, 6, 'M', dx=2, speed=85, phase=0.5)
    l.floor(69, 73, 7); l.coins(69, 73, 6)
    l.pit(73, 78)
    l.put(80, 10, 'K'); l.put(84, 10, 'K'); l.put(82, 6, 'b')
    l.row(88, 96, 10, '>'); l.put(92, 4, 'v'); l.put(94, 10, 'T')
    l.put(99, 10, '!')
    l.pit(102, 110); l.mover(103, 9, 'L', dy=4, speed=80); l.mover(106, 6, 'M', dx=2, speed=90)
    l.floor(110, 114, 6); l.put(112, 2, 'U'); l.ext.append([112, 2, {'pu': 'pound'}])
    l.pit(114, 118)
    l.put(120, 10, 'p'); l.put(123, 10, 'p'); l.put(126, 10, 'p'); l.put(124, 4, 'v')
    l.row(130, 138, 10, '<'); l.put(134, 6, 'h'); l.put(136, 10, 'T')
    l.put(141, 10, '!')
    l.pit(144, 152); l.mover(145, 9, 'M', dx=4, speed=100)
    l.floor(152, 156, 8)
    l.put(159, 10, 'J'); l.put(163, 10, 'K'); l.put(161, 6, 'b'); l.put(167, 4, 'v')
    l.coins(172, 178, 10)
    l.arena(184, 'flyer', 4, 1.3, 'THE TIMING TOWER')
    return l


def level9():
    l = L('FROZEN ROADSIDE', 230, 'snow', 'snow')
    l.floor(0, 230)
    l.put(2, 10, '@')
    l.row(6, 22, 11, 'i'); l.row(6, 22, 12, 'i')          # black ice
    l.put(11, 10, 'T'); l.put(17, 10, 'T'); l.put(14, 6, 'b')
    l.pit(25, 31); l.row(26, 28, 9, 'q'); l.row(29, 31, 9, 'q')
    l.floor(31, 35, 8); l.put(33, 4, 'U'); l.ext.append([33, 4, {'pu': 'heart'}])
    l.pit(35, 39)
    l.row(40, 54, 11, 'i'); l.row(40, 54, 12, 'i'); l.put(45, 9, 'g'); l.put(50, 4, 'v')
    l.put(57, 10, '!')
    l.pit(60, 68); l.row(61, 63, 9, 'q'); l.mover(64, 8, 'M', dx=2, speed=75)
    l.floor(68, 72, 7); l.put(70, 3, 'v')
    l.pit(72, 76)
    l.row(77, 92, 11, 'i'); l.row(77, 92, 12, 'i'); l.put(81, 10, 'J'); l.put(87, 10, 'J'); l.put(84, 6, 'h')
    l.put(95, 10, '!')
    for i in range(4): l.floor(98 + i, 99 + i, 10 - i)
    l.floor(102, 106, 7)
    l.pit(106, 113); l.row(107, 109, 7, 'q'); l.row(110, 113, 8, 'q'); l.put(109, 3, 'b')
    l.floor(113, 116, 9); l.pit(116, 120)
    l.row(121, 136, 11, 'i'); l.row(121, 136, 12, 'i'); l.put(125, 9, 'g'); l.put(131, 9, 'g'); l.put(128, 4, 'v')
    l.put(139, 10, '!')
    l.row(142, 146, 7, '?'); l.put(144, 7, 'U'); l.ext.append([144, 7, {'pu': 'wrench'}])
    l.pit(149, 157); l.mover(150, 9, 'L', dy=4, speed=75); l.row(153, 157, 6, 'q')
    l.floor(157, 160, 8)
    l.row(162, 176, 11, 'i'); l.row(162, 176, 12, 'i'); l.put(166, 10, 'K'); l.put(172, 10, 'T'); l.put(169, 6, 'b'); l.put(175, 4, 'v')
    l.coins(180, 186, 10)
    l.arena(192, 'roller', 4, 1.3, 'THE SNOWPLOW GEAR')
    return l


def level10():
    l = L('THE GRAND CHEST', 250, 'repairshop', 'grand')
    l.floor(0, 250)
    l.put(2, 10, '@')
    l.put(7, 10, 'P'); l.put(10, 10, 'T'); l.put(9, 6, 'b')
    l.pit(14, 20); l.row(15, 17, 9, 'q'); l.row(18, 20, 8, 'q')
    l.floor(20, 24, 7); l.put(22, 3, 'U'); l.ext.append([22, 3, {'pu': 'shield'}])
    l.pit(24, 28)
    l.put(30, 10, 'p'); l.put(33, 9, 'g'); l.put(36, 10, 'p'); l.put(34, 4, 'v')
    l.row(40, 48, 10, '>'); l.put(44, 6, 'h'); l.put(46, 10, 'e'); l.put(47, 10, 'e')
    l.put(51, 10, '!')
    l.pit(54, 62); l.mover(55, 9, 'L', dy=4, speed=85); l.mover(58, 6, 'M', dx=2, speed=90)
    l.floor(62, 66, 6); l.coins(62, 66, 5); l.put(64, 2, 'v')
    l.pit(66, 70)
    l.row(71, 84, 11, 'i'); l.row(71, 84, 12, 'i'); l.put(75, 10, 'J'); l.put(80, 10, 'K'); l.put(78, 6, 'b')
    l.put(87, 2, 'f'); l.put(90, 2, 'f'); l.put(93, 2, 'f')
    l.put(96, 10, '!')
    l.mover(100, 3, 'c', len=4); l.put(103, 10, 'p'); l.put(106, 10, 'p')
    l.pit(109, 117); l.row(110, 112, 9, 'q'); l.mover(113, 8, 'M', dx=2, speed=90)
    l.floor(117, 121, 7); l.put(119, 3, 'U'); l.ext.append([119, 3, {'pu': 'pound'}])
    l.pit(121, 125)
    l.row(126, 134, 10, '<'); l.put(130, 4, 'v'); l.put(133, 6, 'h')
    l.put(137, 10, '!')
    l.put(140, 10, 'k'); l.put(144, 10, 'k'); l.put(142, 6, 'b')
    l.pit(148, 156); l.mover(149, 9, 'L', dy=5, speed=90); l.mover(152, 5, 'M', dx=2, speed=95)
    l.floor(156, 160, 5); l.coins(156, 160, 4)
    l.pit(160, 165)
    l.row(166, 180, 11, 'i'); l.row(166, 180, 12, 'i'); l.put(170, 9, 'g'); l.put(176, 10, 'e'); l.put(177, 10, 'e'); l.put(173, 4, 'v')
    l.put(183, 10, '!')
    l.row(186, 190, 7, '?'); l.put(188, 7, 'U'); l.ext.append([188, 7, {'pu': 'heart'}])
    l.put(193, 10, 'J'); l.put(197, 10, 'T'); l.put(195, 6, 'b'); l.put(199, 6, 'h')
    l.coins(203, 209, 10)
    l.arena(214, 'magnet', 6, 1.35, 'THE MAGNETRON')
    return l


def level11():
    # PART 3 · THE BACK LOT (placeholder art until the Back Lot pack lands)
    l = L('THE BACK LOT', 240, 'salvage', 'salvage')
    l.floor(0, 240)
    l.put(2, 10, '@')
    l.put(8, 10, 'T'); l.put(12, 10, 'P'); l.put(10, 6, 'b')
    l.row(15, 19, 7, '?'); l.put(17, 7, 'U'); l.ext.append([17, 7, {'pu': 'lucky'}])
    l.pit(22, 28); l.row(23, 25, 9, 'q'); l.row(26, 28, 8, 'q')
    l.floor(28, 32, 7); l.put(30, 3, 'v'); l.pit(32, 36)
    l.row(38, 50, 10, '>'); l.put(42, 6, 'h'); l.put(46, 9, 'g')
    l.put(53, 10, '!')
    l.pit(56, 64); l.mover(57, 9, 'L', dy=4, speed=85); l.mover(60, 6, 'M', dx=2, speed=90)
    l.floor(64, 68, 6); l.coins(64, 68, 5); l.pit(68, 72)
    l.put(75, 10, 'J'); l.put(80, 10, 'K'); l.put(78, 6, 'b'); l.put(83, 10, 'p')
    l.put(87, 2, 'f'); l.put(91, 2, 'f')
    l.put(95, 10, '!')
    l.row(98, 110, 11, 'i'); l.row(98, 110, 12, 'i'); l.put(102, 10, 'T'); l.put(107, 10, 'T'); l.put(104, 5, 'v')
    l.row(113, 117, 7, '?'); l.put(115, 7, 'U'); l.ext.append([115, 7, {'pu': 'wrench'}])
    l.pit(120, 128); l.mover(121, 9, 'L', dy=5, speed=90); l.row(125, 128, 6, 'q')
    l.floor(128, 132, 8); l.pit(132, 136)
    l.row(137, 147, 10, '<'); l.put(141, 6, 'h'); l.put(145, 10, 'e'); l.put(146, 10, 'e')
    l.put(150, 10, '!')
    l.mover(153, 3, 'c', len=4); l.put(157, 10, 'k'); l.put(161, 10, 'k'); l.put(159, 6, 'b')
    l.pit(165, 173); l.mover(166, 9, 'L', dy=4, speed=95); l.mover(169, 6, 'M', dx=2, speed=95)
    l.floor(173, 177, 7); l.put(175, 3, 'U'); l.ext.append([175, 3, {'pu': 'heart'}]); l.pit(177, 181)
    l.put(184, 10, 'J'); l.put(189, 10, 'P'); l.put(187, 6, 'h'); l.put(192, 4, 'v')
    l.coins(196, 202, 10)
    l.arena(206, 'gunner', 5, 1.3, 'IMPACT GUN KING')
    return l


SOLIDS = set('#=CU?RSD<>i'); SEMIS = set('-q')
def decorate(l, idx):
    """5 hidden stars per drawer (high spots first) and one blue warp toolbox to a secret room."""
    g = l.g; W = l.cols
    bx = next((x for x, y, kw in l.ext if 'boss' in kw), W - 20)
    lo, hi = 9, bx - 9
    def clear(x, y0, y1):
        return all(0 <= y < ROWS and g[y][x] == '.' for y in range(y0, y1 + 1))
    def quiet(x, sy):  # no hazards/entities right around the spot
        for xx in range(x - 1, x + 2):
            for y in range(max(0, sy - 5), sy):
                if 0 <= xx < W and g[y][xx] not in '.o': return False
        return True
    cands = []
    for x in range(lo, hi):
        for sy in range(3, 12):
            ch = g[sy][x]
            if (ch in SOLIDS or ch in SEMIS) and clear(x, sy - 3, sy - 1) and quiet(x, sy):
                cands.append((x, sy)); break
    if not cands: return
    # warp box: highest spot in the middle of the drawer, on a surface at least 3 wide
    def wide(x, sy): return all(g[sy][xx] in SOLIDS | SEMIS and g[sy - 1][xx] == '.' for xx in (x - 1, x, x + 1))
    mid = [(x, sy) for x, sy in cands if (lo + hi) * 0.35 < x < (lo + hi) * 0.65 and wide(x, sy)]
    if mid:
        wx, wy = min(mid, key=lambda c: (c[1], abs(c[0] - (lo + hi) / 2)))
        l.put(wx, wy - 1, 'Y')
        cands = [c for c in cands if abs(c[0] - wx) > 2]
    seg = (hi - lo) / 5
    for k in range(5):
        a, b = lo + k * seg, lo + (k + 1) * seg
        pool = [c for c in cands if a <= c[0] < b and g[c[1] - 1][c[0]] == '.']
        if not pool: continue
        x, sy = min(pool, key=lambda c: (c[1], abs(c[0] - (a + b) / 2)))
        l.put(x, sy - 2, '*')

def room(idx):
    """underground secret room: coins, a gold chest with a Torque Star, and a box back up."""
    W = 34
    g = [['.'] * W for _ in range(ROWS)]
    for x in range(W):
        for y in (0, 1, 11, 12): g[y][x] = '#'
    for y in range(ROWS): g[y][0] = g[y][W - 1] = '#'
    g[10][2] = '@'
    for x in range(6, 10): g[8][x] = '-'; g[7][x] = 'o'
    for x in range(24, 28): g[8][x] = '-'; g[7][x] = 'o'
    for x in range(12, 22): g[6][x] = '-'
    for x in (13, 14, 15, 18, 19, 20): g[5][x] = 'o'
    g[5][16] = 'Q'
    for x in list(range(4, 12)) + list(range(22, 30)): g[10][x] = 'o'
    if idx % 2: g[10][16] = 'P'; g[10][17] = 'P'   # a little oil to hop on odd drawers
    g[10][31] = 'y'
    return [''.join(r) for r in g]

LEVELS = [level1(), level2(), level3(), level4(), level5(), level6(), level7(), level8(), level9(), level10(), level11()]

if __name__ == '__main__':
    out = []
    for i, l in enumerate(LEVELS):
        decorate(l, i)
        out.append({'name': l.name, 'bg': l.bg, 'music': l.music, 'rows': l.text(), 'ext': l.ext, 'room': room(i)})
    js = '// generated by lt-tools/levels.py — do not hand edit\nwindow.LT_LEVELS = ' + json.dumps(out) + ';\n'
    open(sys.argv[1] if len(sys.argv) > 1 else 'levels.js', 'w').write(js)
    for l in LEVELS:
        print('==', l.name, l.cols)
        for r in l.text(): print(r)
