import { notNil } from './validation';
import { TaskScheduledMessage } from '../core/messages/types/message-types/task/types';
import { VisibilityState } from '../core/messages/types/messages.types';
import { ApplicationConfigService } from '../core/application-config/application-config.service';

export function isPeriodicWork(
  task?: Partial<Pick<TaskScheduledMessage, 'periodicData'>>,
) {
  return notNil(task?.periodicData);
}

export function getVisibilityStateNewBucket(
  configService: ApplicationConfigService,
  visibilityState: VisibilityState,
): string {
  switch (visibilityState) {
    case VisibilityState.PUBLIC:
      return configService.minioConfig.publicBucket;
    case VisibilityState.PRIVATE:
      return configService.minioConfig.privateBucket;
    default:
      throw new Error(`Unknown visibility state of ${visibilityState}`);
  }
}
