import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MeasurementDownloadService } from './cumulocity/measurement-download.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService, MeasurementDownloadService],
  exports: [MeasurementDownloadService],
})
export class FilesModule {}
