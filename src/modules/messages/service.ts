import { db } from "@/lib/db";

export function getUserMessages(userId: string) {
  return db.message.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
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

export async function toggleMessageStarred(userId: string, messageId: string) {
  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.userId !== userId) return null;

  return db.message.update({
    where: { id: messageId },
    data: { isStarred: !message.isStarred },
  });
}
