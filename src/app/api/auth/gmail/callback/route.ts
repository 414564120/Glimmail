import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/modules/security/crypto";
import {
  exchangeCodeForTokens,
  getGmailProfile,
  hasGmailReadonlyScope,
} from "@/modules/providers/gmail";

const STATE_COOKIE = "gmail_oauth_state";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error === "access_denied") {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent("You declined the Gmail authorization."),
    );
  }

  if (!code) {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" + encodeURIComponent("Missing authorization code."),
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return redirectAndClearState(request, "/login?next=/mailboxes");
  }

  const cookieStore = await cookies();
  const storedStateCookie = cookieStore.get(STATE_COOKIE)?.value;
  const [storedState, storedUserId, requestedScope] =
    storedStateCookie?.split(":") ?? [];

  if (
    !storedState ||
    !storedUserId ||
    !state ||
    storedState !== state ||
    storedUserId !== user.id
  ) {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent("Authorization session expired. Please try again."),
    );
  }

  const redirectUri = getRedirectUri(request);

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code, redirectUri);
  } catch {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent("Gmail connection failed. Please try again."),
    );
  }

  if (requestedScope === "gmail" && !hasGmailReadonlyScope(tokens.scope)) {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent(
          "Gmail inbox read access was not granted. Reconnect Gmail and approve the Gmail read-only permission.",
        ),
    );
  }

  let email: string;
  try {
    const profile = await getGmailProfile(tokens.access_token, tokens.id_token);
    email = profile.emailAddress;
  } catch {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent(
          "Could not verify your Gmail account. Please try again.",
        ),
    );
  }

  try {
    const existing = await db.mailbox.findFirst({
      where: { userId: user.id, provider: "gmail", address: email },
    });

    if (existing) {
      await db.$transaction([
        db.mailboxCredential.upsert({
          where: { mailboxId_kind: { mailboxId: existing.id, kind: "oauth_access_token" } },
          create: {
            mailboxId: existing.id,
            userId: user.id,
            kind: "oauth_access_token",
            encryptedSecret: encrypt(tokens.access_token),
          },
          update: { encryptedSecret: encrypt(tokens.access_token) },
        }),
        ...(tokens.refresh_token
          ? [
              db.mailboxCredential.upsert({
                where: { mailboxId_kind: { mailboxId: existing.id, kind: "oauth_refresh_token" } },
                create: {
                  mailboxId: existing.id,
                  userId: user.id,
                  kind: "oauth_refresh_token",
                  encryptedSecret: encrypt(tokens.refresh_token),
                },
                update: { encryptedSecret: encrypt(tokens.refresh_token) },
              }),
            ]
          : []),
        db.mailboxCredential.upsert({
          where: { mailboxId_kind: { mailboxId: existing.id, kind: "oauth_granted_scope" } },
          create: {
            mailboxId: existing.id,
            userId: user.id,
            kind: "oauth_granted_scope",
            encryptedSecret: encrypt(tokens.scope),
          },
          update: { encryptedSecret: encrypt(tokens.scope) },
        }),
      ]);
    } else {
      await db.$transaction(async (tx) => {
        const mailbox = await tx.mailbox.create({
          data: { userId: user.id, provider: "gmail", address: email },
        });

        await tx.mailboxCredential.create({
          data: {
            mailboxId: mailbox.id,
            userId: user.id,
            kind: "oauth_access_token",
            encryptedSecret: encrypt(tokens.access_token),
          },
        });

        if (tokens.refresh_token) {
          await tx.mailboxCredential.create({
            data: {
              mailboxId: mailbox.id,
              userId: user.id,
              kind: "oauth_refresh_token",
              encryptedSecret: encrypt(tokens.refresh_token),
            },
          });
        }

        await tx.mailboxCredential.create({
          data: {
            mailboxId: mailbox.id,
            userId: user.id,
            kind: "oauth_granted_scope",
            encryptedSecret: encrypt(tokens.scope),
          },
        });
      });
    }
  } catch {
    return redirectAndClearState(
      request,
      "/mailboxes?error=" +
        encodeURIComponent("Gmail connection could not be saved. Please try again."),
    );
  }

  const response = NextResponse.redirect(
    new URL("/mailboxes?success=" + encodeURIComponent(`${email} connected successfully.`), request.url),
  );

  response.cookies.delete(STATE_COOKIE);

  return response;
}

function getRedirectUri(request: NextRequest): string {
  const configured = process.env.GOOGLE_REDIRECT_URI;
  if (configured) return configured;

  const { protocol, host } = request.nextUrl;
  return `${protocol}//${host}/api/auth/gmail/callback`;
}

function redirectAndClearState(
  request: NextRequest,
  path: string,
): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
