import { IFileStorageInfoGenerator } from './types/types';
import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';
import { isPresent } from '../../utils/validation';

@Injectable()
export class GenericFileStorageInfoService
  implements IFileStorageInfoGenerator
{
  getFileName(input: string | undefined): string {
    return `${randomUUID()}-${input}`;
  }

  getPath(prefix?: string): string {
    return `${isPresent(prefix) ? prefix + '/' : ''}${DateTime.now()
      .toUTC()
      .toFormat('yyyy/MM/dd')}`;
  }
}
