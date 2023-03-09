import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { HydratedDocument, Model } from 'mongoose';
import { Properties } from '../global/types/types';
import { CustomAttributes } from './types/types';

@Schema({ _id: false, autoIndex: false })
export class C8yCredentials {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  tenantID: string;

  @Prop({ required: true })
  baseAddress: string;
}

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
})
export class User extends Base {
  @Prop({ type: C8yCredentials })
  c8yCredentials?: C8yCredentials;

  @Prop({
    type: Object,
    default: {},
    validate: {
      validator: function (value) {
        return typeof value === 'object';
      },
      message: 'CustomAttributes have to be of type object!',
    },
  })
  customAttributes: CustomAttributes;
}

export const UserSchema = SchemaFactory.createForClass(User);

export type UserDocument = HydratedDocument<User>;
export type UserModel = Model<User>;

export type C8yCredentialsType = Properties<C8yCredentials>;
export type UserType = Properties<User>;
