import sys
sys.argv=['x']; exec(open('glue.py').read().split("if __name__")[0])
C=dict(combos('A'))
picks=[('A-mv-00','Coroa'),('A-mv-22','Gema'),('A-mv-33','Coração'),('A-mv-55','Coroa aberta'),('A-mv-11','Ampulheta'),('A-mv-44','Envelope'),
       ('A-mh-05','Σ com diamantes'),('A-mh-33','Σ duplo'),('A-mh-00','Coluna'),('A-r2-04','Corrente de diamantes'),('A-r2-15','S com diamante'),('A-r2-33','S cruzado')]
for i,(k,lab) in enumerate(picks):
    open(f'p{i:02d}-dark.svg','w').write(render(C[k]))
    open(f'p{i:02d}-light.svg','w').write(render(C[k],'#F4F5F7',K))
open('labels.txt','w').write('\n'.join(f'p{i:02d}\t{i+1} · {lab}' for i,(k,lab) in enumerate(picks))+'\n')
open('keys.txt','w').write('\n'.join(f'{i+1} {k}' for i,(k,lab) in enumerate(picks))+'\n')
