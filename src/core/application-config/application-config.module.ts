import { Global, Module } from '@nestjs/common';
import { dotenvLoader, TypedConfigModule } from 'nest-typed-config';
import { RootConfig } from './application-config.definitions';
import { ApplicationConfigService } from './application-config.service';

@Global()
@Module({
  imports: [
    TypedConfigModule.forRoot({
      isGlobal: false,
      schema: RootConfig,
      load: dotenvLoader({
        separator: '__',
      }),
    }),
  ],
  providers: [ApplicationConfigService],
  exports: [ApplicationConfigService],
})
export class ApplicationConfigModule {}
