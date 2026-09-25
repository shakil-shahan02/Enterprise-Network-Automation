// Crop terminal screenshots to their text content (keeps the window title bar) so the text is
// readable when printed at page width. Output: report/img/<same name>.png
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SRC = path.resolve(__dirname, "..", "screenshots");
const OUT = path.join(__dirname, "img");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  for (const f of fs.readdirSync(SRC).filter(n => n.endsWith(".png"))) {
    const src = path.join(SRC, f), dst = path.join(OUT, f);
    if (f.startsWith("A01_")) { fs.copyFileSync(src, dst); continue; }   // GNS3 GUI: keep full window
    const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H, channels: C } = info;
    let maxX = 0, maxY = 0;
    for (let y = 70; y < H - 24; y += 2) {
      for (let x = 0; x < W - 40; x += 2) {
        const i = (y * W + x) * C;
        if (data[i] + data[i + 1] + data[i + 2] > 180) { if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
      }
    }
    const w = Math.min(W, Math.max(1500, maxX + 40)), h = Math.min(H, Math.max(500, maxY + 30));
    await sharp(src).extract({ left: 0, top: 0, width: w, height: h }).png().toFile(dst);
    console.log(`${f}: ${W}x${H} -> ${w}x${h}`);
  }
})();
