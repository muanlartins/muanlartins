exec(open('base.py').read().split("V={")[0])
import json, math
LB='#8EA6EE'
def load(geo,n):
    J=json.load(open(f'res-{geo}.json')); d=J['res'][n][1]
    return J['S'],[(x+d[0],y+d[1]) for x,y in J['R']]
def rot(P,deg):
    a=math.radians(deg); c,s=math.cos(a),math.sin(a); return [(x*c-y*s,x*s+y*c) for x,y in P]
def render(S,T,mode='mono',sw=.24,bg=K,fg=W,R=88,deg=0):
    S,T=rot(S,deg),rot(T,deg)
    (cx,cy),r=mec(S+T); u=R/(r+sw/2); w=u*sw
    tr=lambda P:'M'+'L'.join(f'{128+(x-cx)*u:.2f} {128-(y-cy)*u:.2f}' for x,y in P)
    st=lambda d,c,ww=w:f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{ww:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'
    b=f'<rect width="256" height="256" fill="{bg}"/>'
    if mode=='mono': b+=st(tr(S),fg)+st(tr(T),fg)
    if mode=='duo': b+=st(tr(T),LB if bg==K else '#7F97DA')+st(tr(S),fg)
    if mode=='over': b+=st(tr(T),fg)+st(tr(S),bg,w*2.4)+st(tr(S),fg)
    return svg(b)
s11=[(2,0),(1,2/3),(0,0),(1.5,-1),(0,-2),(2,-2)]
t11=[(x+3,y-4/3) for x,y in [(-2,0),(-1,-2/3),(0,0),(-1.5,1),(0,2),(-2,2)]]
items=[
 ('11 original',(s11,t11),'mono',0),('A05 · ƷΣ abraçados',load('A',5),'mono',0),('C03 · ƷΣ abraçados (C)',load('C',3),'mono',0),
 ('E10 · losango (45°)',load('E',10),'mono',0),('E10 · losango, 2 cores',load('E',10),'duo',0),('C03 · entrelaçado',load('C',3),'over',0),
 ('E05 · o 11 em 45°',load('E',5),'mono',0),('E05 · 11 em 45°, 2 cores',load('E',5),'duo',0),('E13 · S com faixa',load('E',13),'mono',0),
 ('E07 · ampulheta',load('E',7),'mono',0),('E11 · velocidade',load('E',11),'mono',0),('E02 · gravata',load('E',2),'over',0),
]
out=[]
for i,(lab,(S,T),mode,deg) in enumerate(items):
    open(f'f{i:02d}-dark.svg','w').write(render(S,T,mode,deg=deg))
    open(f'f{i:02d}-light.svg','w').write(render(S,T,mode,bg='#F4F5F7',fg=K,deg=deg))
    out.append(f'f{i:02d}\t{i+1} · {lab}')
open('labels.txt','w').write('\n'.join(out)+'\n')
