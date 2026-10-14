import { Module } from '@nestjs/common';
import { SupportController, PlatformSupportController } from './support.controller';
import { SupportService } from './support.service';
import { PlatformAdminGuard } from '../platform/platform-admin.guard';
@Module({ controllers: [SupportController, PlatformSupportController], providers: [SupportService, PlatformAdminGuard] })
export class SupportModule {}
