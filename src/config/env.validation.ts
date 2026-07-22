import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnvironment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum MailProvider {
  Console = 'console',
  Resend = 'resend',
}

class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  @IsOptional()
  NODE_ENV?: NodeEnvironment;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  GEMINI_MODEL?: string;

  @IsNumber()
  @IsOptional()
  GEMINI_TIMEOUT_MS?: number;

  @IsString()
  @IsOptional()
  SWAGGER_PATH?: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES?: string;

  @IsString()
  @IsOptional()
  JWT_ISSUER?: string;

  @IsEnum(MailProvider)
  @IsOptional()
  MAIL_PROVIDER?: MailProvider;

  @IsString()
  @IsOptional()
  MAIL_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME?: string;

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
