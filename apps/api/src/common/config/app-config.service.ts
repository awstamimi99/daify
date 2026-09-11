import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type DaifyEnvironment = 'development' | 'test' | 'production';
export type DaifyLogLevel =
  | 'fatal'
  | 'error'
  | 'warn'
  | 'log'
  | 'debug'
  | 'verbose';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get environment(): DaifyEnvironment {
    return this.config.getOrThrow<DaifyEnvironment>('NODE_ENV');
  }

  get port(): number {
    return this.config.getOrThrow<number>('PORT');
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get logLevel(): DaifyLogLevel {
    return this.config.getOrThrow<DaifyLogLevel>('LOG_LEVEL');
  }

  get webOrigin(): string {
    return this.config.getOrThrow<string>('WEB_ORIGIN');
  }

  get sessionCookieName(): string {
    return this.config.getOrThrow<string>('SESSION_COOKIE_NAME');
  }
}
