#!/usr/bin/env python3
"""Make a one-time coin gift code for a player: python3 scripts/gift_code.py 500"""
import sys, secrets
SALT = "honestech-10mm-wrench-7731"
A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
def check(amount, id_):
    h = 2166136261
    for ch in f"{SALT}|{amount}|{id_}":
        h ^= ord(ch); h = (h * 16777619) & 0xFFFFFFFF
    s = ""
    for _ in range(4): s += A[h % 32]; h //= 32
    return s
amount = int(sys.argv[1]) if len(sys.argv) > 1 else 500
for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 1):
    i = "".join(secrets.choice(A) for _ in range(4))
    print(f"{amount}-{i}-{check(amount, i)}")
