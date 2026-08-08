// Shared row data so every implementation renders exactly the same thing.
const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome',
  'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful',
  'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown',
  'white', 'black', 'orange'];
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie',
  'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

let nextId = 1;
let seed = 0;
// Deterministic, so two implementations get byte-identical labels.
const rnd = (max) => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed % max;
};

export const resetIds = () => {
  nextId = 1;
  seed = 0;
};

export function buildData(count) {
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      id: nextId++,
      label: `${A[rnd(A.length)]} ${C[rnd(C.length)]} ${N[rnd(N.length)]}`,
    };
  }
  return rows;
}
