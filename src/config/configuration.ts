export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL ?? 'gemini-flash-latest',
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS ?? '30000', 10),
  },
  swagger: {
    path: process.env.SWAGGER_PATH ?? 'api/docs',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '30d',
    issuer: process.env.JWT_ISSUER ?? 'cvault',
  },
});
