"""Compose the rendered launchpad sprites into one inspectable image.

Not a Blender script — it composites the *shipped PNGs* exactly as PixiJS will,
so what you are looking at is the real in-game result rather than a prettier
3D render that would hide sprite-level problems.

    python3 tools/blender/make_preview.py tools/blender/preview/launchpad.png

Left  — the pad assembled and empty, at native 3x resolution.
Right — each module on its own, to check it still reads alone.

Positions here mirror what hubScene will need: parts that stand ON the deck
sit inside its 216px span; masts and tanks are ground furniture outside it.
"""

import struct, zlib, sys, os
def decode(p):
    d=open(p,'rb').read(); i=8; idat=b''
    while i<len(d):
        ln=struct.unpack('>I',d[i:i+4])[0]; typ=d[i+4:i+8]; data=d[i+8:i+8+ln]
        if typ==b'IHDR': w,h,bd,ct=struct.unpack('>IIBB',data[:10])
        elif typ==b'IDAT': idat+=data
        i+=12+ln
    raw=zlib.decompress(idat); ch=4; stride=w*ch
    out=bytearray(); prev=bytearray(stride); pos=0
    for y in range(h):
        f=raw[pos]; pos+=1; line=bytearray(raw[pos:pos+stride]); pos+=stride
        for x in range(stride):
            a=line[x-ch] if x>=ch else 0; b=prev[x]; c=prev[x-ch] if x>=ch else 0
            if f==1: line[x]=(line[x]+a)&255
            elif f==2: line[x]=(line[x]+b)&255
            elif f==3: line[x]=(line[x]+(a+b)//2)&255
            elif f==4:
                pa=abs(b-c);pb=abs(a-c);pc=abs(a+b-2*c)
                pr=a if (pa<=pb and pa<=pc) else (b if pb<=pc else c)
                line[x]=(line[x]+pr)&255
        out+=line; prev=line
    return w,h,bytes(out)
def encode(path,w,h,px):
    raw=b''.join(b'\x00'+bytes(px[y*w*3:(y+1)*w*3]) for y in range(h))
    def chunk(t,d):
        c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
    open(path,'wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))
        +chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

D='/Users/scroobz/Navigation/Landnam/web/public/game/assets/hub/'
CACHE={}
def sprite(n):
    if n not in CACHE: CACHE[n]=decode(D+n+'.png')
    return CACHE[n]

W,H=1500,1000
GROUND=760
buf=bytearray()
for i in range(W*H): buf+=bytes((0x04,0x1a,0x33))
for y in range(GROUND,H):
    for x in range(W):
        d=(y*W+x)*3; buf[d]=0x0a; buf[d+1]=0x25; buf[d+2]=0x40
# divider
for y in range(H):
    d=(y*W+950)*3; buf[d]=0x16; buf[d+1]=0x46; buf[d+2]=0x8a

def blit(name, cx, baseline, scale, anchor=(0.5,1.0)):
    w,h,px=sprite(name)
    sw,sh=int(w*scale),int(h*scale)
    ox=int(cx-sw*anchor[0]); oy=int(baseline-sh*anchor[1])
    for y in range(sh):
        sy=min(h-1,int(y/scale))
        for x in range(sw):
            sx=min(w-1,int(x/scale)); o=(sy*w+sx)*4; a=px[o+3]
            if a==0: continue
            tx,ty=ox+x,oy+y
            if not(0<=tx<W and 0<=ty<H): continue
            d=(ty*W+tx)*3
            for k in range(3): buf[d+k]=(px[o+k]*a+buf[d+k]*(255-a))//255

# ── assembled empty pad, native 3x resolution (scale 1.0) ──
# pad_deck renders 216x54, so the deck spans cx +/- 108. Everything that
# stands ON the deck must sit inside that span; masts and tanks are ground
# furniture and sit outside it.
S = 1.0
cx = 470
DECK_TOP = GROUND - 40          # visible top surface of the deck slab

blit('pad_mast', cx - 300, GROUND, S)
blit('pad_mast', cx + 300, GROUND, S)
blit('pad_tank', cx - 190, GROUND, S)
blit('pad_tank', cx + 190, GROUND, S)
blit('pad_deck', cx, GROUND, S)
blit('pad_gantry_frame', cx - 78, DECK_TOP, S)
blit('pad_gantry_frame', cx + 78, DECK_TOP, S)
blit('pad_clamp', cx - 26, DECK_TOP, S)
blit('pad_clamp', cx + 26, DECK_TOP, S)
# Swing arm hinged on the inner face of the left gantry, reaching toward the
# vehicle position. anchor (0, 0.5) = pivot at the left edge, mid-height.
blit('pad_swing_arm', cx - 52, DECK_TOP - 200, S, anchor=(0.0, 0.5))

# ── module strip: every part alone, on a shared baseline per row ──
ROW1, ROW2 = 300, 700
blit('pad_deck',          1120, ROW1, S)
blit('pad_swing_arm',     1350, ROW1 - 40, S, anchor=(0.0, 0.5))
blit('pad_gantry_frame',  1060, ROW2, S)
blit('pad_mast',          1180, ROW2, S)
blit('pad_tank',          1290, ROW2, S)
blit('pad_clamp',         1400, ROW2, S)

encode(sys.argv[1],W,H,buf)
print("wrote", sys.argv[1], W,'x',H, os.path.getsize(sys.argv[1])//1024, "KB")
