"""Tiny telnet console client for GNS3 device consoles (telnetlib was removed in Python 3.13).

Used for Day-0 bootstrap (pushing configs/<device>.cfg over the out-of-band console)
and for capturing verification output.

  python console.py push  <host:port> <config-file>
  python console.py run   <host:port> "show ip route" ["show ip ospf neighbor" ...]
"""
import os
import re
import socket
import sys
import time

IAC, DONT, DO, WONT, WILL, SB, SE = 255, 254, 253, 252, 251, 250, 240
PROMPT = re.compile(rb"(^|\n)[\w\-.]+(\([\w\-.]+\))?[#>] ?$")
SHELL_PROMPT = re.compile(rb"(^|\n)[\w\-./:~@]*[#$] ?$")
SLOW = ("crypto key generate", "write memory", "copy running", "ip ssh version")


class Console:
    def __init__(self, target, echo=True, prompt=None):
        host, port = target.rsplit(":", 1)
        self.prompt = prompt or PROMPT
        self.s = socket.create_connection((host, int(port)), timeout=10)
        self.s.settimeout(0.3)
        self.echo = echo
        self.buf = b""

    def _recv(self):
        try:
            data = self.s.recv(65536)
        except (socket.timeout, TimeoutError):
            return b""
        out, i = bytearray(), 0
        while i < len(data):  # strip / refuse telnet negotiation
            b = data[i]
            if b == IAC and i + 1 < len(data):
                cmd = data[i + 1]
                if cmd in (DO, DONT, WILL, WONT) and i + 2 < len(data):
                    opt = data[i + 2]
                    if cmd == DO:
                        self.s.sendall(bytes([IAC, WONT, opt]))
                    elif cmd == WILL and opt in (1, 3):  # accept ECHO / SGA
                        self.s.sendall(bytes([IAC, DO, opt]))
                    i += 3
                    continue
                if cmd == SB:
                    j = data.find(bytes([IAC, SE]), i)
                    i = j + 2 if j >= 0 else len(data)
                    continue
                i += 2
                continue
            out.append(b)
            i += 1
        out = re.sub(rb"\x1b\[[0-9;?]*[a-zA-Z]", b"", bytes(out))  # drop ANSI escapes (busybox ESC[6n)
        if self.echo and out:
            sys.stdout.write(out.decode(errors="ignore").replace("\r", ""))
            sys.stdout.flush()
        return bytes(out)

    def read_until_prompt(self, timeout=30, extra=None):
        end, self.buf = time.time() + timeout, b""
        while time.time() < end:
            self.buf += self._recv()
            tail = self.buf[-300:].replace(b"\r", b"")
            if b"--More--" in tail[-20:]:
                self.s.sendall(b" ")
                continue
            if b"initial configuration dialog?" in tail:
                self.s.sendall(b"no\r")
                continue
            if b"terminate autoinstall?" in tail:
                self.s.sendall(b"yes\r")
                continue
            if b"RETURN to get started" in tail:
                self.s.sendall(b"\r")
                self.buf = b""
                continue
            if re.search(rb"\[(no|yes/no)\]: ?$", tail):
                self.s.sendall(b"yes\r")
                continue
            if b"[confirm]" in tail[-15:] or (extra and re.search(extra, tail)):
                self.s.sendall(b"\r")
                continue
            if self.prompt.search(tail.rstrip(b"\n") if tail.endswith(b"\n") else tail):
                return self.buf.decode(errors="ignore")
        return self.buf.decode(errors="ignore")

    def cmd(self, line, timeout=None):
        timeout = timeout or (180 if line.strip().startswith(SLOW) else 30)
        self.s.sendall(line.encode() + b"\r")
        return self.read_until_prompt(timeout, extra=rb"\[[\w\-./]+\]\? ?$|Destination filename")

    def wake(self, tries=40):
        """Wait for the device to boot and give us a prompt."""
        for _ in range(tries):
            self.s.sendall(b"\r")
            out = self.read_until_prompt(15)
            if self.prompt.search(out.replace("\r", "").rstrip().encode()):
                return True
        return False

    def enable(self):
        self.wake()
        self.s.sendall(b"\x1a")          # Ctrl+Z: leave any config mode left by a previous session
        self.read_until_prompt(5)
        out = self.cmd("")
        if out.rstrip().endswith(">"):
            self.cmd("enable")
        self.cmd("terminal length 0")
        self.cmd("terminal width 200")


def push(target, cfg_path):
    c = Console(target)
    c.enable()
    exec_mode, cfg_lines = False, []
    for raw in open(cfg_path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if line.startswith("!EXEC-BEGIN"):
            exec_mode = True
            continue
        if line.startswith("!EXEC-END"):
            exec_mode = False
            continue
        if exec_mode:
            c.cmd(line)
        elif line.strip() and not line.lstrip().startswith("!"):
            cfg_lines.append(line)
    c.cmd("configure terminal")
    for line in cfg_lines:
        c.cmd(line)
    c.cmd("end")
    c.cmd("write memory")
    print(f"\n### {cfg_path} pushed to {target}")


def shell(target, commands, timeout=90):
    """Run commands on a Linux container console (busybox/bash)."""
    c = Console(target, prompt=SHELL_PROMPT)
    c.wake(5)
    title = os.environ.get("EVIDENCE_TITLE")
    if title:
        sys.stdout.write("\x1b[2J\x1b[3J\x1b[H")
        print("=" * 110 + f"\n  {title}   [{target}]   {time.strftime('%Y-%m-%d %H:%M:%S')}\n" + "=" * 110)
        c.cmd("")
    for command in commands:
        c.cmd(command, timeout=timeout)
    print()


def run(target, commands):
    c = Console(target)
    c.enable()
    title = os.environ.get("EVIDENCE_TITLE")
    if title:  # evidence mode: clear the window and print a header before the real output
        sys.stdout.write("\x1b[2J\x1b[3J\x1b[H")
        print("=" * 110 + f"\n  {title}   [{target}]   {time.strftime('%Y-%m-%d %H:%M:%S')}\n" + "=" * 110)
        c.cmd("")
    for command in commands:
        c.cmd(command, timeout=60)
    print()


if __name__ == "__main__":
    mode, target = sys.argv[1], sys.argv[2]
    if mode == "push":
        push(target, sys.argv[3])
    elif mode == "sh":
        shell(target, sys.argv[3:])
    else:
        run(target, sys.argv[3:])
