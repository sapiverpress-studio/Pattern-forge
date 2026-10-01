from pathlib import Path

path=Path('index.html')
text=path.read_text(encoding='utf-8')
old='''  function nextLayerName(){
    let max=0;
    for(const layer of state.layers){
      const match=/^Layer\\s+(\\d+)$/i.exec(String(layer.name||"").trim());
      if(match)max=Math.max(max,Number(match[1])||0);
    }
    return `Layer ${max+1}`;
  }'''
new='''  function nextLayerName(){
    let maxNumber=0;
    for(const layer of state.layers){
      const match=/^Layer\\s+(\\d+)$/i.exec(String(layer.name||"").trim());
      if(match)maxNumber=Math.max(maxNumber,Number(match[1])||0);
    }
    return `Layer ${Math.max(state.layers.length,maxNumber)+1}`;
  }'''
count=text.count(old)
if count!=1:
    raise SystemExit(f'nextLayerName refinement: expected 1 match, found {count}')
text=text.replace(old,new,1)
path.write_text(text,encoding='utf-8')
print('Refined layer numbering for alpha.6.3')
