import { secp256k1 } from '@noble/curves/secp256k1.js';

console.log(Object.keys(secp256k1));
console.log(typeof secp256k1.Point);
console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(secp256k1.Point)));
