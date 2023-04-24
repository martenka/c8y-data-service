import { Readable as ReadableStream } from 'stream';

export interface CkanBaseResponse<T> {
  success: boolean;
  result: T;
}

export interface CkanTag {
  name?: string;
  vocabulary_id?: string;
}

export interface CkanExtra {
  key: string;
  value: string;
}

export interface CkanCreatePackageGroup {
  name: string;
}
export interface CkanCreatePackageParameters {
  name: string;
  private?: boolean;
  author?: string;
  author_email?: string;
  // Description of the dataset
  notes?: string;
  // ID of the organisation owning ths dataset/package
  mainter?: string;
  maintainer_email?: string;
  // ID of the datasets owning organisation
  owner_org: string;
  tags?: CkanTag[];
  extras?: CkanExtra[];
  groups?: CkanCreatePackageGroup[];
}

export interface CkanCreateGroupParameters {
  // Name must be lowercase alphanumeric string without spaces and optionally underscores
  name: string;
  description?: string;
  extras?: CkanExtra[];
  // Groups that are in this group
  groups?: CkanCreatePackageGroup[];
}

export interface CkanCreateResourceParameters {
  package_id: string;
  description?: string;
  format?: string;
  name?: string;
  mimetype?: string;
  upload: ReadableStream;
}

export interface CkanPackage {
  author?: string | null;
  author_email?: string | null;
  creator_user_id?: string | null;
  id: string;
  name?: string | null;
  private?: boolean;
  owner_org?: string | null;
  num_tags?: number | null;
}

export interface CkanGroup {
  id: string;
  display_name?: string | null;
  name?: string | null;
  state?: string | null;
  package_count?: number | null;
  type?: string | null;
  extras?: CkanExtra[];
  tags?: CkanTag[];
  groups: CkanGroup[];
  created?: string | null;
}

export interface CkanResource {
  created?: string | null;
  description?: string | null;
  id: string;
  format?: string | null;
  mimetype?: string | null;
  name?: string | null;
  package_id: string;
  url?: string | null;
  datastore_active?: boolean;
}
export interface CkanFindGroup {
  id: string;
  name: string;
  title?: string;
}

export interface CkanClient {
  createPackage: (
    parameters: CkanCreatePackageParameters,
  ) => Promise<CkanBaseResponse<CkanPackage>>;
  createGroup: (
    parameters: CkanCreateGroupParameters,
  ) => Promise<CkanBaseResponse<CkanGroup>>;
  createResource: (
    parameters: CkanCreateResourceParameters,
  ) => Promise<CkanBaseResponse<CkanResource>>;
  findGroup: (name: string) => Promise<CkanBaseResponse<CkanFindGroup[]>>;
}
