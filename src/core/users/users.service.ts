import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  C8yCredentialsType,
  User,
  UserDocument,
  UserModel,
} from '../../models/User';
import { UserMessage } from '../messages/types/message-types/user/types';
import { Types } from 'mongoose';
import { UserService } from '@c8y/client';
import { notNil } from '../../utils/validation';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UserService.name);

  constructor(@InjectModel(User.name) private readonly userModel: UserModel) {}

  async upsertUser<T extends Omit<UserMessage, 'id'> & { id: Types.ObjectId }>(
    userInput: T,
  ): Promise<UserDocument> {
    const result = await this.userModel
      .findByIdAndUpdate(
        userInput.id,
        {
          c8yCredentials: userInput.c8yCredentials,
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    const createdUserId = result?.toObject()._id;
    this.logger.log(`Created or updated user with id: ${createdUserId}`);
    return result;
  }

  async deleteUser(id: Types.ObjectId): Promise<UserDocument> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    const deletedUserId = result?.toObject()?._id;
    if (notNil(deletedUserId)) {
      this.logger.log(`Deleted user with id: ${deletedUserId}`);
    }
    return result;
  }

  async getUserCredentials(
    id: Types.ObjectId,
  ): Promise<C8yCredentialsType | undefined> {
    const user = await this.userModel
      .findById(id, { c8yCredentials: 1 })
      .lean(true)
      .exec();
    if (isNil(user)) {
      throw new Error(`User with id ${id?.toString()} not found!`);
    }
    return user?.c8yCredentials;
  }
}
