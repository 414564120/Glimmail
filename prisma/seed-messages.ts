import { db } from "./client";

async function main() {
  const user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error(
      "No user found. Run 'pnpm db:seed' first to create the owner user.",
    );
    process.exit(1);
  }

  const mailbox = await db.mailbox.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (!mailbox) {
    console.error(
      `User ${user.email} has no mailboxes. Visit /mailboxes and connect a provider first.`,
    );
    process.exit(1);
  }

  const now = new Date();

  const seedMessages = [
    {
      providerMessageId: "seed-msg-01",
      sender: "Google Security",
      subject: "Verify your recent sign-in attempt",
      preview:
        "A new sign-in was detected on your account. Use the verification code to confirm.",
      bodyText:
        "Hello,\n\nWe noticed a sign-in attempt from an unrecognized device. To ensure your account remains secure, please verify this activity.\n\nUse the one-time code below to confirm your identity. The code expires in 10 minutes.\n\nIf this wasn't you, we recommend changing your password immediately.",
      verificationCode: "749201",
      receivedAt: new Date(now.getTime() - 2 * 60_000),
    },
    {
      providerMessageId: "seed-msg-02",
      sender: "GitHub",
      subject: "Email verification required",
      preview:
        "Please verify your email address to enable all GitHub features.",
      bodyText:
        "Thanks for signing up for GitHub.\n\nPlease verify your email address by entering the code below. This helps us ensure we can reach you about important account updates.",
      verificationCode: "428163",
      receivedAt: new Date(now.getTime() - 15 * 60_000),
    },
    {
      providerMessageId: "seed-msg-03",
      sender: "Elena Rostova",
      subject: "Project Neon — Q3 Design Assets",
      preview:
        "Attached are the finalized UI components for the upcoming release.",
      bodyText:
        "Hi team,\n\nHere are the finalized design assets for Project Neon Q3. I've included the updated component library, color tokens, and layout mockups we discussed on Tuesday.\n\nLet me know if anything needs adjustment before the Friday review.\n\nBest,\nElena",
      verificationCode: null,
      receivedAt: new Date(now.getTime() - 3 * 60 * 60_000),
    },
    {
      providerMessageId: "seed-msg-04",
      sender: "Cloud Services",
      subject: "Weekly Usage Report",
      preview:
        "Your weekly summary of storage and bandwidth consumption is ready.",
      bodyText:
        "Dear user,\n\nHere is your weekly cloud usage summary:\n\n• Storage: 4.2 GB of 15 GB used\n• Bandwidth: 1.8 GB transferred\n• Compute hours: 12.4 hours\n\nAll services are operating within normal parameters. No action is needed.",
      verificationCode: null,
      receivedAt: new Date(now.getTime() - 24 * 60 * 60_000),
    },
    {
      providerMessageId: "seed-msg-05",
      sender: "Microsoft Account Team",
      subject: "Your one-time sign-in code",
      preview:
        "A one-time code was requested. Enter 902551 within 10 minutes.",
      bodyText:
        "Security alert\n\nA one-time sign-in code was requested for your Microsoft account. If this was you, use the following code to complete sign-in.\n\nThis code is valid for 10 minutes and can only be used once.",
      verificationCode: "902551",
      receivedAt: new Date(now.getTime() - 2 * 24 * 60 * 60_000),
    },
  ];

  for (const msg of seedMessages) {
    await db.message.upsert({
      where: {
        providerMessageId_mailboxId: {
          providerMessageId: msg.providerMessageId,
          mailboxId: mailbox.id,
        },
      },
      update: {},
      create: {
        ...msg,
        mailboxId: mailbox.id,
        userId: user.id,
      },
    });
  }

  console.log(
    `Seeded ${seedMessages.length} messages for ${user.email} → ${mailbox.address} (mailbox: ${mailbox.id})`,
  );
}

main()
  .catch((error) => {
    console.error("Seed messages failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
