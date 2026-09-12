import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MenusRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByIdWithinOrganization(organizationId: string, menuId: string) {
    return this.prisma.menu.findFirst({
      where: {
        id: menuId,
        archivedAt: null,
        location: {
          organizationId,
          archivedAt: null,
        },
      },
    });
  }
}
