exec(open('base.py').read().split("V={")[0])
s3=3**.5
F={
 'E':[(0,2),(-1,1),(0,0),(1.5,1.5),(3,0),(3,2)],
 'B':[(0,2),(-1,1),(0,0),(s3/2,1.5),(2,0),(2,2)],
 'C':[(0,2),(-1,1),(0,0),(1,1.5),(2,0),(2,2)],
 'A':[(0,2),(-2/3,1),(0,0),(1,1.5),(2,0),(2,2)],
 'Eh':[(0,2),(-.5,1.5),(0,1),(1.5,1.5),(3,0),(3,2)],   # E with a shallower hook
}
F['Eh']=[(0,2),(-.5,1.5),(0,1),(1,0.5),(2,1.5),(2,2)] if False else F['Eh']
r90=lambda P:[(y,-x) for x,y in P]; rm90=lambda P:[(-y,x) for x,y in P]
V=[]
for rot,R in (('Σ',r90),('Ʒ',rm90)):
    for key,lab,sw in (('E','E',.30),('B','B',.30),('C','C',.30),('A','A',.30),('E','E fino',.22),('E','E grosso',.38)):
        V.append((f'{rot}{lab}',R(F[key]),sw))
def build(P,sw,R=86):
    (cx,cy),r=mec(P); u=R/(r+sw/2); T=lambda p:(128+(p[0]-cx)*u,128-(p[1]-cy)*u)
    return 'M'+'L'.join(f'{x:.2f} {y:.2f}' for x,y in map(T,P)),u*sw
out=[]
for i,(lab,P,sw) in enumerate(V):
    fn=f'v{i:02d}'
    for nm,bg,fg in (('dark',K,W),('light','#F4F5F7',K)):
        d,w=build(P,sw)
        open(f'{fn}-{nm}.svg','w').write(svg(f'<rect width="256" height="256" fill="{bg}"/><path d="{d}" fill="none" stroke="{fg}" stroke-width="{w:.2f}" stroke-linecap="round" stroke-linejoin="round"/>'))
    out.append(f'{fn}\t{lab[0]} · {lab[1:]}')
open('labels.txt','w').write('\n'.join(out)+'\n')
