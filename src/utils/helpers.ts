import { notNil } from './validation';
import { ParsedPromisesResult } from './types';
import { Types } from 'mongoose';
import { Buffer } from 'buffer';
import { ObjectIdLike, BSONError } from 'bson';
import { TaskSteps } from '../core/messages/types/messages.types';
import { MessagesProducerService } from '../core/messages/messages-producer.service';
import { TaskScheduledMessage } from '../core/messages/types/message-types/task/types';

type TestType =
  | string
  | number
  | Types.ObjectId
  | ObjectIdLike
  | Buffer
  | Uint8Array;

export function idToObjectID<T extends TestType | TestType[]>(
  id: T,
): T extends TestType[] ? Types.ObjectId[] : Types.ObjectId;
export function idToObjectID(
  id: TestType | TestType[],
): Types.ObjectId[] | Types.ObjectId {
  try {
    if (Array.isArray(id)) {
      return id.map((value) => new Types.ObjectId(value));
    }

    return new Types.ObjectId(id);
  } catch (e) {
    if (e instanceof BSONError) {
      return undefined;
    }
    throw e;
  }
}

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

export async function withTaskSchedulingErrorHandler<T>(
  handler: () => Promise<T>,
  messageProducerService: MessagesProducerService,
  message: TaskScheduledMessage,
): Promise<T> {
  try {
    return await handler();
  } catch (e) {
    let reason: string | undefined;
    if (e instanceof Error) {
      reason = e.message;
    }

    const messageKeys = Object.keys(message);
    const requiredMessageKeys: (keyof TaskScheduledMessage)[] = [
      'taskId',
      'taskType',
    ];
    if (
      requiredMessageKeys.every((key) =>
        messageKeys.includes(key as keyof TaskScheduledMessage),
      )
    ) {
      messageProducerService.sendTaskFailedMessage({
        status: TaskSteps.FAILED,
        taskId: message.taskId,
        taskType: message.taskType,
        payload: {
          reason: reason || 'Task scheduling failed with unknown error',
        },
      });
    }
  }
}
