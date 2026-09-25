"""Send one demo step to ANSIBLE-SRV (visible in the LIVE window) and wait for it to finish.
Survives GNS3 console disconnects: reconnects and keeps waiting for the shell prompt.

  python demo.py "<title>" "<shell command>" [timeout]
"""
import sys
import time

import console

TARGET = "192.168.56.104:5001"
title, cmd = sys.argv[1], sys.argv[2]
timeout = int(sys.argv[3]) if len(sys.argv) > 3 else 900


def connect():
    c = console.Console(TARGET, echo=False, prompt=console.SHELL_PROMPT)
    return c


c = connect()
c.wake(3)
c.cmd("cd /root/ansible && source venv/bin/activate && export ANSIBLE_DEPRECATION_WARNINGS=False ANSIBLE_FORCE_COLOR=1 COLUMNS=150")
c.cmd(f"echo '###CLEAR###'; echo; echo '>>> {title}'; echo")
c.s.sendall(cmd.encode() + b"; echo __DEMO_DONE__\r")
end, buf = time.time() + timeout, b""
while time.time() < end:
    try:
        buf += c._recv()
    except (ConnectionResetError, OSError):
        time.sleep(3)
        c = connect()
        c.s.sendall(b"\r")  # harmless empty line; lets us see the prompt again once finished
        continue
    if buf.count(b"__DEMO_DONE__") >= 2 or (b"__DEMO_DONE__\n" in buf.replace(b"\r", b"")):
        break
    time.sleep(0.2)
print(buf.decode(errors="ignore")[-3000:])
