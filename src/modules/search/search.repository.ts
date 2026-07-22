import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}
}
