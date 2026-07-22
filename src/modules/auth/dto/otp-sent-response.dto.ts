import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OtpSentResponseDto {
  @ApiProperty({
    description: 'Always "otp_sent" (anti-enumeration).',
    example: 'otp_sent',
  })
  @IsString()
  status!: string;
}
