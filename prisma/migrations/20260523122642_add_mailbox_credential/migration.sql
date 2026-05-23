-- CreateTable
CREATE TABLE "MailboxCredential" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MailboxCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailboxCredential_userId_idx" ON "MailboxCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailboxCredential_mailboxId_kind_key" ON "MailboxCredential"("mailboxId", "kind");

-- AddForeignKey
ALTER TABLE "MailboxCredential" ADD CONSTRAINT "MailboxCredential_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "Mailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxCredential" ADD CONSTRAINT "MailboxCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
