import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({
    description: 'Account email to send the OTP to.',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;
}
