import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT for Authorization: Bearer.' })
  accessToken!: string;

  @ApiProperty({ description: 'Long-lived rotating refresh token.' })
  refreshToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
