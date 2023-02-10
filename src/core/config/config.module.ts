import { Global, Module } from '@nestjs/common';
import { dotenvLoader, TypedConfigModule } from 'nest-typed-config';
import { RootConfig } from './config.definitions';
import { ConfigService } from './config.service';

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
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
