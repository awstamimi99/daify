import { Module } from '@nestjs/common';
import { MenusRepository } from './menus.repository';

@Module({
  providers: [MenusRepository],
  exports: [MenusRepository],
})
export class MenusModule {}
