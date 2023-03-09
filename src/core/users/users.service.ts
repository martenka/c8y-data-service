import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, UserModel } from '../../models/User';
import { UserMessage } from '../messages/types/message-types/user/types';
import { Types } from 'mongoose';
import { UserService } from '@c8y/client';
import { notNil } from '../../utils/validation';

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
    this.logger.log(`Created user with id: ${createdUserId}`);
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
}
