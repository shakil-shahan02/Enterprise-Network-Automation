#!/usr/bin/env python3
"""Minimal RFC3164 syslog collector for the NetOps server (UDP/514).

Every network device sends 'logging host 10.30.100.10'. Messages are written to
/root/ansible/logs/network-syslog.log as:  <received-time> <source-ip> <severity> <message>
Run:  nohup python3 tools/syslog_server.py >/dev/null 2>&1 &
"""
import datetime
import os
import re
import socketserver

LOG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "network-syslog.log")
SEV = ["EMERG", "ALERT", "CRIT", "ERR", "WARNING", "NOTICE", "INFO", "DEBUG"]
PRI = re.compile(r"^<(\d+)>")


class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        data = self.request[0].decode(errors="replace").strip()
        m = PRI.match(data)
        sev = SEV[int(m.group(1)) & 7] if m else "?"
        msg = PRI.sub("", data)
        line = f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S} {self.client_address[0]:<13} {sev:<7} {msg}\n"
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(line)


if __name__ == "__main__":
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with socketserver.UDPServer(("0.0.0.0", 514), Handler) as srv:
        srv.serve_forever()
