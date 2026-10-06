import math
K='#002FA7'; W='#F4F5F7'; INK='#0F1115'
phi=(1+5**.5)/2
def pts(e): return [(0,2),(-1,1),(0,0),(1,1),(2,0),(2,e)]
def mec(P):  # minimal enclosing circle (brute force over pairs/triples)
    import itertools
    best=None
    def ok(c,r): return all(math.dist(c,p)<=r+1e-9 for p in P)
    for a,b in itertools.combinations(P,2):
        c=((a[0]+b[0])/2,(a[1]+b[1])/2); r=math.dist(a,b)/2
        if ok(c,r) and (not best or r<best[1]): best=(c,r)
    for a,b,d in itertools.combinations(P,3):
        ax,ay=a;bx,by=b;cx,cy=d; D=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by))
        if abs(D)<1e-9: continue
        ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/D
        uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/D
        r=math.dist((ux,uy),a)
        if ok((ux,uy),r) and (not best or r<best[1]): best=((ux,uy),r)
    return best
def mark(e,center='mec',sw=.30,R=86):
    P=pts(e)
    if center=='mec': (cx,cy),r=mec(P)
    else:
        xs=[p[0] for p in P]; ys=[p[1] for p in P]; cx,cy=(min(xs)+max(xs))/2,(min(ys)+max(ys))/2; r=max(math.dist((cx,cy),p) for p in P)
    u=R/(r+sw/2)   # extreme points (incl. round cap) land on a circle of radius R
    T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    d='M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P))
    return d,u*sw,T,u,(cx,cy),r
def svg(b): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">{b}</svg>'
def logo(e,bg,fg,center='mec',sw=.30):
    d,w,*_=mark(e,center,sw)
    return svg(f'<rect width="256" height="256" fill="{bg}"/><path d="{d}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
V={'A':(3,'bbox',.30),'B':(3,'mec',.30),'C':(1+phi,'mec',.30),'D':(2.5,'mec',.30),'E':(3,'mec',.22),'F':(3,'mec',.38)}
for k,(e,c,sw) in V.items():
    open(f'{k}-dark.svg','w').write(logo(e,K,W,c,sw)); open(f'{k}-light.svg','w').write(logo(e,'#F4F5F7',K,c,sw))
# construction sheet for B
d,w,T,u,(cx,cy),r=mark(3,'mec',.30)
g=''
for i in range(-6,10):   # 45° lattice
    a=T((i-3,-3)); b=T((i+6,6)); g+=f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>'
    a=T((i+3,-3)); b=T((i-6,6)); g+=f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"/>'
for y in range(0,4):
    a=T((-2,y)); b=T((3,y)); g+=f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke-dasharray="3 4"/>'
C=T((cx,cy))
sheet=f'<rect width="256" height="256" fill="#F4F5F7"/><g stroke="#9FB2E8" stroke-width=".6" fill="none">{g}</g><circle cx="{C[0]:.1f}" cy="{C[1]:.1f}" r="{r*u:.1f}" fill="none" stroke="#E0457B" stroke-width="1" stroke-dasharray="4 3"/><path d="{d}" fill="none" stroke="{K}" stroke-opacity=".9" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/><path d="{d}" fill="none" stroke="#F4F5F7" stroke-width="1"/>'
for p in pts(3):
    q=T(p); sheet+=f'<circle cx="{q[0]:.1f}" cy="{q[1]:.1f}" r="3" fill="#E0457B"/>'
sheet+=f'<circle cx="{C[0]:.1f}" cy="{C[1]:.1f}" r="2.5" fill="#E0457B"/>'
open('construction.svg','w').write(svg(sheet))
print('unit px',round(u,2),'stroke px',round(w,2),'mec center',(round(cx,3),round(cy,3)),'r',round(r,3))
