import { MenusRepository } from './menus.repository';
import type { PrismaService } from '../database/prisma.service';

describe('MenusRepository', () => {
  it('includes the organization in the database predicate', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { menu: { findFirst } } as unknown as PrismaService;
    const repository = new MenusRepository(prisma);

    await repository.findByIdWithinOrganization('org-id', 'menu-id');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'menu-id',
        archivedAt: null,
        location: { organizationId: 'org-id', archivedAt: null },
      },
    });
  });
});
