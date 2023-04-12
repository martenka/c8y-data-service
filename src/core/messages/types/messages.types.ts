import { UserMessage } from './message-types/user/types';
import {
  TaskFailedMessagePayload,
  TaskScheduledMessage,
} from './message-types/task/types';
import { FileDeletionMessage } from './message-types/file/type';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum TaskTypes {
  DATA_FETCH = 'DATA_FETCH',
  OBJECT_SYNC = 'OBJECT_SYNC',
}

export type TaskStatus = keyof typeof TaskSteps;

export interface TaskStatusMessage<P extends object = object> {
  taskId: string;
  taskType: string;
  status: TaskStatus;
  payload: P;
}

export type TaskFailedMessage = TaskStatusMessage<TaskFailedMessagePayload>;

export interface MessagesTypes {
  'task.scheduled': TaskScheduledMessage;
  'task.status.failed': TaskFailedMessage;
  'task.status': TaskStatusMessage;
  'user.user': UserMessage;
  'file.status.deletion': FileDeletionMessage;
}
