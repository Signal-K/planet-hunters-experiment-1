import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import preview as pv
from PIL import Image, ImageDraw
F = pv.FPS
def fr(t0, n): return t0 + n / F + 1e-4
keys = [(fr(6.4, -3), 'ASCENT', 'boosters: burn loop'),
        (fr(6.4, 1), 'PYRO', 'boosters: separate 01'),
        (fr(6.4, 3), 'CLAMPS BREAK', 'boosters: separate 03'),
        (fr(6.4, 6), 'GAS PUFF', 'boosters: separate 06'),
        (fr(6.4, 10), 'DRIFT', 'boosters: separate 10'),
        (fr(6.4, 22), 'TUMBLE', 'boosters: idle, runtime spin'),
        (fr(8.2, -2), 'CORE BURN', 'lower: burn loop'),
        (fr(8.2, 1), 'STAGE FLASH', 'lower 01 / upper sep 01'),
        (fr(8.2, 4), 'RING OPENS', 'lower 04 / upper sep 04'),
        (fr(8.2, 9), 'ULLAGE', 'lower 09 / upper sep 09'),
        (fr(8.2, 13), 'RELIGHT', 'upper: relight 03'),
        (fr(8.2, 30), 'UPPER BURN', 'upper: burn loop')]
PW, PH = 300, 560
S = Image.new('RGB', (PW * 12 + 13 * 10, 64 + 2 * (PH + 64) + 10), (26, 26, 29)); d = ImageDraw.Draw(S)
d.text((12, 12), 'Landnam launch stack v2: separation strip (frames from the v2 launch sheets, 24 fps)', fill=(232, 232, 237), font=pv.font(30))
d.text((S.width - 360, 18), 'top: explorer   bottom: prospector', fill=(150, 156, 166), font=pv.font(18, b'Medium'))
for i, (t, name, sub) in enumerate(keys):
    img = pv.frame_at(t, hud=False)
    a = pv.alt(t); c = pv.cam(a * pv.U); ry = pv.GROUND_Y + c - 6 - a * pv.U
    cy = ry - 150 * pv.U + (60 if t > 8.0 else 0)
    for r, x0 in enumerate(pv.XS):
        y0 = int(max(0, min(1080 - PH, cy - PH * 0.5)))
        crop = img.crop((x0 - PW // 2, y0, x0 + PW // 2, y0 + PH))
        x = 10 + i * (PW + 10); y = 64 + r * (PH + 64)
        S.paste(crop, (x, y))
        d.text((x + 4, y + PH + 6), name, fill=(163, 236, 245), font=pv.font(22))
        d.text((x + 4, y + PH + 34), f't={t:.2f}s  {sub}', fill=(180, 186, 196), font=pv.font(14, b'Medium'))
S.save(os.path.join(pv.V2, 'separation-strip.png'), optimize=True)
print(S.size)
