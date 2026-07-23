import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class UnsubscribePushDto {
  @ApiProperty({
    description: 'Push service endpoint URL to remove',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  endpoint!: string;
}
