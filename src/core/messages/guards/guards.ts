import { IManagedObject } from '@c8y/client';

export function isGroup(managedObject: IManagedObject): boolean {
  return (
    Object.keys(managedObject).includes('c8y_IsDeviceGroup') ||
    managedObject.type === 'c8y_DeviceGroup'
  );
}
