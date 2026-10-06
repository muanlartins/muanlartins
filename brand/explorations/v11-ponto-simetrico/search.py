exec(open('base.py').read().split("V={")[0])
import math, itertools, json, sys
s3=3**.5
G={'A':[(0,2),(-2/3,1),(0,0),(1,1.5),(2,0),(2,2)],'E':[(0,2),(-1,1),(0,0),(1.5,1.5),(3,0),(3,2)],'C':[(0,2),(-1,1),(0,0),(1,1.5),(2,0),(2,2)],'B':[(0,2),(-1,1),(0,0),(s3/2,1.5),(2,0),(2,2)]}
r90=lambda P:[(y,-x) for x,y in P]
def segs(P): return [(P[i],P[i+1]) for i in range(len(P)-1)]
def pdist(p,a,b):
    ax,ay=a;bx,by=b;px,py=p; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
    t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L)); return math.hypot(ax+t*dx-px,ay+t*dy-py)
def inter(a,b,c,d):
    def o(p,q,r): return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    return o(a,b,c)*o(a,b,d)<-1e-9 and o(c,d,a)*o(c,d,b)<-1e-9
def sdist(s,t):
    if inter(*s,*t): return 0
    return min(pdist(s[0],*t),pdist(s[1],*t),pdist(t[0],*s),pdist(t[1],*s))
def evaluate(S,T,sw):
    gap=2.6*sw
    bad=0; touch=False
    for s in segs(S):
        for t in segs(T):
            d=sdist(s,t)
            if d<1e-6: touch=True; 
            elif d<gap: bad+=1
    # endpoint-near-interior inside the same copy is fine by construction
    return bad,touch
def run(geo,sw=.24,step=(.25,1/6)):
    S=r90(G[geo]); R=[(-x,-y) for x,y in S]
    res=[]
    for ix in range(-24,25):
        for iy in range(-24,25):
            d=(ix*step[0],iy*step[1]); T=[(x+d[0],y+d[1]) for x,y in R]
            bad,touch=evaluate(S,T,sw)
            if bad==0 and touch:
                (c,r)=mec(S+T); res.append((r,d))
    res.sort()
    # dedupe near-identical radii
    return S,R,res
if __name__=='__main__':
    geo=sys.argv[1]; S,R,res=run(geo)
    json.dump({'S':S,'R':R,'res':res},open(f'res-{geo}.json','w'))
    print(geo,len(res),'clean offsets')
