import { PublishingController, PublicMenusController } from './publishing.controller';
import { PublishingService } from './publishing.service';
import { PublicationOutbox } from './publication-outbox.service';
import { Module } from '@nestjs/common';
import { MenusRepository } from './menus.repository';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { MediaStorageService } from './media-storage.service';

@Module({
  controllers: [MenusController, PublishingController, PublicMenusController],
  providers: [PublishingService, PublicationOutbox, MenusRepository, MenusService, MediaStorageService],
  exports: [MenusRepository],
})
export class MenusModule {}
