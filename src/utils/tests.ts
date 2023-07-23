import { Connection } from 'mongoose';
import { Agenda } from '@hokify/agenda';

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

export async function initiateAgenda(connection: Connection): Promise<Agenda> {
  const agenda: Agenda = await new Promise((resolve) => {
    const agenda = new Agenda({
      // Mongoose uses higher version of mongodb client than agenda, their types don't match exactly
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      mongo: connection.getClient().db(),
      processEvery: '1 second',
    });

    agenda.on('ready', () => resolve(agenda));
  });

  if (agenda) {
    await agenda.db.removeJobs({});
  }

  return agenda;
}
