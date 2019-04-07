import { Typeable, ValueOf } from './typeable';
import { shrinkList } from './lib/shrink-list';
import { Schema } from 'jsonschema';
import { text } from './primitives';

/**
 * Derive a typeable which is like the input but can also be JSON `null`.
 * @param typeable - what this is if it is not null.
 */
export function nullable<t>(typeable: Typeable<t>): Typeable<null | t> {
  // we escape TypeScript's type system to copy over all of the unknown schema
  // properties of the jsonschema object.
  const schema = Object.create(null) as any;
  for (const key of Object.keys(typeable.schema)) {
    schema[key] = (typeable.schema as any)[key];
  }
  schema.type = ['null'].concat(typeable.schema.type);
  return {
    arbitrary(size) {
      return Math.random() < 0.25 ? null : typeable.arbitrary(size);
    },
    shrink: function*(val) {
      if (val !== null) {
        yield null;
        yield* typeable.shrink(val);
      }
    },
    schema
  };
}

/**
 * Derive a typeable for lists of Xs from the typeable for Xs.
 * @param typeable - the typeable of the elements of the list.
 */
export function list<t>(typeable: Typeable<t>): Typeable<t[]> {
  return {
    arbitrary(size) {
      const len = Math.floor(Math.random() * (size + 1));
      return [...Array(len)].map(() => typeable.arbitrary(size));
    },
    shrink: val => shrinkList(val, typeable.shrink),
    schema: {
      type: ['array'],
      items: typeable.schema
    }
  };
}

type PropsObj<props extends Record<string, Typeable<any>>> = {
  [k in keyof props]: ValueOf<props[k]>
};

/**
 * Derive a typeable for objects with specific properties, from a dictionary
 * mapping property names to the typeables of their values.
 *
 * @param props - the dictionary mapping property names to typeables of values.
 */
export function object<props extends Record<string, Typeable<any>>>(
  props: props
): Typeable<PropsObj<props>> {
  const propertySchemas = {} as Record<string, Schema>;
  const propNames = Object.keys(props);
  for (const name of propNames) {
    propertySchemas[name] = props[name].schema;
  }
  return {
    arbitrary(size) {
      const out = {} as PropsObj<props>;
      for (const name of propNames) {
        out[name] = props[name].arbitrary(size);
      }
      return out;
    },
    shrink: function*(val) {
      for (const name of propNames) {
        for (const shrunk of props[name].shrink(val[name])) {
          const copy = Object.assign({}, val);
          copy[name] = shrunk;
          yield copy;
        }
      }
    },
    schema: {
      type: ['object'],
      properties: propertySchemas,
      required: propNames,
      additionalProperties: false
    }
  };
}

/**
 * Derive a typeable for dictionaries of homogeneous elements, from the typeable
 * for that element. The shrinking process is slightly nonlinear to keep the
 * implementation simple; e.g. it may shrink `{a: 123, b: 456}` to `{a: 456}` in
 * some cases, shrinking the key `b` down to `a` and in the process clobbering
 * the existing element `a`. Since these nonlinearities should always reduce the
 * number of keys I have just accepted that.
 *
 * @param typeable  - the typeable for the elements of the dictionary.
 */
export function dict<t>(typeable: Typeable<t>): Typeable<Record<string, t>> {
  /**
   * An underlying typeable for key-value pairs underlying this dict.
   */
  const underlying = list(object({ key: text(), value: typeable }));
  /**
   * An injection from the underlying typeable into this dict's output.
   * @param arg
   */
  function inject(arg: ValueOf<typeof underlying>): Record<string, t> {
    const out = {} as Record<string, t>;
    for (const { key, value } of arg) {
      out[key] = value;
    }
    return out;
  }
  return {
    arbitrary(size) {
      return inject(underlying.arbitrary(size));
    },
    shrink: function*(val) {
      const keys = Object.keys(val);
      const representation = keys.map(k => ({ key: k, value: val[k] }));
      for (const shrunk of underlying.shrink(representation)) {
        yield inject(shrunk);
      }
    },
    schema: {
      type: ['object'],
      additionalProperties: typeable.schema
    }
  };
}
