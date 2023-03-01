// import { addHexPrefix } from "../utils/encode";
// eslint-disable-next-line import/order
import * as fs from 'fs';

// import { addHexPrefix } from '../utils/encode';
/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
// test newMerkle
// import * as starkCurve from '../stark';
import { StarknetMerkleTree } from './3. merkle';
import type { inputForMerkle } from './3. merkle';

const datas: inputForMerkle[] = [
  ['0x69b49c2cc8b16e80e86bfc5b0614a59aa8c9b601569c7b80dde04d3f3151b79', '256'],
  ['0x3cad9a072d3cf29729ab2fad2e08972b8cfde01d4979083fb6d15e8e66f8ab1', '25'],
  ['0x27d32a3033df4277caa9e9396100b7ca8c66a4ef8ea5f6765b91a7c17f0109c', '56'],
  ['0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a', '26'],
  ['0x53c615080d35defd55569488bc48c1a91d82f2d2ce6199463e095b4a4ead551', '56'],
];

// const datas: inputForMerkle[] = ['0x567', '0x12', '0x34a567f', '0x9a23e2', '0x67890'];

// const dep: bigint = BigInt('0x19299c32cf2dcf9432a13c0cee07077d711faadd08f59049ca602e070c9ebb');
// const datas: inputForMerkle[] = [];
// for (let i = 0; i < 5; i += 1) [
//     datas.push([addHexPrefix((dep - BigInt(i)).toString(16)), addHexPrefix(i.toString(16))]);
// }
// console.log(datas);

const timeStartNew = new Date();
// console.log("start =", timeStartNew);
const tree = StarknetMerkleTree.create(datas);
const timeEndNew = new Date();
// console.log("end =", timeEndNew);
const durationNew = timeEndNew.getTime() - timeStartNew.getTime();
console.log('duration new =', durationNew, 'ms');
for (const [i, v] of tree.entries()) {
  console.log('entry ', i, '=', v);
}
console.log(tree.render());
console.log("root =", tree.root);

console.log('input =', datas[3]);
console.log('leafHash =', StarknetMerkleTree.leafHash(datas[3]));
// const h0 = starkCurve.pedersen('0x00', datas[3][0] as string);
// console.log('datas 3 1 =', datas[3][1], typeof datas[3]);
// console.log('h0 =', h0, typeof h0);

// const h1 = starkCurve.pedersen(h0, datas[3][1] as string);
// const h1bis = starkCurve.pedersen(
//   '0x504a6b3f3921d54dc36ce8d40220cc1c060b71da1c3c5d8bfeff1675cfbfaac',
//   26
// );
// const h2 = starkCurve.pedersen(h1, 2);
// console.log('hash0&1&2 =', h0, h1, h1bis, h2);
// const h=datas[3]

const proof = tree.getProof(datas[3]);
console.log('proof =', proof);
const verify = tree.verify(datas[3], proof);
console.log('verify =', verify);
tree.validate(); // error if fail

fs.writeFileSync('./tree.json', JSON.stringify(tree.dump()));
StarknetMerkleTree.load(JSON.parse(fs.readFileSync('./tree.json', 'ascii')));
// console.log(tree2.render());
