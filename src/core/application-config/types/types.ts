export interface UsernamePassword {
  username: string;
  password: string;
}

export interface IMinioConfig {
  publicBucket: string;
  privateBucket: string;
  dataFolder: string;
}

export type ICkanConfig = {
  organisationId: string;
  authToken: string;
  baseURL: string;
} & UsernamePassword;
