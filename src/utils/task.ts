import { notNil } from './validation';
import { TaskScheduledMessage } from '../core/messages/types/message-types/task/types';

export function isPeriodicTask(
  task?: Partial<Pick<TaskScheduledMessage, 'periodicData'>>,
) {
  return notNil(task?.periodicData);
}
