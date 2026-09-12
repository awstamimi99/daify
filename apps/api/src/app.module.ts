import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AppConfigService } from './common/config/app-config.service';
import { environmentSchema } from './common/config/environment';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { DatabaseModule } from './database/database.module';
import { DocsModule } from './docs/docs.module';
import { HealthModule } from './health/health.module';
import { MenusModule } from './menus/menus.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PlatformModule } from './platform/platform.module';
import { ClientIdentityMiddleware, clientIp } from './common/middleware/client-identity.middleware';
import { PostgresThrottlerStorage } from './common/postgres-throttler.storage';
import { PrismaService } from './database/prisma.service';
import type { Request } from 'express';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: environmentSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    ThrottlerModule.forRootAsync({ imports: [DatabaseModule], inject: [PrismaService], useFactory: (prisma: PrismaService) => ({
      throttlers: [{ ttl: 60_000, limit: 120 }], storage: new PostgresThrottlerStorage(prisma),
      getTracker: request => Promise.resolve(clientIp(request as Request)),
    }) }),
    AuthModule,
    AuthorizationModule,
    DatabaseModule,
    DocsModule,
    HealthModule,
    MenusModule,
    OrganizationsModule,
    PlatformModule,
  ],
  providers: [AppConfigService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [AppConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware, ClientIdentityMiddleware).forRoutes('*');
  }
}
