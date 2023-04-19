import {
  IsBoolean,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
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

  @IsOptional()
  @IsString()
  PUBLIC_BUCKET = 'public';

  @IsOptional()
  @IsString()
  PRIVATE_BUCKET = 'private';
}

export class MongoConfig {
  @IsString()
  USER: string;

  @IsString()
  PASS: string;

  @IsString()
  DB: string;

  @IsString()
  PORT = '27017';
}

export class RootConfig {
  @Type(() => RabbitConfig)
  @ValidateNested()
  RABBIT: RabbitConfig;

  @Type(() => MinioConfig)
  @ValidateNested()
  MINIO: MinioConfig;

  @Type(() => MongoConfig)
  @ValidateNested()
  MONGO: MongoConfig;
}
