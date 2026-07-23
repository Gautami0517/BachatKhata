import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.service';
import { AiService } from './ai.service';

@ApiTags('ai')
@Public()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}
}
