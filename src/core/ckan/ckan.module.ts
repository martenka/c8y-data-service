import { Module } from '@nestjs/common';
import { CkanService } from './ckan.service';

@Module({
  providers: [CkanService],
  exports: [CkanService],
})
export class CkanModule {}
