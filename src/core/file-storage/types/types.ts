export interface IFileStorageInfoGenerator {
  getPath: (prefix?: string) => string;
  getFileName: (input?: string) => string;
}
