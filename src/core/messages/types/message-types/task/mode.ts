import { TaskModes } from '../../messages.types';

export interface TaskModeInfo {
  taskId: string;
}
export interface TaskModeMessage {
  type: TaskModes;
  tasks: TaskModeInfo[];
}
