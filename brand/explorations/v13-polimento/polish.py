exec(open('base.py').read().split("V={")[0])
KL='#002FA7'; INK='#0F1115'; PAP='#F4F5F7'
S0=[(2,0),(1,1),(0,0),(1.5,-1.5),(0,-3),(2,-3)]
T0=[(1,-2),(2,-3),(3,-2),(1.5,-.5),(3,1),(1,1)]
JUN=[((2,0),'S'),((1,1),'S'),((1,-2),'T'),((2,-3),'T')]   # (point, copy on top)
def render(bg,cS,cT,sw=.24,gap=.65,cut='round',join='round',k=1,R=88,size=256):
    S=[(x,y*k) for x,y in S0]; T=[(x,y*k) for x,y in T0]
    (cx,cy),r=mec(S+T); u=R/(r+sw/2); w=u*sw; g=gap*w
    X=lambda p:(128+(p[0]-cx)*u,128-(p[1]-(cy))*u)
    pd=lambda Q:'M'+'L'.join('%.3f %.3f'%X(p) for p in Q)
    cap,lj=('round','round') if join=='round' else ('square','miter')
    hcap,hj=('round','round') if cut=='round' else ('square','miter')
    P={'S':S,'T':T}
    defs=''
    for under in 'ST':
        over='T' if under=='S' else 'S'
        holes=''
        for i,((x,y),top) in enumerate(JUN):
            if top!=over: continue
            c=X((x,y*k)); cid=f'c{under}{i}'
            defs+=f'<clipPath id="{cid}"><circle cx="{c[0]:.3f}" cy="{c[1]:.3f}" r="{(w+2*g)*1.7:.3f}"/></clipPath>'
            holes+=f'<path d="{pd(P[over])}" clip-path="url(#{cid})" fill="none" stroke="#000" stroke-width="{w+2*g:.3f}" stroke-linecap="{hcap}" stroke-linejoin="{hj}" stroke-miterlimit="10"/>'
        defs+=f'<mask id="m{under}" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256"><rect width="256" height="256" fill="#fff"/>{holes}</mask>'
    st=lambda n,c:f'<path d="{pd(P[n])}" mask="url(#m{n})" fill="none" stroke="{c}" stroke-width="{w:.3f}" stroke-linecap="{cap}" stroke-linejoin="{lj}" stroke-miterlimit="10"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="{size}" height="{size}"><defs>{defs}</defs><rect width="256" height="256" fill="{bg}"/>{st("T",cT)}{st("S",cS)}</svg>'
V=[
 ('Klein · polido (cortes curvos)',dict(bg=KL,cS=W,cT='#8EA6EE')),
 ('Klein · cortes retos',dict(bg=KL,cS=W,cT='#8EA6EE',cut='straight')),
 ('Klein · vão estreito',dict(bg=KL,cS=W,cT='#8EA6EE',gap=.4)),
 ('Klein · cantos vivos',dict(bg=KL,cS=W,cT='#8EA6EE',cut='straight',join='sharp')),
 ('Quase preto · branco + azul claro',dict(bg=INK,cS=PAP,cT='#5B87F8')),
 ('Quase preto · branco + Klein',dict(bg=INK,cS=PAP,cT=KL)),
 ('Quase branco · Klein + azul claro',dict(bg=PAP,cS=KL,cT='#7F97DA')),
 ('Quase branco · quase preto + Klein',dict(bg=PAP,cS=INK,cT=KL)),
]
out=[]
for i,(lab,kw) in enumerate(V):
    open(f'p{i}.svg','w').write(render(**kw)); out.append(f'p{i}\t{i+1} · {lab}')
open('labels.txt','w').write('\n'.join(out)+'\n')
