import { Module } from '@nestjs/common';
import { MenusRepository } from './menus.repository';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { MediaStorageService } from './media-storage.service';

@Module({
  controllers: [MenusController],
  providers: [MenusRepository, MenusService, MediaStorageService],
  exports: [MenusRepository],
})
export class MenusModule {}
