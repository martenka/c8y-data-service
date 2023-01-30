export type ParsedPromisesResult<T> = { fulfilled: T[]; rejected: unknown[] };

export function pickBy<T extends object>(
  pickFrom: T,
  keyfn: <K extends keyof T>(value: T[K], key: K) => boolean,
): Partial<T> {
  const obj: Partial<T> = {};

  for (const key in pickFrom) {
    if (keyfn(pickFrom[key], key)) {
      obj[key] = pickFrom[key];
    }
  }

  return obj;
}

export async function awaitAllPromises<T>(
  promises: Promise<T>[],
): Promise<ParsedPromisesResult<T>> {
  const settled = await Promise.allSettled(promises);
  const result: ParsedPromisesResult<T> = {
    fulfilled: [],
    rejected: [],
  };

  settled.forEach((item) => {
    if (item.status === 'fulfilled') {
      result.fulfilled.push(item.value);
    } else {
      result.rejected.push(item.reason);
    }
  });

  return result;
}
