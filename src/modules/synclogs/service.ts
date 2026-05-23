import { db } from "@/lib/db";
import type { SyncStatus } from "@prisma/client";

export function createSyncLog(params: {
  userId: string;
  mailboxId: string;
  status: SyncStatus;
  startedAt: Date;
  finishedAt: Date;
  message?: string;
}) {
  return db.syncLog.create({
    data: {
      userId: params.userId,
      mailboxId: params.mailboxId,
      status: params.status,
      startedAt: params.startedAt,
      finishedAt: params.finishedAt,
      message: params.message,
    },
  });
}
