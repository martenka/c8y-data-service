import { Module } from '@nestjs/common';
import { MeasurementDownloadService } from './measurement-download.service';
import { ObjectSyncService } from './object-sync.service';

@Module({
  providers: [MeasurementDownloadService, ObjectSyncService],
  exports: [MeasurementDownloadService, ObjectSyncService],
})
export class CumulocityModule {}
