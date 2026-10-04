import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFont
from parts import PARTS, PD, V2
from key import neutralize
FONT = '/usr/share/fonts/truetype/sand-box/google/Oxanium/Oxanium-VariableFont_wght.ttf'
def font(sz, w=b'Bold'):
    f = ImageFont.truetype(FONT, sz)
    try: f.set_variation_by_name(w)
    except Exception: pass
    return f
cols = 4; CWc, CHc = 520, 420
rows = (len(PARTS) + cols - 1) // cols
S = Image.new('RGBA', (cols * CWc + 40, rows * CHc + 130), (26, 26, 29, 255)); d = ImageDraw.Draw(S)
d.text((24, 22), 'Landnam customizer parts v2: icon (192) + detail (288)', fill=(232, 232, 237), font=font(40))
d.text((24, 74), 'Cut from gen/parts-a.jpg + parts-b.jpg (chroma-keyed, despilled). Chalky tile + room framing.', fill=(150, 160, 172), font=font(22, b'Medium'))
for i, (pid, name) in enumerate(PARTS):
    x = 20 + (i % cols) * CWc; y = 120 + (i // cols) * CHc
    d.rounded_rectangle([x, y, x + CWc - 16, y + CHc - 16], 14, fill=(34, 34, 39, 255))
    ic = Image.open(f'{PD}/{pid}_icon.png'); de = Image.open(f'{PD}/{pid}.png')
    S.alpha_composite(de, (x + 8, y + 8))
    S.alpha_composite(ic.resize((144, 144), Image.LANCZOS), (x + 300, y + 20))
    S.alpha_composite(ic.resize((56, 56), Image.LANCZOS), (x + 300, y + 180))
    d.text((x + 364, y + 196), '56px', fill=(120, 128, 140), font=font(16, b'Medium'))
    d.text((x + 14, y + 304), name, fill=(232, 232, 237), font=font(30))
    d.text((x + 14, y + 344), pid, fill=(112, 217, 234), font=font(22, b'Medium'))
neutralize(S).convert('RGB').save(f'{V2}/parts-contact-sheet.png', optimize=True)
print(S.size)
