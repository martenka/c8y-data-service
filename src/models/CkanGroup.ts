import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { Properties } from '../global/types/types';
import { HydratedDocument, Model } from 'mongoose';

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
export class CkanGroup extends Base {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, index: true, lowercase: true })
  fragment: string;

  @Prop()
  ckanId?: string;
}

export const CkanGroupSchema = SchemaFactory.createForClass(CkanGroup);

export type CkanGroupType = Properties<CkanGroup>;
export type CkanGroupDocument = HydratedDocument<CkanGroup>;
export type CkanGroupModel = Model<CkanGroup>;
