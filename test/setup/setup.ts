import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { INestApplication } from '@nestjs/common';
import * as process from 'process';

export type WithIntegrationSetupTestResult<T extends object> = {
  app: INestApplication;
} & T;
export type WithServiceSetupTestResult<T extends object> = T;

export type SetupTestFn<SetupResult extends object> = (
  connection: Connection,
) => Promise<SetupResult>;

export type TestFn<SetupResult extends object> = (
  params: SetupResult,
) => Promise<void>;

/**
 * Sets up the MongoDB connection for testing and after executing the callback,
 * closes the connection and db instance
 * @param setUpTestFn - Setup to do before test run
 * @param testFn - Actual test to run
 * @param cleanupFn - Optional cleanup to run before closing the connection and db instance
 */
export function setupTest<SetupReturn extends object>(
  setUpTestFn: SetupTestFn<SetupReturn>,
  testFn: TestFn<SetupReturn>,
  cleanupFn?: TestFn<SetupReturn>,
): () => Promise<void> {
  return async () => {
    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    const mongoConnectionUri = uri.slice(0, uri.lastIndexOf('/'));
    process.env.MONGO__CONNECTION_URI = mongoConnectionUri;
    const connection = mongoose.createConnection(mongoConnectionUri, {
      connectTimeoutMS: 30_000,
    });

    await new Promise((resolve) => {
      setTimeout(() => resolve(1), 1000);
      connection.once('connected', () => {
        resolve(0);
      });
    });

    let setupResult: SetupReturn;
    try {
      setupResult = await setUpTestFn(connection);
      await testFn(setupResult);
    } finally {
      await cleanupFn?.(setupResult);
      await connection.close(true);
      await instance.stop({ doCleanup: true, force: true });
    }
  };
}
