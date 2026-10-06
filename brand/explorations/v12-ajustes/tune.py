exec(open('base.py').read().split("V={")[0])
LB='#8EA6EE'; P='#F4F5F7'
S0=[(2,0),(1,1),(0,0),(1.5,-1.5),(0,-3),(2,-3)]
T0=[(1,-2),(2,-3),(3,-2),(1.5,-.5),(3,1),(1,1)]
TJ=[((2,0),'S'),((1,-2),'T')]          # T-junctions: whose stroke end passes over
EJ=[((1,1),'S'),((2,-3),'T')]          # endpoint meets
def render(sw=.24,k=1,join='round',color='mono',weave=None,bg=K,R=88):
    S=[(x,y*k) for x,y in S0]; T=[(x,y*k) for x,y in T0]
    tj=[((x,y*k),o) for (x,y),o in TJ]; ej=[((x,y*k),o) for (x,y),o in EJ]
    (cx,cy),r=mec(S+T); u=R/(r+sw/2); w=u*sw
    X=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    pd=lambda Q:'M'+'L'.join('%.2f %.2f'%X(p) for p in Q)
    fg=W if bg==K else K; alt=LB if bg==K else '#7F97DA'
    cap,lj=('round','round') if join=='round' else (('square','miter') if join=='square' else ('butt','miter'))
    defs=''
    def paint(name,Q):
        nonlocal defs
        if color=='mono': return fg,1
        if color=='duo': return (fg if name=='S' else alt),1
        if color=='duoR': return (alt if name=='S' else fg),1
        if color=='ghost': return fg,(1 if name=='S' else .45)
        if color=='flow':
            a,b=X(Q[0]),X(Q[-1]); gid='g'+name
            defs+=f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}"><stop offset="0" stop-color="{fg}" stop-opacity=".35"/><stop offset="1" stop-color="{fg}"/></linearGradient>'
            return f'url(#{gid})',1
    def st(Q,c,o=1,ww=None): return f'<path d="{pd(Q)}" fill="none" stroke="{c}" stroke-opacity="{o}" stroke-width="{(ww or w):.2f}" stroke-linecap="{cap}" stroke-linejoin="{lj}" stroke-miterlimit="10"/>'
    body=''
    cS,oS=paint('S',S); cT,oT=paint('T',T)
    body+=st(T,cT,oT)+st(S,cS,oS)
    if weave:
        pts=tj+(ej if weave=='all' else [])
        for i,(p,o) in enumerate(pts):
            c=X(p); Q,cc,oo=(S,cS,oS) if o=='S' else (T,cT,oT)
            defs+=f'<clipPath id="c{i}"><circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{w*2.6:.1f}"/></clipPath>'
            body+=f'<g clip-path="url(#c{i})">'+st(Q,bg,1,w*2.3)+st(Q,cc,oo)+'</g>'
    return svg(f'<defs>{defs}</defs><rect width="256" height="256" fill="{bg}"/>'+body)
V=[('peso .16',dict(sw=.16)),('peso .22',dict(sw=.22)),('peso .28',dict(sw=.28)),('peso .34',dict(sw=.34)),('cantos vivos',dict(join='square')),('cantos vivos, pontas retas',dict(join='butt')),
   ('proporção 0,8 (larga)',dict(k=.8)),('proporção 1,2',dict(k=1.2)),('proporção 1,4 (alta)',dict(k=1.4)),('2 cores invertidas',dict(color='duoR')),('cópia translúcida',dict(color='ghost')),('fluxo da escrita',dict(color='flow')),
   ('trama (2 cruzamentos)',dict(weave='tj')),('trama completa',dict(weave='all')),('trama + 2 cores',dict(weave='tj',color='duo')),('trama + fluxo',dict(weave='tj',color='flow')),('trama completa + 2 cores',dict(weave='all',color='duo')),('trama + fluxo, peso .28',dict(weave='tj',color='flow',sw=.28))]
out=[]
for i,(lab,kw) in enumerate(V):
    open(f't{i:02d}-dark.svg','w').write(render(**kw)); open(f't{i:02d}-light.svg','w').write(render(bg=P,**kw))
    out.append(f't{i:02d}\t{i+1} · {lab}')
open('labels.txt','w').write('\n'.join(out)+'\n')
