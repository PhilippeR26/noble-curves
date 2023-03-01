/* eslint-disable prettier/prettier */
import * as starkCurve from '../stark';
import { encode, number } from 'starknet';

// ***************************************************************
// StarknetMerkleTree, based on Openzeppelin version for Ethereum, adapted for Starknet.js
// https://github.com/OpenZeppelin/merkle-tree

export type inputForMerkle = string | string[];

interface valueAndHash {
  val: inputForMerkle;
  valueInd: number;
  hash: bigint;
}

interface StarknetMerkleTreeData {
  format: 'standard-v1';
  tree: string[];
  values: {
    value: inputForMerkle;
    treeIndex: number;
  }[];
}

function throwError(message?: string): never {
  throw new Error(message);
}

export function toBigInt(value: string): bigint {
  return BigInt(value);
}

const leftChildIndex = (i: number) => 2 * i + 1;
const rightChildIndex = (i: number) => 2 * i + 2;

export const hashPair = (a: bigint, b: bigint) =>
  BigInt(a) - BigInt(b) >= 0n
    ? toBigInt(starkCurve.pedersen(b, a))
    : toBigInt(starkCurve.pedersen(a, b));

export function hashDataToHex(data: inputForMerkle): string {
  let aa: string[] = [];
  if (Array.isArray(data)) {
    aa = data;
  } else {
    aa.push(data);
  }
  return encode.addHexPrefix(starkCurve.computeHashOnElements(aa).toString(16));
}

export function hashDataToBigInt(data: inputForMerkle): bigint {
  let aa: string[] = [];
  if (Array.isArray(data)) {
    aa = data;
  } else {
    aa.push(data);
  }
  return starkCurve.computeHashOnElements(aa) as bigint;
}

function makeMerkleTree(leaves: bigint[]): bigint[] {
  if (leaves.length === 0) {
    throw new Error('Expected non-zero number of leaves');
  }
  const tree = new Array<bigint>(2 * leaves.length - 1);
  // eslint-disable-next-line no-restricted-syntax
  for (const [i, leaf] of leaves.entries()) {
    tree[tree.length - 1 - i] = leaf;
  }
  for (let i = tree.length - 1 - leaves.length; i >= 0; i -= 1) {
    tree[i] = hashPair(tree[leftChildIndex(i)], tree[rightChildIndex(i)]);
  }
  return tree;
}

const isTreeNode = (tree: bigint[], i: number) => i >= 0 && i < tree.length;
const isInternalNode = (tree: bigint[], i: number) => isTreeNode(tree, leftChildIndex(i));
const isLeafNode = (tree: bigint[], i: number) => isTreeNode(tree, i) && !isInternalNode(tree, i);
const checkLeafNode = (tree: bigint[], i: number) =>
  isLeafNode(tree, i) || throwError('Index is not a leaf');
const parentIndex = (i: number) =>
  i > 0 ? Math.floor((i - 1) / 2) : throwError('Root has no parent');
const siblingIndex = (i: number) =>
  i > 0 ? i - (-1) ** (i % 2) : throwError('Root has no siblings');

function getProof(tree: bigint[], index: number): bigint[] {
  checkLeafNode(tree, index);
  // eslint-disable-next-line prefer-const
  let idx = index;
  const proof: bigint[] = [];
  while (idx > 0) {
    proof.push(tree[siblingIndex(idx)]!);
    idx = parentIndex(idx);
  }
  return proof;
}

function biToHex(b: bigint): string {
  return encode.addHexPrefix(b.toString(16));
}

function processProof(leaf: bigint, proof: bigint[]): bigint {
  return proof.reduce(hashPair, leaf);
}

function isValidMerkleTree(tree: bigint[]): boolean {
  // eslint-disable-next-line no-restricted-syntax
  for (const [i, node] of tree.entries()) {
    const l = leftChildIndex(i);
    const r = rightChildIndex(i);
    if (r >= tree.length) {
      if (l < tree.length) {
        return false;
      }
    } else if (!(node === hashPair(tree[l], tree[r]))) {
      return false;
    }
  }
  return tree.length > 0;
}

function renderMerkleTree(tree: bigint[]): string {
  if (tree.length === 0) {
    throw new Error('Expected non-zero number of nodes');
  }
  const stack: [number, number[]][] = [[0, []]];
  const lines = [];
  while (stack.length > 0) {
    const [i, path] = stack.pop()!;
    lines.push(
      // eslint-disable-next-line prefer-template
      path
        .slice(0, -1)
        .map((p) => ['   ', '│  '][p])
        .join('') +
      path
        .slice(-1)
        .map((p) => ['└─ ', '├─ '][p])
        .join('') +
      i +
      ') ' +
      encode.addHexPrefix(tree[i].toString(16))
    );
    if (rightChildIndex(i) < tree.length) {
      stack.push([rightChildIndex(i), path.concat(0)]);
      stack.push([leftChildIndex(i), path.concat(1)]);
    }
  }
  return lines.join('\n');
}

// class ********************************
export class StarknetMerkleTree {
  private readonly hashLookup: { [hash: string]: number };

  private constructor(
    public readonly tree: bigint[],
    private readonly values: { value: inputForMerkle; treeIndex: number }[]
  ) {
    const mapping = values.map(({ value }, valueIndex) => {
      return [hashDataToHex(value), valueIndex];
    });
    this.hashLookup = Object.fromEntries(mapping);
  }

  private static adaptInputItem(element: string): string {
    return number.getHexString(element);
  }

  static create(values: inputForMerkle[]): StarknetMerkleTree {
    // verification of inputs
    const checkedValues = values.map((item: inputForMerkle) => {
      if (typeof item === 'string') {
        return StarknetMerkleTree.adaptInputItem(item);
      }
      return item.map(StarknetMerkleTree.adaptInputItem);
    });
    // calculate and store
    const hashedValues = checkedValues
      .map(
        (value, valueIndex) =>
          ({ val: value, valueInd: valueIndex, hash: hashDataToBigInt(value) } as valueAndHash)
      )
      .sort((a, b) => (a.hash - b.hash >= 0n ? 1 : -1));
    const tree = makeMerkleTree(hashedValues.map((v) => v.hash));

    const indexedValues = checkedValues.map((value) => ({ value, treeIndex: 0 }));
    // eslint-disable-next-line no-restricted-syntax
    for (const [leafIndex, { valueInd }] of hashedValues.entries()) {
      indexedValues[valueInd].treeIndex = tree.length - leafIndex - 1;
    }
    return new StarknetMerkleTree(tree, indexedValues);
  }

  static load(data: StarknetMerkleTreeData): StarknetMerkleTree {
    if (data.format !== 'standard-v1') {
      throw new Error(`Unknown format '${data.format}'`);
    }
    return new StarknetMerkleTree(data.tree.map(BigInt), data.values);
  }

  dump(): StarknetMerkleTreeData {
    return {
      format: 'standard-v1',
      tree: this.tree.map(biToHex),
      values: this.values,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  get root(): string {
    return encode.addHexPrefix(this.tree[0].toString(16));
  }

  *entries(): Iterable<[number, inputForMerkle]> {
    // eslint-disable-next-line no-restricted-syntax
    for (const [i, { value }] of this.values.entries()) {
      yield [i, value];
    }
  }

  validate() {
    for (let i = 0; i < this.values.length; i += 1) {
      this.validateValue(i);
    }
    if (!isValidMerkleTree(this.tree)) {
      throw new Error('Merkle tree is invalid');
    }
  }

  static leafHash(leaf: inputForMerkle): string {
    if (typeof leaf === 'string') {
      return hashDataToHex(StarknetMerkleTree.adaptInputItem(leaf));
    }
    const adaptedLeaf = leaf.map(StarknetMerkleTree.adaptInputItem) as string[];
    return hashDataToHex(adaptedLeaf);
  }

  leafLookup(leaf: inputForMerkle): number {
    return (
      this.hashLookup[StarknetMerkleTree.leafHash(leaf)] ??
      throwError(`'This leaf is not in tree': ${leaf}`)
    );
  }

  getProof(leaf: number | inputForMerkle): string[] {
    const valueIndex = typeof leaf === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);
    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof: bigint[] = getProof(this.tree, treeIndex);
    // sanity check proof
    if (!this.internVerify(this.tree[treeIndex], proof)) {
      throw new Error('Unable to prove value');
    }
    return proof.map(biToHex);
  }

  verify(leaf: number | inputForMerkle, proof: string[]): boolean {
    return this.internVerify(this.getLeafHash(leaf), proof.map(BigInt));
  }

  private internVerify(leafHash: bigint, proof: bigint[]): boolean {
    const impliedRoot = processProof(leafHash, proof);
    return impliedRoot === this.tree[0];
  }

  private checkBounds(array: unknown[], index: number) {
    if (index < 0 || index >= array.length) {
      throw new Error('Index out of bounds');
    }
  }

  private validateValue(valueIndex: number): bigint {
    this.checkBounds(this.values, valueIndex);
    const { value, treeIndex } = this.values[valueIndex];
    this.checkBounds(this.tree, treeIndex);
    const leafHash: bigint = hashDataToBigInt(value);
    if (!(leafHash === this.tree[treeIndex])) {
      throw new Error('Merkle tree does not contain the expected value');
    }
    return leafHash;
  }

  private getLeafHash(leaf: number | inputForMerkle): bigint {
    if (typeof leaf === 'number') {
      return this.validateValue(leaf);
    }
    if (typeof leaf === 'string') {
      return hashDataToBigInt(StarknetMerkleTree.adaptInputItem(leaf));
    }
    const adaptedLeaf = leaf.map(StarknetMerkleTree.adaptInputItem) as string[];
    return hashDataToBigInt(adaptedLeaf);
  }
}


