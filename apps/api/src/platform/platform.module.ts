import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformController } from './platform.controller';

@Module({ controllers: [PlatformController], providers: [PlatformAdminGuard] })
export class PlatformModule {}
