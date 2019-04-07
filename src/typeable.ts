import { Schema } from 'jsonschema';

/**
 * The underlying typeable type. The type parameter `x` specifies the TypeScript
 * type that this Typeable wraps and can be extracted for convenience with the
 * type-function ValueOf.
 */
export interface Typeable<x> {
  arbitrary: (size: number) => x;
  shrink: (val: x) => Iterable<x>;
  schema: Schema & { type: string[] };
}

export type ValueOf<x> = x extends Typeable<infer R>
  ? R
  : { err: 'typeables.ValueOf<t> where t was not a Typeable'; t: x };
