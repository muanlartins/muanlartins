exec(open('base.py').read().split("V={")[0])
import itertools, sys
s3=3**.5
G={'A':[(0,2),(-2/3,1),(0,0),(1,1.5),(2,0),(2,2)],'E':[(0,2),(-1,1),(0,0),(1.5,1.5),(3,0),(3,2)],'C':[(0,2),(-1,1),(0,0),(1,1.5),(2,0),(2,2)]}
r90=lambda P:[(y,-x) for x,y in P]
OPS={'mv':lambda P:[(-x,y) for x,y in P],'mh':lambda P:[(x,-y) for x,y in P],'r2':lambda P:[(-x,-y) for x,y in P]}
def combos(geo):
    S=r90(G[geo]); out=[]
    for op,f in OPS.items():
        T=f(S)
        for i in range(6):
            for j in range(6):
                dx,dy=S[i][0]-T[j][0],S[i][1]-T[j][1]
                T2=[(x+dx,y+dy) for x,y in T]
                out.append((f'{geo}-{op}-{i}{j}',[S,T2]))
    return out
def build(paths,sw=.26,R=88):
    pts=[p for P in paths for p in P]; (cx,cy),r=mec(pts); u=R/(r+sw/2)
    T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    return ''.join('M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P)) for P in paths),u*sw
def render(paths,bg=K,fg=W,sw=.26):
    d,w=build(paths,sw)
    return svg(f'<rect width="256" height="256" fill="{bg}"/><path d="{d}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
if __name__=='__main__':
    import os; os.makedirs('all',exist_ok=True)
    for geo in sys.argv[1:]:
        for k,paths in combos(geo):
            open(f'all/{k}.svg','w').write(render(paths))
