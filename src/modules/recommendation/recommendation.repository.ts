import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}
}
