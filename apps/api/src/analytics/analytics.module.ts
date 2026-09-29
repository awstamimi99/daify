import { Module } from '@nestjs/common';
import { AnalyticsController, AnalyticsIngestController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsWorker } from './analytics-worker.service';
@Module({ controllers: [AnalyticsController, AnalyticsIngestController], providers: [AnalyticsService, AnalyticsWorker] })
export class AnalyticsModule {}
