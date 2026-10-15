import { Module } from '@nestjs/common';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';

@Module({ controllers: [PlatformController, StaffController], providers: [PlatformAdminGuard, PlatformService, StaffService] })
export class PlatformModule {}
