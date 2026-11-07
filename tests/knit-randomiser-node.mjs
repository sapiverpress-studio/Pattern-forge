import assert from 'node:assert/strict';
import {randomiseKnitChart,RANDOM_STYLES} from '../knit-studio/pattern-randomiser.mjs';
assert.equal(RANDOM_STYLES.length,6);
for(const n of [12,16,24,32]){
 for(const type of RANDOM_STYLES){
  const a=randomiseKnitChart(n,type,0x7f46a12b);
  const b=randomiseKnitChart(n,type,0x7f46a12b);
  assert.equal(a.cols,n);
  assert.equal(a.rows,n);
  assert.equal(a.cells.length,n*n);
  assert.deepEqual(a,b,'Same seed must reproduce identical editable chart');
  assert.ok(a.cells.every(v=>[0,1,2].includes(v)));
  assert.equal(new Set(a.cells).size,3,'All three yarn colours must be used');
  assert.ok(a.cells.filter(v=>v===0).length>2,'Preserve enough main wool');
  assert.ok(a.cells.filter(v=>v===1).length>0,'Use second wool');
  assert.ok(a.cells.filter(v=>v===2).length>0,'Use third wool');
 }
}
for(const type of RANDOM_STYLES.slice(1)){
 const seen=new Set();
 for(let seed=1;seed<=12;seed++){
  const p=randomiseKnitChart(24,type,seed);
  seen.add(p.signature);
 }
 assert.ok(seen.size>=4,type+' must generate variations, not one fixed preset');
}
assert.throws(()=>randomiseKnitChart(7,'diamonds',3),/Unsupported/);
assert.throws(()=>randomiseKnitChart(12,'rubbish',3),/Unsupported/);
console.log('PASS: six pattern choices, four grid sizes, three yarn colours, repeatable seeds and non-identical variations');
