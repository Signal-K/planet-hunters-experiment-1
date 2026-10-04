import json, sys
from PIL import Image
def loader(model):
    d=json.load(open(f'{model}.json')); sh=Image.open(d['meta']['image'])
    def frame(nm):
        f=d['frames'][nm]; r=f['frame']; ss=f['spriteSourceSize']; so=f['sourceSize']
        C=Image.new('RGBA',(so['w'],so['h'])); C.alpha_composite(sh.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])),(ss['x'],ss['y'])); return C
    return d, frame
if __name__=='__main__':
    model=sys.argv[1]; out=sys.argv[2]; names=sys.argv[3:]
    d,frame=loader(model)
    ims=[frame(n) for n in names]
    W=max(i.width for i in ims); H=max(i.height for i in ims)
    S=Image.new('RGBA',(W*len(ims),H),(11,16,24,255))
    for i,im in enumerate(ims): S.alpha_composite(im,(i*W,0))
    S.save(out)
