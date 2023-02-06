import { Module } from '@nestjs/common';
import { MeasurementDownloadService } from './measurement-download.service';

@Module({
  providers: [MeasurementDownloadService],
  exports: [MeasurementDownloadService],
})
export class CumulocityModule {}
