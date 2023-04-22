import { UserMessage } from './message-types/user/types';
import {
  TaskFailedMessagePayload,
  TaskScheduledMessage,
} from './message-types/task/types';
import {
  FileDeletionMessage,
  FileVisibilityStateMessage,
  VisibilityStateResultMessage,
} from './message-types/file/type';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export enum TaskTypes {
  DATA_FETCH = 'DATA_FETCH',
  DATA_UPLOAD = 'DATA_UPLOAD',
  OBJECT_SYNC = 'OBJECT_SYNC',
  VISIBILITY_STATE_CHANGE = 'VISIBILITY_STATE_CHANGE',
}

export enum VisibilityState {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
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
  'file.status.visibility.state': FileVisibilityStateMessage;
  'file.result.visibility.state': VisibilityStateResultMessage;
}
