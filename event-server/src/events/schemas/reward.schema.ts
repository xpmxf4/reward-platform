import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type RewardDocument = Reward & Document;

@Schema({ _id: true, timestamps: false, versionKey: false }) // 임베디드될 때 자체 _id를 가지도록, 타임스탬프는 불필요
export class Reward {
  @Prop({type: Types.ObjectId, auto: true})
  _id: Types.ObjectId; // Mongoose가 자동으로 생성하는 ObjectId

  @Prop({
    type: String,
    required: true,
    enum: ['POINT', 'ITEM', 'COUPON', 'VIRTUAL_CURRENCY']
  })
  rewardType: string;

  @Prop({ required: true, trim: true })
  rewardName: string;

  @Prop({ type: SchemaTypes.Mixed, required: true })
  details: Record<string, any>;

  @Prop({ required: true, default: 1, min: 1 })
  quantityPerUser: number;

  @Prop({ type: Number, default: -1 })
  totalStock?: number;

  @Prop({ type: Number, default: -1 })
  remainingStock?: number;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);

RewardSchema.pre('save', function(next) {
  if (this.isNew && this.totalStock && this.totalStock > 0 && this.remainingStock === -1) {
    this.remainingStock = this.totalStock;
  }
  next();
});