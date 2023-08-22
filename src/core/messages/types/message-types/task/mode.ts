import { TaskMode } from '../../messages.types';

export interface TaskModeInfo {
  taskId: string;
}
export interface TaskModeMessage {
  type: TaskMode;
  tasks: TaskModeInfo[];
}
