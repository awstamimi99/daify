import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseConnectionOptions } from './connection-options';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    const adapter = new PrismaPg(databaseConnectionOptions({
      url: config.getOrThrow<string>('DATABASE_URL'),
      environment: config.get<string>('NODE_ENV') ?? 'development',
      poolMax: config.get<number>('DATABASE_POOL_MAX'),
      connectionTimeoutMs: config.get<number>('DATABASE_CONNECTION_TIMEOUT_MS'),
      ca: config.get<string>('DATABASE_SSL_CA'),
    }));
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
