import type { Prisma } from '../generated/prisma/client';

// The conditional write claims a token atomically; rollback also rolls back the claim.
export async function consumeToken(tx: Prisma.TransactionClient, id: string): Promise<boolean> {
  const claimed = await tx.actionToken.updateMany({
    where: { id, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  return claimed.count === 1;
}
