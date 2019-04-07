/**
 * Port of Haskell's QuickCheck's shrinkList() to JavaScript.
 * @param arr - The list to be shrunk
 * @param shrinker - A function that can take an individual element and return shrunken versions of it.
 */
export function* shrinkList<x>(
  arr: x[],
  shrinker: (x: x) => Iterable<x>
): Iterable<x[]> {
  // see http://hackage.haskell.org/package/QuickCheck-2.13.1/docs/src/Test.QuickCheck.Arbitrary.html#shrinkList
  // for where this "try to halve the list" strategy comes from. Eventually this
  // just tries removing every single element once, when k == 1 (as it must
  // eventually be, as there is some largest 1-bit that is set), but it first
  // tries to remove larger chunks to save time in shrinking. It generates one
  // empty list, then two lists of length L/2, then four lists of length 3L/4,
  // then eight lists of length 7L/8, and so on... so the number of reductions
  // here is bounded by a little more than twice the length of the list itself.
  for (let k = arr.length; k > 0; k >>= 1) {
    const limit = arr.length - k + 1;
    for (let i = 0; i < limit; i += k) {
      yield arr.slice(0, i).concat(arr.slice(i + k));
    }
  }
  // and only when the above cannot remove any individual elements or chunks
  // do we start to reduce each individual element to see what that buys us:
  for (let i = 0; i < arr.length; i++) {
    for (const c of shrinker(arr[i])) {
      const out = arr.slice();
      out[i] = c;
      yield out;
    }
  }
}
