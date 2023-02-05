import { Injectable } from '@nestjs/common';
import { RootConfig } from './config/config';

@Injectable()
export class AppService {
  constructor(private rootConfig: RootConfig) {
    console.dir(rootConfig);
  }
  getHello(): string {
    return 'Hello World!';
  }
}
