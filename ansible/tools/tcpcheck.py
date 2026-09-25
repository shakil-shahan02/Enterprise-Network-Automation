#!/usr/bin/env python3
"""Quick reachability check: TCP/22 banner on every inventory host (no ping needed)."""
import socket
import sys

HOSTS = sys.argv[1:] or ["10.30.100.1", "10.0.0.3", "10.0.0.4", "10.0.0.1", "10.0.0.2",
                         "10.10.99.11", "10.10.99.12", "10.20.99.11", "10.20.99.12",
                         "10.30.99.11", "10.30.99.12"]
for h in HOSTS:
    s = socket.socket()
    s.settimeout(8)
    try:
        s.connect((h, 22))
        print(f"{h:13} OPEN  {s.recv(40)!r}")
    except Exception as e:  # noqa: BLE001
        print(f"{h:13} FAIL  {e}")
    finally:
        s.close()
