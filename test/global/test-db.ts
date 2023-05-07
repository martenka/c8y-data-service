import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';
import { Agenda } from '@hokify/agenda';
export interface TestDB {
  memoryServer: MongoMemoryServer;
  connection: Connection;
  uri: string;
  close: () => Promise<boolean>;
}

export async function getTestDB(): Promise<TestDB> {
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  const connectionUri = uri.slice(0, uri.lastIndexOf('/'));
  const dbConnection = mongoose.createConnection(connectionUri, {
    autoIndex: false,
  });
  return {
    memoryServer: instance,
    connection: dbConnection,
    uri: connectionUri,
    close: async () => {
      await dbConnection.close(true);
      return await instance.stop({ doCleanup: true, force: true });
    },
  };
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
