export interface UserMessage {
  id: string;
  deletedAt?: string;
  c8yCredentials?: {
    username?: string;
    password?: string;
    tenantID?: string;
    baseAddress?: string;
  };
}
