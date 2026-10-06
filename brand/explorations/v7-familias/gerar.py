exec(open('base.py').read().split("V={")[0])
import math
s3=3**.5
def lean(P,slope): P=list(P); x,y=P[4]; P[5]=(x+(P[5][1]-y)/slope,P[5][1]); return P
def shear(P,deg): k=math.tan(math.radians(deg)); return [(x+k*y,y) for x,y in P]
A=[(0,2),(-2/3,1),(0,0),(1,1.5),(2,0),(2,2)]
B=[(0,2),(-1,1),(0,0),(s3/2,1.5),(2,0),(2,2)]
B60=[(0,2),(-1/s3,1),(0,0),(s3/2,1.5),(2,0),(2,2)]
C=[(0,2),(-1,1),(0,0),(1,1.5),(2,0),(2,2)]
E=[(0,2),(-1,1),(0,0),(1.5,1.5),(3,0),(3,2)]
V=[
 ('A1','base',A,.30),('A2','N paralelo ao L',lean(A,1.5),.30),('A3','itálico 10°',shear(A,10),.30),('A4','A2 fino',lean(A,1.5),.22),
 ('B1','base',B,.30),('B2','N paralelo ao 60°',lean(B,s3),.30),('B3','L em 60° também',B60,.30),('B4','B3 + N 60°',lean(B60,s3),.30),
 ('C1','base',C,.30),('C2','N paralelo ao L (45°)',lean(C,1),.30),('C3','N paralelo ao A',lean(C,1.5),.30),('C4','itálico 10°',shear(C,10),.30),
 ('E1','base',E,.30),('E2','fino',E,.20),('E3','N a 45°, fino',lean(E,1),.20),('E4','itálico 10°, fino',shear(E,10),.20),
]
def build(P,sw,R=86):
    (cx,cy),r=mec(P); u=R/(r+sw/2); T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    return 'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P)),u*sw
for k,lab,P,sw in V:
    for nm,bg,fg in (('dark',K,W),('light','#F4F5F7',K)):
        d,w=build(P,sw)
        open(f'{k}-{nm}.svg','w').write(svg(f'<rect width="256" height="256" fill="{bg}"/><path d="{d}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'))
open('labels.txt','w').write('\n'.join(f'{k}\t{k} · {lab}' for k,lab,_,_ in V)+'\n')
