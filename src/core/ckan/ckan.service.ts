import { Injectable } from '@nestjs/common';
import { ApplicationConfigService } from '../application-config/application-config.service';
import {
  CkanBaseResponse,
  CkanClient,
  CkanCreateGroupParameters,
  CkanCreatePackageParameters,
  CkanCreateResourceParameters,
  CkanFindGroup,
  CkanGroup,
  CkanPackage,
  CkanResource,
} from './types/client';
import FormData from 'form-data';
import fetch from 'node-fetch';

@Injectable()
export class CkanService implements CkanClient {
  constructor(private readonly configService: ApplicationConfigService) {}

  async createGroup(
    parameters: CkanCreateGroupParameters,
  ): Promise<CkanBaseResponse<CkanGroup>> {
    const url = new URL(
      '/api/3/action/group_create',
      this.configService.ckanConfig.baseURL,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.configService.ckanConfig.authToken,
      },
      body: JSON.stringify(parameters),
    });

    if (response.ok) {
      return (await response.json()) as CkanBaseResponse<CkanGroup>;
    }
    throw new Error(
      `Unable to create CKAN group - ${response.status}, ${response.statusText}`,
    );
  }

  async createPackage(
    parameters: CkanCreatePackageParameters,
  ): Promise<CkanBaseResponse<CkanPackage>> {
    const url = new URL(
      '/api/3/action/package_create',
      this.configService.ckanConfig.baseURL,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.configService.ckanConfig.authToken,
      },
      body: JSON.stringify(parameters),
    });

    if (response.ok) {
      return (await response.json()) as CkanBaseResponse<CkanPackage>;
    }
    throw new Error(
      `Unable to create CKAN package/dataset - ${response.status}, ${response.statusText}`,
    );
  }

  async createResource(
    parameters: CkanCreateResourceParameters,
  ): Promise<CkanBaseResponse<CkanResource>> {
    const url = new URL(
      '/api/3/action/resource_create',
      this.configService.ckanConfig.baseURL,
    );

    const formData = this.getResourceFormData(parameters);

    const response = await fetch(url, {
      body: formData,
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: this.configService.ckanConfig.authToken,
      },
    });

    if (response.ok) {
      return (await response.json()) as CkanBaseResponse<CkanResource>;
    }
    throw new Error(
      `Unable to create CKAN resource - ${response.status}, ${response.statusText}`,
    );
  }

  async findGroup(name: string): Promise<CkanBaseResponse<CkanFindGroup[]>> {
    const url = new URL(
      '/api/3/action/group_autocomplete',
      this.configService.ckanConfig.baseURL,
    );
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.configService.ckanConfig.authToken,
      },
      body: JSON.stringify({
        q: name,
      }),
    });

    if (response.ok) {
      return (await response.json()) as CkanBaseResponse<CkanFindGroup[]>;
    }
    throw new Error(
      `Unable to find group from CKAN - ${response.status}, ${response.statusText}`,
    );
  }

  private getResourceFormData(
    parameters: CkanCreateResourceParameters,
  ): FormData {
    const { upload, ...rest } = parameters;

    const formData = new FormData();
    Object.keys(rest).forEach((key) => {
      formData.append(key, rest[key]);
    });
    formData.append('upload', upload);
    return formData;
  }
}
