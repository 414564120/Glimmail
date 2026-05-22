import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/modules/auth";

export async function POST(request: Request) {
  await clearSessionCookie();

  return NextResponse.redirect(new URL("/login", request.url));
}
