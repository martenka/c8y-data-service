import { FileWriter } from './types';
import { C8yData, FileSaveOptions } from '../../../utils/paging/types';
import { IResultList } from '@c8y/client';
import { WriteStream } from 'fs';
import { once } from 'events';
import * as fs from 'fs';
import { unlink } from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';

export class CSVWriter<T extends C8yData> implements FileWriter<T> {
  private fileDataPrefix = 'nocolumns_';
  private stream: WriteStream;
  private localFolderPath: string;
  private fileName: string;
  private localAbsolutePath: string;
  private columns: Set<string>;
  private data: Record<string, string>;
  private delimiter: string;

  constructor(folderPath: string, options?: FileSaveOptions, delimiter = ',') {
    this.columns = new Set();
    this.data = {};
    this.localFolderPath = folderPath;
    this.delimiter = delimiter;
    this.fileName =
      (options?.fileName && options.fileName + '.csv') ??
      `csvfile_${randomUUID()}.csv`;
    this.localAbsolutePath = path.join(this.localFolderPath, this.fileName);
    this.stream = fs.createWriteStream(
      path.join(this.localFolderPath, this.fileDataPrefix + this.fileName),
      {
        flags: 'w+',
        autoClose: true,
        encoding: 'utf-8',
      },
    );
  }

  async write(resultList: IResultList<T>): Promise<void> {
    for await (const data of resultList.data) {
      this.extractRowData(data, '');
      await this.writeToStream(this.stream, this.buildRow() + '\n');
    }
    return Promise.resolve();
  }

  /**
   * Closes the current writestream, <br>
   * then copies the written data to the originally specified file,
   * while also writing the column names
   */
  async close(): Promise<void> {
    this.stream.close();
    await once(this.stream, 'close');

    const columnRow = Array.from(this.columns).join(this.delimiter) + '\n';

    const readStream = fs.createReadStream(
      path.join(this.localFolderPath, this.fileDataPrefix + this.fileName),
      { encoding: 'utf-8', autoClose: true },
    );

    const fileStream = fs.createWriteStream(
      path.join(this.localFolderPath, this.fileName),
      {
        flags: 'w+',
        autoClose: true,
        encoding: 'utf-8',
      },
    );

    await this.writeToStream(fileStream, columnRow);

    await pipeline(readStream, fileStream);
    await unlink(
      path.join(this.localFolderPath, this.fileDataPrefix + this.fileName),
    );
  }

  getStream(): WriteStream {
    return this.stream;
  }

  getFileInfo() {
    return { fileName: this.fileName, localFilePath: this.localFolderPath };
  }

  private extractRowData(data: T, keyPath: string): void {
    const keys = Object.keys(data);
    keys.forEach((key) => {
      if (typeof data[key] !== 'object') {
        this.columns.add(keyPath === '' ? key : `${keyPath}_${key}`);
      }
    });

    keys.forEach((key) => {
      if (this.isPrimitive(data[key])) {
        this.data[keyPath === '' ? key : `${keyPath}_${key}`] = String(
          data[key],
        );
      } else if (typeof data[key] === 'object') {
        this.extractRowData(
          data[key],
          keyPath === '' ? key : `${keyPath}_${key}`,
        );
      }
    });
  }

  private buildRow(): string {
    const row: string[] = [];

    this.columns.forEach((column) => {
      row.push(this.data[column] ?? '');
    });

    return row.join(this.delimiter);
  }

  private isPrimitive(value: unknown): boolean {
    return typeof value !== 'object';
  }

  /**
   * Writes to given stream while waiting on the 'drain' event if necessary
   */
  private async writeToStream(
    stream: WriteStream,
    chunk: unknown,
  ): Promise<void> {
    if (!stream.write(chunk)) {
      await once(stream, 'drain');
    }

    return Promise.resolve();
  }
}
