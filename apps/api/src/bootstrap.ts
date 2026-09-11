import {
  ConsoleLogger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import type { INestApplication, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './common/config/app-config.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

const levelOrder: LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

function enabledLevels(minimum: LogLevel): LogLevel[] {
  return levelOrder.slice(0, levelOrder.indexOf(minimum) + 1);
}

export async function createApp(): Promise<INestApplication> {
  const bootstrapLogger = new ConsoleLogger({ json: true, colors: false });
  const app = await NestFactory.create(AppModule, {
    logger: bootstrapLogger,
    bufferLogs: true,
  });
  const config = app.get(AppConfigService);
  app.enableCors({ origin: config.webOrigin, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] });
  app.useLogger(
    new ConsoleLogger({
      json: true,
      colors: false,
      logLevels: enabledLevels(config.logLevel),
    }),
  );

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  return app;
}
