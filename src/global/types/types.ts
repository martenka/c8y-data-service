import { Type } from '@nestjs/common';

export type Properties<T> = {
  [Key in keyof T]: T extends Type ? Properties<T[Key]> : T[Key];
};

export type Optional<T> = T | undefined;
