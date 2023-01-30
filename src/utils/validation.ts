import { isNil } from '@nestjs/common/utils/shared.utils';

export function notNil<T>(value: T): value is NonNullable<T> {
  return !isNil(value);
}

export function isArray(data: unknown): data is Array<unknown> {
  return notNil(data) && Array.isArray(data);
}

export function ensureArray<T>(value: T | T[]): Array<T> {
  if (isNil(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export function hasNoOwnKeys<T extends object>(value: T): boolean {
  return Object.keys(value).length === 0;
}
