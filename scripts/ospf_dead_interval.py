"""Apply 'ip ospf dead-interval 120' to every P2P backbone link (all four routers in parallel).

Dynamips routers occasionally pause when the host is busy; a 120 s dead interval (hello 10 s)
stops those pauses from tearing down OSPF adjacencies.
"""
import threading
import console

LINKS = {5000: ["FastEthernet1/0", "FastEthernet1/1", "FastEthernet2/0"],   # R4-CORE
         5001: ["FastEthernet1/0", "FastEthernet1/1"],                      # R1-HQ
         5002: ["FastEthernet1/0", "FastEthernet1/1"],                      # R3-DC
         5003: ["FastEthernet1/0"]}                                         # R2-BR


def apply(port, intfs):
    c = console.Console(f"localhost:{port}", echo=False)
    c.enable()
    c.cmd("configure terminal")
    for i in intfs:
        c.cmd(f"interface {i}")
        c.cmd("ip ospf dead-interval 120")
    c.cmd("end")
    c.cmd("write memory")
    out = c.cmd("show ip ospf interface brief")
    print(f"--- port {port}\n" + "\n".join(l for l in out.splitlines() if "Fa" in l))


threads = [threading.Thread(target=apply, args=(p, i)) for p, i in LINKS.items()]
for t in threads:
    t.start()
for t in threads:
    t.join()
