import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Run the actual page's ZIP grouping code, not a duplicated implementation.
const source=readFileSync(new URL('../auto-seamless/commercial-kit.js',import.meta.url),'utf8');
const start=source.indexOf(' function packedSize(files){'),end=source.indexOf('\n function refresh(){',start);
assert.ok(start>=0&&end>start,'Cannot locate the commercial ZIP packaging implementation');
const {pack,packedSize}=new Function('MAX','encode',source.slice(start,end)+';return {pack,packedSize};')(20_000_000,s=>new TextEncoder().encode(s));
const file=(name,length)=>({name,data:{length}});
const documents=[
 file('LICENSE.txt',1450),
 file('README.txt',990),
 file('ABOUT-SAPIVER-PRINTS.txt',1100)
];

test('every independently downloadable ZIP contains the licence, About and instructions',()=>{
 const parts=pack([file('full.png',12_000_000),file('second.png',11_000_000),file('other.jpg',800_000)],documents);
 assert.equal(parts.length,2);
 for(const part of parts){
  for(const doc of documents)assert.ok(part.includes(doc),doc.name+' is missing from a ZIP');
  assert.ok(part.some(f=>f.name.endsWith('.png')||f.name.endsWith('.jpg')));
  assert.ok(packedSize(part)<=20_000_000);
 }
});

test('missing required buyer document blocks export rather than silently producing an incomplete ZIP',()=>{
 assert.throws(()=>pack([file('full.png',100)],documents.slice(0,2)),/All three buyer documents/);
 assert.throws(()=>pack([],documents),/at least one artwork file/);
});

test('oversize artwork and more than five files block export rather than drop the documents',()=>{
 assert.throws(()=>pack([file('large.png',19_999_000)],documents),/required licence/);
 assert.throws(()=>pack(Array.from({length:6},(_,i)=>file('tile-'+i+'.png',10_000_000)),documents),/more than five/);
});
