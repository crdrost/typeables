const surrogateLo = 0xd800;
const surrogateHi = 0xe000;

export function randUnicode() {
  let rand = 0;
  do {
    rand = Math.floor(Math.random() * 17 * 65536);
  } while (rand < surrogateHi && rand >= surrogateLo);
  if (rand >= 0x10000) {
    const base = rand - 0x10000;
    const lo = base & 0x3ff;
    const hi = base >> 10;
    return String.fromCharCode(hi + 0xd800, lo + 0xdc00);
  }
  return String.fromCharCode(rand);
}

export function unUnicode(s: string): number {
  function err(msg: string): TypeError {
    return new TypeError('unUnicode(' + JSON.stringify(s) + '): ' + msg);
  }
  switch (s.length) {
    case 0:
      throw err('called on an empty string');
    case 1: {
      const c = s.charCodeAt(0);
      if (c < surrogateHi && c >= surrogateLo) {
        throw err('called on only one half of a surrogate pair');
      }
      return c;
    }
    case 2: {
      const hi = s.charCodeAt(0) - 0xd800;
      const lo = s.charCodeAt(1) - 0xdc00;
      if (hi < 0 || hi >= 0x400) {
        throw err('first char is not a high half of a surrogate pair');
      }
      if (lo < 0 || lo >= 0x400) {
        throw err('second char is not a low half of a surrogate pair');
      }
      return 0x10000 + (hi << 10) + lo;
    }
    default:
      throw err('string is too long to be just one unicode code point');
  }
}
