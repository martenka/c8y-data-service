import { TestDB } from '../../test/global/test-db';

export function closeDB(testDB: TestDB): () => Promise<unknown> {
  return async function () {
    await testDB?.close();
  };
}

/**
 * Adds `fake` option to `jest.useFakeTimers` config api
 *
 * Uses solution from https://github.com/nock/nock/issues/2200
 * @param config Fake timers config options
 *
 * @return Jest instance
 */
export function fakeTime(config?: FakeTimersConfig & { fake?: FakeableAPI[] }) {
  if (config?.fake) {
    if (config.doNotFake) {
      throw new Error(
        'Passing both `fake` and `doNotFake` options to `useFakeTimers()` is not supported.',
      );
    }

    const { fake, ...options } = config;
    return jest.useFakeTimers({
      ...options,
      doNotFake: Array<FakeableAPI>(
        'Date',
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ).filter((api) => !fake.includes(api)),
    });
  }

  return jest.useFakeTimers(config);
}
