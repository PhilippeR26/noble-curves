

import * as stark from '../stark';
//import { starkCurve } from '../utils/ec';
/* eslint-disable prefer-template */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */
// eslint-disable-next-line import/order
// import fs from 'fs';
/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
/* eslint-disable prettier/prettier */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
// test
// import { addHexPrefix } from '../utils/encode';

const hexes = Array.from({ length: 256 }, (v, i) => i.toString(16).padStart(2, '0'));

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}

/**
 * y² = x³ + ax + b: Short weierstrass curve formula
 * @returns y²
 */
function weierstrassEquation(x: bigint): bigint {
  const { a, b } = stark.CURVE;
  return x * x * x + a * x + b;
}
function isValidFieldElement(num: bigint): boolean {
  return stark.CURVE.Fp.ZERO < num && num < stark.CURVE.Fp.ORDER; // 0 is banned since it's not invertible FE
}
// const privKeyRandom=starkCurve.utils.randomPrivateKey;
const privateKey = '0x5b7d4f8710b3581ebb2b8b74efaa23d25ab0ffea2a4f3e269bf91bf9f63d633';
const pubKeySource = stark.getPublicKey(privateKey, false); // complete
const starknetPubKey = stark.getStarkKey(privateKey); // only X part
console.log('fullpubKey    =', bytesToHex(pubKeySource));
console.log('starknetPubKey= ', starknetPubKey);

// code inspired from https://github.com/paulmillr/noble-curves/blob/669641e0a3692140eb5d1ab9298c1bfb9592df9f/src/abstract/weierstrass.ts#L694
const x = BigInt(starknetPubKey);
if (!isValidFieldElement(x))
  throw new Error('Public key provided not valid : Point is not on curve');
const y2 = weierstrassEquation(x); // y² = x³ + ax + b
const y = stark.CURVE.Fp.sqrt(y2); // y = y² ^ (p+1)/4
const yneg = stark.CURVE.Fp.neg(y); // to use if HEAD and y do not have same parity
// HEAD (0x02 or 0x03) is unknown (not provided by Starknet).
// So both solutions (y and neg y) have to verify the result.
// if one succeeds, verification is TRUE.
const pubKeySolution1 = '0x040' + x.toString(16) + '0' + y.toString(16);
const pubKeySolution2 = '0x040' + x.toString(16) + '0' + yneg.toString(16);
console.log('Calculated pubKey solutions are =\n', pubKeySolution1, "\n", pubKeySolution2);

// test
const message = ['0x53463473467', '0x879678967', '0x67896789678'];
const msgHash = stark.hashChain(message) as string;
const sign = stark.sign(msgHash, privateKey);

const verif1 = stark.verify(sign, msgHash, pubKeySolution1);
const verif2 = stark.verify(sign, msgHash, pubKeySolution2);
const verif = verif1 || verif2;
console.log('verif1 =', verif1);
console.log('verif2 =', verif2);
console.log('final result =', verif);


