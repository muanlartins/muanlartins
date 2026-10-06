exec(open('base.py').read().split("V={")[0])
import math
s3=3**.5
SETS={
 'A':('Uma inclinação só (2:3)',[(0,2),(-2/3,1),(0,0),(1,1.5),(2,0),(2,2)]),
 'B':('Teu esboço (60° à esquerda)',[(0,2),(-1,1),(0,0),(s3/2,1.5),(2,0),(2,2)]),
 'C':('Isósceles (45° + A centrado)',[(0,2),(-1,1),(0,0),(1,1.5),(2,0),(2,2)]),
 'D':('A equilátero (60°/60°)',[(0,2),(-1,1),(0,0),(1,s3),(2,0),(2,2)]),
 'E':('Tudo 45°, A largo',[(0,2),(-1,1),(0,0),(1.5,1.5),(3,0),(3,2)]),
}
def build(P,sw=.30,R=86):
    (cx,cy),r=mec(P); u=R/(r+sw/2)
    T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    return 'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P)), u*sw, T, u, (cx,cy), r
def logo(P,bg,fg,sw=.30):
    d,w,*_=build(P,sw)
    return svg(f'<rect width="256" height="256" fill="{bg}"/><path d="{d}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
for k,(lab,P) in SETS.items():
    open(f'{k}-dark.svg','w').write(logo(P,K,W)); open(f'{k}-light.svg','w').write(logo(P,'#F4F5F7',K))
    a=[math.degrees(math.atan2(P[i+1][1]-P[i][1],P[i+1][0]-P[i][0])) for i in range(5)]
    print(k,lab,'segment angles',[round(x,1) for x in a])
# construction sheet for A on the 2:3 lattice
P=SETS['A'][1]; d,w,T,u,(cx,cy),r=build(P)
g=''
for i in range(-12,16):  # lines of slope ±1.5 through x = i/3
    for sgn in (1,-1):
        x0=i/3; a=T((x0-3/1.5*sgn*0+(-3)/1.5*sgn, -3)); b=T((x0+ (5)/1.5*sgn, 5))
        g+=f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>'
h=''.join(f'<line x1="{T((-2,y))[0]:.1f}" y1="{T((-2,y))[1]:.1f}" x2="{T((3,y))[0]:.1f}" y2="{T((3,y))[1]:.1f}"/>' for y in (0,1,1.5,2))
C=T((cx,cy))
sheet=f'<rect width="256" height="256" fill="#F4F5F7"/><g stroke="#9FB2E8" stroke-width=".5" fill="none" opacity=".8">{g}</g><g stroke="#7E8AA8" stroke-width=".6" stroke-dasharray="3 4">{h}</g><circle cx="{C[0]:.1f}" cy="{C[1]:.1f}" r="{r*u:.1f}" fill="none" stroke="#E0457B" stroke-width="1" stroke-dasharray="4 3"/><path d="{d}" fill="none" stroke="{K}" stroke-opacity=".9" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#F4F5F7" stroke-width="1"/>'
sheet+=''.join(f'<circle cx="{T(p)[0]:.1f}" cy="{T(p)[1]:.1f}" r="3" fill="#E0457B"/>' for p in P)+f'<circle cx="{C[0]:.1f}" cy="{C[1]:.1f}" r="2.5" fill="#E0457B"/>'
open('construction-A.svg','w').write(svg(sheet))
