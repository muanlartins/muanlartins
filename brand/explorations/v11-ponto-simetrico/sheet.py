exec(open('base.py').read().split("V={")[0])
import json,sys,os
def build(paths,sw=.24,R=88):
    pts=[p for P in paths for p in P]; (cx,cy),r=mec(pts); u=R/(r+sw/2)
    T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    return [ 'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P)) for P in paths],u*sw
os.makedirs('cand',exist_ok=True)
for geo in sys.argv[1:]:
    J=json.load(open(f'res-{geo}.json'))
    for n,(r,d) in enumerate(J['res']):
        T=[(x+d[0],y+d[1]) for x,y in J['R']]
        ds,w=build([J['S'],T])
        open(f'cand/{geo}{n:02d}.svg','w').write(svg(f'<rect width="256" height="256" fill="{K}"/>'+''.join(f'<path d="{p}" fill="none" stroke="{W}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>' for p in ds)))
