"""Live, read-only view of a device/container console (shows everything typed and printed).
A line containing ###CLEAR### wipes the window (used between demo steps).

  python watch.py 192.168.56.104:5001 "ANSIBLE-SRV"
"""
import sys
import time

import console

target = sys.argv[1]
title = sys.argv[2] if len(sys.argv) > 2 else target
banner = "=" * 110 + f"\n  LIVE CONSOLE  |  {title}  [{target}]\n" + "=" * 110
print(banner, flush=True)
while True:
    try:
        c = console.Console(target, echo=False, keep_ansi=True)
        while True:
            data = c._recv().decode(errors="ignore").replace("\r", "")
            if "###CLEAR###" in data:
                data = data.split("###CLEAR###")[-1].lstrip("\n")
                sys.stdout.write("\x1b[2J\x1b[3J\x1b[H" + banner + "\n")
            if data:
                sys.stdout.write(data)
                sys.stdout.flush()
            time.sleep(0.03)
    except Exception as e:  # reconnect if the console drops
        print(f"\n[reconnecting: {e}]", flush=True)
        time.sleep(2)
