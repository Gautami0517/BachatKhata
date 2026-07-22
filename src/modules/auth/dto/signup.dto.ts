import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    description: 'User email (lowercased server-side).',
    example: 'user@example.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Display name.', example: 'Gautami' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
}
