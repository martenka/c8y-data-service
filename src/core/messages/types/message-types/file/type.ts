import { VisibilityState } from '../../messages.types';

export interface FileDeletionMessage {
  files: {
    bucket: string;
    path: string;
  }[];
}

export interface FileVisibilityStateMessage {
  newVisibilityState: VisibilityState;
  bucket: string;
  filePath: string;
  fileId: string;
}

export type VisibilityStateResultMessage = Partial<
  Pick<FileVisibilityStateMessage, 'fileId'>
> &
  (
    | {
        errorMessage?: string;
      }
    | Omit<FileVisibilityStateMessage, 'fileId'>
  );
