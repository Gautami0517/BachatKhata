import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      issuer: configService.get<string>('jwt.issuer'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return { id: user.id, email: user.email, name: user.name };
  }
}
