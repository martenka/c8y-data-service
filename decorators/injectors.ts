import { Inject } from '@nestjs/common';
import { LOCAL_DATA_DOWNLOAD_FOLDER } from '../src/global/tokens';

export const InjectLocalDataDownloadFolder = () =>
  Inject(LOCAL_DATA_DOWNLOAD_FOLDER);
