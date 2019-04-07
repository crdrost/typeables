import { Typeable } from './typeable';
import { randUnicode, unUnicode } from './lib/rand-unicode';
import { shrinkList } from './lib/shrink-list';
import { isDigit, isSpace, isLower, isUpper } from './lib/string-regexes';

/**
 * Create a typeable for boolean flags.
 */
export function bool(): Typeable<boolean> {
  return {
    arbitrary() {
      return Math.random() < 0.5;
    },
    shrink(x) {
      return x ? [false] : [];
    },
    schema: { type: ['boolean'] }
  };
}

/**
 * Internal: convert a unicode character to a number representing it.
 * @param c - the unicode character. Could be one or two JS characters long.
 */
function charNum(c: string): number {
  // this implements the stamp() function from
  // http://hackage.haskell.org/package/QuickCheck-2.13.1/docs/src/Test.QuickCheck.Arbitrary.html#line-656
  const n = unUnicode(c);
  const flags =
    (isLower.exec(c) ? 0 : 0x10) +
    (isUpper.exec(c) ? 0 : 8) +
    (isDigit.exec(c) ? 0 : 4) +
    (c === ' ' ? 0 : 2) +
    (isSpace.exec(c) ? 0 : 1);
  return (flags << 21) + n; // 5 bits for plane, 16 bits for codepoint.
}
/**
 * Internal: the default candidates we use to shrink a string
 */
const charShrinkCandidates = 'abcABC123 \n'
  .split('')
  .map(x => ({ orig: x, value: charNum(x) }));

/**
 * Create a typeable for strings. We do not expose the regex string of JSONSchema because we do not have an engine which
 * will reverse-engineer a regex into a fuzzer.
 * @param opts.minLength - The JSONSchema minimum length
 * @param opts.maxLength - The JSONSchema maximum length
 * @param opts.ascii - Set to true to restrict a string to the ASCII subset, else the generator will generate interesting Unicode strings, too.
 */
export function text(
  opts: {
    minLength?: number;
    maxLength?: number;
    ascii?: boolean;
  } = {}
): Typeable<string> {
  const minLength = opts.minLength || 0;
  const maxLength = opts.maxLength === undefined ? Infinity : opts.maxLength;
  if (maxLength < minLength) {
    throw new TypeError(
      'Tried to create a typeables.text with maxLength < minLength'
    );
  }
  return {
    arbitrary(size) {
      // if size < maxLength use size, else use maxLength.
      // But if size < minLength < maxLength, use minLength.
      const maxLength = Math.max(
        minLength,
        Math.min(size, opts.maxLength === undefined ? Infinity : opts.maxLength)
      );
      const len =
        minLength + Math.floor(Math.random() * (maxLength + 1 - minLength));
      let out = '';
      for (let i = 0; i < len; i++) {
        if (opts.ascii || Math.random() < 0.75) {
          out += String.fromCharCode(Math.floor(128 * Math.random()));
        } else {
          out += randUnicode();
        }
      }
      return out;
    },
    shrink: function* shrinkString(val) {
      // we split this into distinct unicode code points, so this skips the point
      // immediately before the high side of a surrogate pair but otherwise splits all
      // string characters.
      const chars = val.split(/(?![\ud800-\udbff])/g);
      // then we feed this string[] into shrinkList to get an Iterable<string[]>.
      const listOptions = shrinkList(chars, function* shrinkChar(c) {
        const lc = c.toLowerCase();
        const candidates = charShrinkCandidates.concat(
          lc !== c ? [{ orig: lc, value: charNum(lc) }] : []
        );
        const cValue = charNum(c);
        // we take our list of candidates, get each one's charNum value,
        // sort by that value in ascending order so that we can remove duplicates
        // by filtering out cases where arr[i-1] == arr[i], and finally remove
        // anything whose value is >= our target value.
        const valued = candidates
          .sort((x, y) => x.value - y.value)
          .filter(
            (x, i, arr) =>
              x.value < cValue && (i === 0 || arr[i - 1].value !== x.value)
          );
        yield* valued.map(x => x.orig);
      });
      // we traverse that Iterable<string[]> and join all of those character-by-
      // character strings back into a single string.
      for (const option of listOptions) {
        yield option.join('');
      }
    },
    schema: {
      type: ['string'],
      minLength: opts.minLength,
      maxLength: opts.maxLength,
      pattern: opts.ascii ? '^[\u0000-\u007f]*$' : undefined
    }
  };
}
/**
 * Create a typeable for numbers.
 * @param opts
 */
export function num(
  opts: {
    max?: number;
    min?: number;
    integer?: boolean;
  } = {}
): Typeable<number> {
  // there is technically nothing wrong with a JSON schema for an integer between
  // -5.5 and +6.5, it just means an integer between -5 and 6. So we cast those here.
  const integral = !!opts.integer;
  const min =
    opts.min === undefined || !isFinite(opts.min)
      ? null
      : integral
      ? Math.ceil(opts.min)
      : opts.min;
  const max =
    opts.max === undefined || !isFinite(opts.max)
      ? null
      : integral
      ? Math.floor(opts.max)
      : opts.max;
  if (min !== null && max !== null && min >= max) {
    throw new TypeError(
      'tried to create an invalid typeable.num from opts ' +
        JSON.stringify(opts)
    );
  }
  function inBounds(x: number): boolean {
    return (min === null || x >= min) && (max === null || x <= max);
  }
  // if the bounds are one-sided or no-sided then we use the size parameter to enforce
  function bounds(size: number): [number, number] {
    if (min === null) {
      if (max === null) {
        return [-size, size];
      }
      return [max - 2 * size, max];
    }
    if (max === null) {
      return [min, min + 2 * size];
    }
    return [min, max];
  }
  return {
    arbitrary(size) {
      const [lo, hi] = bounds(size);
      return integral
        ? Math.floor(lo + (hi - lo + 1) * Math.random())
        : lo + (hi - lo) * Math.random();
    },
    shrink: function* shrinkNumber(val) {
      if (integral) {
        if (val < 0) {
          const neg = -val;
          if (inBounds(neg)) {
            yield neg;
          }
        }
        let c = val;
        let v = val - c;
        while (Math.abs(v) < Math.abs(val)) {
          if (inBounds(v)) {
            yield v;
          }
          c /= 2;
          v = Math.round(val - c);
        }
      } else {
        for (let i = 0; i < 12; i++) {
          const p = 10 ** i;
          const v = Math.round(p * val) / p;
          if (inBounds(v) && Math.abs(v) < Math.abs(val)) {
            yield v;
          }
        }
      }
    },
    schema: {
      type: [opts.integer ? 'integer' : 'number'],
      minimum: opts.min,
      maximum: opts.max
    }
  };
}
