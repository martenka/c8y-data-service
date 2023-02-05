import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RabbitConfig {
  @IsString()
  @IsNotEmpty()
  RABBITMQ_DEFAULT_USER: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_DEFAULT_PASS: string;
}

export class RootConfig {
  @Type(() => RabbitConfig)
  @ValidateNested()
  RABBIT: RabbitConfig;
}
