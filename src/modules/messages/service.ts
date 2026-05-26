import { db } from "@/lib/db";

export function getUserMessages(userId: string) {
  return db.message.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    include: {
      mailbox: { select: { provider: true, address: true } },
    },
  });
}

export async function toggleMessageRead(userId: string, messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.userId !== userId) return null;

  return db.message.update({
    where: { id: messageId },
    data: { isRead: !message.isRead },
  });
}

export async function markMessageRead(userId: string, messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.userId !== userId || message.isRead) return null;

  return db.message.update({
    where: { id: messageId },
    data: { isRead: true },
  });
}

export async function toggleMessageStarred(userId: string, messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.userId !== userId) return null;

  return db.message.update({
    where: { id: messageId },
    data: { isStarred: !message.isStarred },
  });
}

export async function trashMessage(userId: string, messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.userId !== userId) return null;

  return db.message.update({
    where: { id: messageId },
    data: { trashedAt: new Date() },
  });
}
