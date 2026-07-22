import { Injectable } from '@nestjs/common';
import { AiRepository } from './ai.repository';

@Injectable()
export class AiService {
  constructor(private readonly aiRepository: AiRepository) {}
}
