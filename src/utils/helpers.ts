import { notNil } from './validation';
import { ParsedPromisesResult } from './types';

export function pickBy<T extends object>(
  pickFrom: T,
  predicate: <K extends keyof T>(value: T[K], key: K) => boolean,
): Partial<T> {
  const obj: Partial<T> = {};

  for (const key in pickFrom) {
    if (predicate(pickFrom[key], key)) {
      obj[key] = pickFrom[key];
    }
  }

  return obj;
}

export function removeNilProperties<T extends object>(value: T): Partial<T> {
  return pickBy(value, (element) => notNil(element));
}

export async function awaitAllPromises<T>(
  promises: Promise<T>[],
): Promise<ParsedPromisesResult<T>> {
  const settled = await Promise.allSettled(promises);
  const result: ParsedPromisesResult<T> = {
    fulfilled: [],
    rejected: [],
  };

  settled.forEach((item, index) => {
    if (item.status === 'fulfilled') {
      result.fulfilled.push({ value: item.value, index });
    } else {
      result.rejected.push({ value: item.reason, index });
    }
  });

  return result;
}
