import { Schema } from 'jsonschema';

/**
 * A TSchema is a JSONSchema whose type has to be a string[] rather than the
 * loosey-goosey "it could be absent or it could be a string" thing that
 * JSONSchema does by default.
 */
export interface TSchema extends Schema {
  type: string[];
}

/**
 * The underlying typeable type. The type parameter `x` specifies the TypeScript
 * type that this Typeable wraps and can be extracted for convenience with the
 * type-function ValueOf.
*/
export interface Typeable<x> {
  arbitrary: (size: number) => x;
  shrink: (val: x) => Iterable<x>;
  schema: TSchema;
}

/**
 * A derivation from a typeable to the values that inhabit that typeable.
 */
export type ValueOf<x> = x extends Typeable<infer R>
  ? R
  : { err: 'typeables.ValueOf<t> where t was not a Typeable'; t: x };
