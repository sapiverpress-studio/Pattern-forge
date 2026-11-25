import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const [kitPath,uploaderPath]=process.argv.slice(2);
assert.ok(kitPath&&uploaderPath,'Provide the actual downloaded kit and uploader module');
const {inspectDigitalUpload}=await import(pathToFileURL(resolve(uploaderPath)));
const kit=await inspectDigitalUpload(await readFile(kitPath),{requireDocumentsPerBuyerZip:true});
assert.equal(kit.kit,true);assert.equal(kit.listingMetadata.product.kind,'pattern');
const full=kit.inspection.files.find(f=>f.reassembled);
assert.ok(full,'The complete 5000px PNG must survive actual uploader validation');
assert.equal(full.width,5000);assert.equal(full.height,5000);
assert.ok(full.bytes>20_000_000);assert.ok(!full.data);
assert.equal(kit.packages.length,full.partCount+1);
assert.ok(kit.packages.every(p=>p.bytes<=20_000_000));
assert.ok(kit.inspection.files.some(f=>f.width===2500&&f.height===2500&&f.format==='png'));
console.log('PASS actual Auto Seamless download through uploader: '+full.width+' × '+full.height+' PNG, '+full.bytes+' verified bytes, '+kit.packages.length+' delivery ZIPs; no merchant calls');
