import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TestExpiryNotificationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Benefit (coupon) id to send an expiry reminder for',
  })
  @IsUUID()
  @IsNotEmpty()
  benefitId!: string;
}
