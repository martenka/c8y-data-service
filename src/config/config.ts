import {
  IsBoolean,
  IsNumber,
  IsString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RabbitConfig {
  @IsString()
  @IsNotEmpty()
  RABBITMQ_DEFAULT_USER: string;

  @IsString()
  @IsNotEmpty()
  RABBITMQ_DEFAULT_PASS: string;
}

export class MinioConfig {
  @IsString()
  ENDPOINT: string;

  @Transform(({ value }) => value.match(/^\d+$/) && parseInt(value))
  @IsNumber()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  SECRET_KEY: string;

  @Transform(({ value }) => value.toLowerCase() === 'true')
  @IsBoolean()
  USE_SSL = false;
}

export class RootConfig {
  @Type(() => RabbitConfig)
  @ValidateNested()
  RABBIT: RabbitConfig;

  @Type(() => MinioConfig)
  @ValidateNested()
  MINIO: MinioConfig;
}
