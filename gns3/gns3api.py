"""Minimal GNS3 v2 REST API client (reads credentials from the local gns3_server.ini)."""
import base64
import configparser
import json
import os
import urllib.error
import urllib.request

INI = os.path.join(os.environ["APPDATA"], "GNS3", "2.2", "gns3_server.ini")


class GNS3:
    def __init__(self, base="http://localhost:3080/v2"):
        cfg = configparser.ConfigParser()
        cfg.read(INI)
        user = cfg["Server"].get("user", "admin")
        pw = cfg["Server"].get("password", "")
        token = base64.b64encode(f"{user}:{pw}".encode()).decode()
        self.base = base
        self.headers = {"Authorization": f"Basic {token}", "Content-Type": "application/json"}

    def req(self, method, path, body=None, raw=False, timeout=300):
        data = None
        if body is not None:
            data = body if isinstance(body, bytes) else json.dumps(body).encode()
        r = urllib.request.Request(self.base + path, data=data, method=method, headers=self.headers)
        try:
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                out = resp.read()
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"{method} {path} -> {e.code}: {e.read().decode(errors='ignore')}") from None
        if raw:
            return out
        return json.loads(out) if out else None

    get = lambda self, p, **k: self.req("GET", p, **k)
    post = lambda self, p, b=None, **k: self.req("POST", p, b if b is not None else {}, **k)
    put = lambda self, p, b, **k: self.req("PUT", p, b, **k)
    delete = lambda self, p, **k: self.req("DELETE", p, **k)

    def project(self, name):
        for p in self.get("/projects"):
            if p["name"] == name:
                return p
        return None

    def nodes(self, pid):
        return {n["name"]: n for n in self.get(f"/projects/{pid}/nodes")}
