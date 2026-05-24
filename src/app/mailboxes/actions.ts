"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/modules/auth";
import {
  addMailbox,
  deleteMailbox,
  getUserMailbox,
  updateMailboxStatus,
} from "@/modules/mailboxes";
import {
  getMailboxCredential,
  saveMailboxCredential,
} from "@/modules/mailboxes/credentials";
import { createSyncLog } from "@/modules/synclogs/service";
import type {
  Mail163ConnectionErrorCode,
  Mail163SyncErrorCode,
} from "@/modules/providers/mail163";
import {
  getSafeMailboxConnectReturnPath,
  MAILBOX_CONNECT_FALLBACK_PATH,
} from "@/modules/mailboxes/return-path";
import {
  createPreview,
  extractVerificationCode,
  syncMailbox,
  testImapConnection,
} from "@/modules/providers/mail163";
import {
  type GmailApiErrorCode,
  getGmailMessage,
  isGmailApiError,
  listGmailMessages,
  refreshAccessToken,
  testGmailConnection,
} from "@/modules/providers/gmail";
import {
  testOutlookConnection,
  refreshOutlookToken,
  listOutlookMessages,
  parseOutlookMessage,
  isOutlookApiError,
  hasMailReadScope,
  OutlookApiError,
  type OutlookApiErrorCode,
} from "@/modules/providers/outlook";
import { db } from "@/lib/db";
import { createSyncSummary } from "@/modules/messages/sync-summary";

const MAIL163_CONNECTION_ERROR_MESSAGES: Record<
  Mail163ConnectionErrorCode,
  string
> = {
  authentication_failed:
    "Authentication failed. Use your 163 client authorization code, not your mailbox login password.",
  timeout: "Connection timed out. Please check your network and try again.",
  network_unreachable:
    "Could not reach the 163 IMAP server. Please check your network.",
  tls_failed:
    "The secure connection to the 163 IMAP server failed. Please try again later.",
  unknown: "Connection test failed. Please try again later.",
};

const MAIL163_SYNC_ERROR_MESSAGES: Record<Mail163SyncErrorCode, string> = {
  ...MAIL163_CONNECTION_ERROR_MESSAGES,
  inbox_open_failed: "Could not open INBOX. Please check your mailbox permissions.",
  fetch_failed: "Could not fetch messages from the server. Please try again later.",
};

const GMAIL_SYNC_ERROR_MESSAGES: Record<GmailApiErrorCode, string> = {
  gmail_token_expired: "Google authorization expired. Reconnect Gmail.",
  gmail_insufficient_scope:
    "Gmail inbox sync not authorized. Reconnect Gmail and approve Gmail read-only access.",
  gmail_api_not_enabled:
    "Gmail API is not enabled for this Google Cloud project. Enable Gmail API, then reconnect Gmail.",
  gmail_domain_policy:
    "Gmail sync is blocked by this Google account or Workspace policy.",
  gmail_rate_limited:
    "Gmail sync is temporarily rate limited. Please try again later.",
  gmail_api_failed: "Gmail sync is not allowed for this account or project.",
};

export async function addMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const provider = String(formData.get("provider") || "");
  const address = String(formData.get("address") || "");
  const authCode = String(formData.get("authCode") || "");
  const failurePath = getSafeMailboxConnectReturnPath(formData.get("returnTo"));

  const credential =
    authCode && provider === "mail163"
      ? { kind: "app_password" as const, plaintext: authCode }
      : undefined;
  const result = await addMailbox(user.id, provider, address, credential);
  if ("error" in result) {
    if (failurePath === MAILBOX_CONNECT_FALLBACK_PATH) {
      redirect(failurePath);
    }

    const separator = failurePath.includes("?") ? "&" : "?";
    redirect(
      `${failurePath}${separator}error=${encodeURIComponent(result.error)}`,
    );
  }

  redirect("/mailboxes");
}

export async function deleteMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const result = await deleteMailbox(user.id, mailboxId);
  if ("error" in result) {
    redirect(`/mailboxes?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/mailboxes?success=" + encodeURIComponent("Mailbox removed."));
}

export async function testMailboxConnectionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "mail163") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Connection test is only available for 163 Mail."),
    );
  }

  const password = await getMailboxCredential(
    user.id,
    mailboxId,
    "app_password",
  );
  if (!password) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No app password found for this mailbox."),
    );
  }

  const startedAt = new Date();
  const result = await testImapConnection(mailbox.address, password);
  const finishedAt = new Date();

  if ("success" in result) {
    await Promise.all([
      updateMailboxStatus(user.id, mailboxId, "active"),
      createSyncLog({
        userId: user.id,
        mailboxId,
        status: "success",
        startedAt,
        finishedAt,
        message: "IMAP login succeeded.",
      }),
    ]);
    redirect(
      "/mailboxes?success=" +
        encodeURIComponent("Connection test passed."),
    );
  }

  const errorMessage = MAIL163_CONNECTION_ERROR_MESSAGES[result.error];
  await Promise.all([
    updateMailboxStatus(user.id, mailboxId, "error"),
    createSyncLog({
      userId: user.id,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message: errorMessage,
    }),
  ]);
  redirect(
    "/mailboxes?error=" + encodeURIComponent(errorMessage),
  );
}

export async function testGmailConnectionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "gmail") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Connection test is only available for Gmail."),
    );
  }

  const accessToken = await getMailboxCredential(
    user.id,
    mailboxId,
    "oauth_access_token",
  );
  if (!accessToken) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No access token found for this mailbox."),
    );
  }

  const startedAt = new Date();
  const outcome = await testGmailConnectionWithRefresh(
    user.id,
    mailboxId,
    accessToken,
    startedAt,
  );

  if (outcome.success) {
    redirect(
      "/mailboxes?success=" + encodeURIComponent(outcome.message),
    );
  }
  redirect("/mailboxes?error=" + encodeURIComponent(outcome.message));
}

type ConnectionOutcome =
  | { success: true; message: string }
  | { success: false; message: string };

async function testGmailConnectionWithRefresh(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<ConnectionOutcome> {
  const result = await testGmailConnection(accessToken);

  if ("success" in result) {
    const finishedAt = new Date();
    await Promise.all([
      updateMailboxStatus(userId, mailboxId, "active"),
      createSyncLog({
        userId,
        mailboxId,
        status: "success",
        startedAt,
        finishedAt,
        message: "Google account verified.",
      }),
    ]);
    return { success: true, message: "Gmail connection test passed." };
  }

  if (result.error === "token_expired") {
    const refreshToken = await getMailboxCredential(
      userId,
      mailboxId,
      "oauth_refresh_token",
    );

    if (refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken);

        await saveMailboxCredential(
          userId,
          mailboxId,
          "oauth_access_token",
          refreshed.access_token,
        );

        if (refreshed.refresh_token) {
          await saveMailboxCredential(
            userId,
            mailboxId,
            "oauth_refresh_token",
            refreshed.refresh_token,
          );
        }

        const retryResult = await testGmailConnection(refreshed.access_token);
        const finishedAt = new Date();

        if ("success" in retryResult) {
          await Promise.all([
            updateMailboxStatus(userId, mailboxId, "active"),
            createSyncLog({
              userId,
              mailboxId,
              status: "success",
              startedAt,
              finishedAt,
              message: "Google account verified.",
            }),
          ]);
          return { success: true, message: "Gmail connection test passed." };
        }

        const retryMessage =
          retryResult.error === "token_expired"
            ? "Google authorization expired. Reconnect Gmail."
            : "Gmail connection test failed. Please try again later.";

        await Promise.all([
          updateMailboxStatus(userId, mailboxId, "error"),
          createSyncLog({
            userId,
            mailboxId,
            status: "error",
            startedAt,
            finishedAt,
            message: retryMessage,
          }),
        ]);
        return { success: false, message: retryMessage };
      } catch {
        // Fall through to error "expired"
      }
    }

    const finishedAt = new Date();
    const message = "Google authorization expired. Reconnect Gmail.";
    await Promise.all([
      updateMailboxStatus(userId, mailboxId, "error"),
      createSyncLog({
        userId,
        mailboxId,
        status: "error",
        startedAt,
        finishedAt,
        message,
      }),
    ]);
    return { success: false, message };
  }

  const finishedAt = new Date();
  const message = "Gmail connection test failed. Please try again later.";
  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "error"),
    createSyncLog({
      userId,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message,
    }),
  ]);
  return { success: false, message };
}

export async function testOutlookConnectionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "outlook") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Connection test is only available for Outlook."),
    );
  }

  const accessToken = await getMailboxCredential(
    user.id,
    mailboxId,
    "oauth_access_token",
  );
  if (!accessToken) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No access token found. Reconnect Outlook."),
    );
  }

  const startedAt = new Date();
  const outcome = await testOutlookConnectionWithRefresh(
    user.id,
    mailboxId,
    accessToken,
    startedAt,
  );

  if (outcome.success) {
    redirect(
      "/mailboxes?success=" + encodeURIComponent(outcome.message),
    );
  }
  redirect("/mailboxes?error=" + encodeURIComponent(outcome.message));
}

async function testOutlookConnectionWithRefresh(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<ConnectionOutcome> {
  const result = await testOutlookConnection(accessToken);

  if ("success" in result) {
    const finishedAt = new Date();
    await Promise.all([
      updateMailboxStatus(userId, mailboxId, "active"),
      createSyncLog({
        userId,
        mailboxId,
        status: "success",
        startedAt,
        finishedAt,
        message: "Microsoft account verified.",
      }),
    ]);
    return { success: true, message: "Outlook connection test passed." };
  }

  if (result.error === "token_expired") {
    const refreshToken = await getMailboxCredential(
      userId,
      mailboxId,
      "oauth_refresh_token",
    );

    if (refreshToken) {
      try {
        const refreshed = await refreshOutlookToken(refreshToken);

        await saveMailboxCredential(
          userId,
          mailboxId,
          "oauth_access_token",
          refreshed.access_token,
        );

        if (refreshed.refresh_token) {
          await saveMailboxCredential(
            userId,
            mailboxId,
            "oauth_refresh_token",
            refreshed.refresh_token,
          );
        }

        const retryResult = await testOutlookConnection(refreshed.access_token);
        const finishedAt = new Date();

        if ("success" in retryResult) {
          await Promise.all([
            updateMailboxStatus(userId, mailboxId, "active"),
            createSyncLog({
              userId,
              mailboxId,
              status: "success",
              startedAt,
              finishedAt,
              message: "Microsoft account verified.",
            }),
          ]);
          return { success: true, message: "Outlook connection test passed." };
        }

        const retryMessage =
          retryResult.error === "token_expired"
            ? "Microsoft authorization expired. Reconnect Outlook."
            : "Outlook connection test failed. Please try again later.";

        await Promise.all([
          updateMailboxStatus(userId, mailboxId, "error"),
          createSyncLog({
            userId,
            mailboxId,
            status: "error",
            startedAt,
            finishedAt,
            message: retryMessage,
          }),
        ]);
        return { success: false, message: retryMessage };
      } catch {
        // Fall through to error "expired"
      }
    }

    const finishedAt = new Date();
    const message = "Microsoft authorization expired. Reconnect Outlook.";
    await Promise.all([
      updateMailboxStatus(userId, mailboxId, "error"),
      createSyncLog({
        userId,
        mailboxId,
        status: "error",
        startedAt,
        finishedAt,
        message,
      }),
    ]);
    return { success: false, message };
  }

  const finishedAt = new Date();
  const message = "Outlook connection test failed. Please try again later.";
  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "error"),
    createSyncLog({
      userId,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message,
    }),
  ]);
  return { success: false, message };
}

export async function syncGmailAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "gmail") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Sync is only available for Gmail."),
    );
  }

  const accessToken = await getMailboxCredential(
    user.id,
    mailboxId,
    "oauth_access_token",
  );
  if (!accessToken) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No access token found. Reconnect Gmail."),
    );
  }

  const startedAt = new Date();
  const outcome = await syncGmailInbox(user.id, mailboxId, accessToken, startedAt);

  if (outcome.success) {
    redirect(
      "/mailboxes?success=" + encodeURIComponent(outcome.bannerMessage),
    );
  }
  redirect("/mailboxes?error=" + encodeURIComponent(outcome.message));
}

type SyncOutcome =
  | { success: true; bannerMessage: string }
  | { success: false; message: string };

async function syncGmailInbox(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<SyncOutcome> {
  try {
    return await importGmailMessages(userId, mailboxId, accessToken, startedAt);
  } catch (error: unknown) {
    if (isGmailApiError(error) && error.code === "gmail_token_expired") {
      const refreshToken = await getMailboxCredential(
        userId,
        mailboxId,
        "oauth_refresh_token",
      );

      if (refreshToken) {
        try {
          const refreshed = await refreshAccessToken(refreshToken);

          await saveMailboxCredential(
            userId,
            mailboxId,
            "oauth_access_token",
            refreshed.access_token,
          );

          if (refreshed.refresh_token) {
            await saveMailboxCredential(
              userId,
              mailboxId,
              "oauth_refresh_token",
              refreshed.refresh_token,
            );
          }

          return await importGmailMessages(
            userId,
            mailboxId,
            refreshed.access_token,
            startedAt,
          );
        } catch (retryError: unknown) {
          return recordGmailSyncError(
            userId,
            mailboxId,
            startedAt,
            retryError,
          );
        }
      }
    }

    return recordGmailSyncError(userId, mailboxId, startedAt, error);
  }
}

async function importGmailMessages(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<SyncOutcome> {
  const entries = await listGmailMessages(accessToken, 10);
  const fetchedCount = entries.length;
  let createdCount = 0;

  if (fetchedCount > 0) {
    const messages = await Promise.all(
      entries.map((entry) => getGmailMessage(accessToken, entry.id)),
    );

    const created = await db.message.createMany({
      data: messages.map((m) => ({
        providerMessageId: m.messageId,
        threadId: m.threadId,
        sender: m.sender,
        subject: m.subject,
        preview: m.snippet || createPreview(m.bodyText, m.subject),
        bodyText: m.bodyText,
        receivedAt: m.receivedAt,
        verificationCode: extractVerificationCode(m.bodyText),
        mailboxId,
        userId,
      })),
      skipDuplicates: true,
    });
    createdCount = created.count;
  }

  const { logMessage, bannerMessage } = createSyncSummary({
    fetchedCount,
    createdCount,
  });

  const finishedAt = new Date();
  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "active"),
    createSyncLog({
      userId,
      mailboxId,
      status: "success",
      startedAt,
      finishedAt,
      message: logMessage,
    }),
  ]);

  return { success: true, bannerMessage };
}

async function recordGmailSyncError(
  userId: string,
  mailboxId: string,
  startedAt: Date,
  error: unknown,
): Promise<SyncOutcome> {
  const finishedAt = new Date();
  const message = isGmailApiError(error)
    ? GMAIL_SYNC_ERROR_MESSAGES[error.code]
    : "Gmail sync failed. Please try again later.";

  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "error"),
    createSyncLog({
      userId,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message,
    }),
  ]);

  return { success: false, message };
}

export async function syncMailboxAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "mail163") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Sync is only available for 163 Mail."),
    );
  }

  const password = await getMailboxCredential(
    user.id,
    mailboxId,
    "app_password",
  );
  if (!password) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No app password found for this mailbox."),
    );
  }

  const startedAt = new Date();
  const result = await syncMailbox(mailbox.address, password);
  const finishedAt = new Date();

  if ("success" in result) {
    const { messages } = result;
    const fetchedCount = messages.length;
    let createdCount = 0;

    if (fetchedCount > 0) {
      const created = await db.message.createMany({
        data: messages.map((m) => ({
          providerMessageId: m.messageId || m.uid,
          sender: m.sender,
          subject: m.subject,
          preview: createPreview(m.bodyText, m.subject),
          bodyText: m.bodyText,
          receivedAt: m.receivedAt,
          verificationCode: extractVerificationCode(m.bodyText),
          mailboxId,
          userId: user.id,
        })),
        skipDuplicates: true,
      });
      createdCount = created.count;
    }

    const { logMessage, bannerMessage } = createSyncSummary({
      fetchedCount,
      createdCount,
    });

    await Promise.all([
      updateMailboxStatus(user.id, mailboxId, "active"),
      createSyncLog({
        userId: user.id,
        mailboxId,
        status: "success",
        startedAt,
        finishedAt,
        message: logMessage,
      }),
    ]);

    redirect("/mailboxes?success=" + encodeURIComponent(bannerMessage));
  }

  const errorMessage = MAIL163_SYNC_ERROR_MESSAGES[result.error];
  await Promise.all([
    updateMailboxStatus(user.id, mailboxId, "error"),
    createSyncLog({
      userId: user.id,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message: errorMessage,
    }),
  ]);
  redirect("/mailboxes?error=" + encodeURIComponent(errorMessage));
}

const OUTLOOK_SYNC_ERROR_MESSAGES: Record<OutlookApiErrorCode, string> = {
  outlook_token_expired:
    "Microsoft authorization expired. Reconnect Outlook.",
  outlook_insufficient_scope:
    "Outlook mail sync not authorized. Re-authorize Sync.",
  outlook_api_failed:
    "Outlook sync failed. Please try again later.",
};

export async function syncOutlookAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/mailboxes");

  const mailboxId = String(formData.get("mailboxId") || "");

  const mailbox = await getUserMailbox(user.id, mailboxId);
  if (!mailbox) {
    redirect("/mailboxes?error=" + encodeURIComponent("Mailbox not found."));
  }

  if (mailbox.provider !== "outlook") {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("Sync is only available for Outlook."),
    );
  }

  const accessToken = await getMailboxCredential(
    user.id,
    mailboxId,
    "oauth_access_token",
  );
  if (!accessToken) {
    redirect(
      "/mailboxes?error=" +
        encodeURIComponent("No access token found. Reconnect Outlook."),
    );
  }

  const startedAt = new Date();
  const scope = await getMailboxCredential(
    user.id,
    mailboxId,
    "oauth_granted_scope",
  );
  if (!hasMailReadScope(scope ?? undefined)) {
    const outcome = await recordOutlookSyncError(
      user.id,
      mailboxId,
      startedAt,
      new OutlookApiError("outlook_insufficient_scope"),
    );
    if (!outcome.success) {
      redirect("/mailboxes?error=" + encodeURIComponent(outcome.message));
    }
  }

  const outcome = await syncOutlookInbox(
    user.id,
    mailboxId,
    accessToken,
    startedAt,
  );

  if (outcome.success) {
    redirect(
      "/mailboxes?success=" + encodeURIComponent(outcome.bannerMessage),
    );
  }
  redirect("/mailboxes?error=" + encodeURIComponent(outcome.message));
}

async function syncOutlookInbox(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<SyncOutcome> {
  try {
    return await importOutlookMessages(userId, mailboxId, accessToken, startedAt);
  } catch (error: unknown) {
    if (isOutlookApiError(error) && error.code === "outlook_token_expired") {
      const refreshToken = await getMailboxCredential(
        userId,
        mailboxId,
        "oauth_refresh_token",
      );

      if (refreshToken) {
        try {
          const refreshed = await refreshOutlookToken(refreshToken);

          await saveMailboxCredential(
            userId,
            mailboxId,
            "oauth_access_token",
            refreshed.access_token,
          );

          if (refreshed.refresh_token) {
            await saveMailboxCredential(
              userId,
              mailboxId,
              "oauth_refresh_token",
              refreshed.refresh_token,
            );
          }

          return await importOutlookMessages(
            userId,
            mailboxId,
            refreshed.access_token,
            startedAt,
          );
        } catch (retryError: unknown) {
          return recordOutlookSyncError(
            userId,
            mailboxId,
            startedAt,
            retryError,
          );
        }
      }
    }

    return recordOutlookSyncError(userId, mailboxId, startedAt, error);
  }
}

async function importOutlookMessages(
  userId: string,
  mailboxId: string,
  accessToken: string,
  startedAt: Date,
): Promise<SyncOutcome> {
  const entries = await listOutlookMessages(accessToken, 10);
  const fetchedCount = entries.length;
  let createdCount = 0;

  if (fetchedCount > 0) {
    const messages = entries.map((entry) => {
      const parsed = parseOutlookMessage(entry);
      return {
        providerMessageId: parsed.messageId,
        threadId: parsed.threadId,
        sender: parsed.sender,
        subject: parsed.subject,
        preview: parsed.preview || createPreview(parsed.bodyText, parsed.subject),
        bodyText: parsed.bodyText,
        receivedAt: parsed.receivedAt,
        verificationCode: extractVerificationCode(parsed.bodyText),
        mailboxId,
        userId,
      };
    });

    const created = await db.message.createMany({
      data: messages,
      skipDuplicates: true,
    });
    createdCount = created.count;
  }

  const { logMessage, bannerMessage } = createSyncSummary({
    fetchedCount,
    createdCount,
  });

  const finishedAt = new Date();
  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "active"),
    createSyncLog({
      userId,
      mailboxId,
      status: "success",
      startedAt,
      finishedAt,
      message: logMessage,
    }),
  ]);

  return { success: true, bannerMessage };
}

async function recordOutlookSyncError(
  userId: string,
  mailboxId: string,
  startedAt: Date,
  error: unknown,
): Promise<SyncOutcome> {
  const finishedAt = new Date();
  const message = isOutlookApiError(error)
    ? OUTLOOK_SYNC_ERROR_MESSAGES[error.code]
    : "Outlook sync failed. Please try again later.";

  await Promise.all([
    updateMailboxStatus(userId, mailboxId, "error"),
    createSyncLog({
      userId,
      mailboxId,
      status: "error",
      startedAt,
      finishedAt,
      message,
    }),
  ]);

  return { success: false, message };
}
