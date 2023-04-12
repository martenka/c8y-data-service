export interface FileDeletionMessage {
  files: {
    bucket: string;
    path: string;
  }[];
}
