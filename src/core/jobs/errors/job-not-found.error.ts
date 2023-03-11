export class JobNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
