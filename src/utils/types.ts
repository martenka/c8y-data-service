export type ValueWithIndex<T> = { value: T; index: number };
export type ParsedPromisesResult<T> = {
  fulfilled: ValueWithIndex<T>[];
  rejected: ValueWithIndex<unknown>[];
};
