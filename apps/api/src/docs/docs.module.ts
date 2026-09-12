import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { AppConfigService } from '../common/config/app-config.service';

@Module({ controllers: [DocsController], providers: [AppConfigService] })
export class DocsModule {}
