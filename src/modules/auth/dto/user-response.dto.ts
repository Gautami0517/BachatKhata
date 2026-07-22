import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Gautami' })
  name!: string;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
