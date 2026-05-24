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
    return NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("You declined the Gmail authorization."), request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("Missing authorization code."), request.url),
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/mailboxes", request.url),
    );
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
    const response = NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("Authorization session expired. Please try again."), request.url),
    );
    response.cookies.delete(STATE_COOKIE);
    return response;
  }

  const redirectUri = getRedirectUri(request);

  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code, redirectUri);
  } catch {
    return NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("Gmail connection failed. Please try again."), request.url),
    );
  }

  if (requestedScope === "gmail" && !hasGmailReadonlyScope(tokens.scope)) {
    return NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("Gmail inbox read access was not granted. Reconnect Gmail and approve the Gmail read-only permission."), request.url),
    );
  }

  let email: string;
  try {
    const profile = await getGmailProfile(tokens.access_token, tokens.id_token);
    email = profile.emailAddress;
  } catch {
    return NextResponse.redirect(
      new URL("/mailboxes?error=" + encodeURIComponent("Could not verify your Gmail account. Please try again."), request.url),
    );
  }

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
    });
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
