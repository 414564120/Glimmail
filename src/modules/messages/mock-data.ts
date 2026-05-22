export type MessagePreview = {
  id: string;
  mailbox: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: string;
  verificationCode?: string;
  unread?: boolean;
};

export const messagePreviews: MessagePreview[] = [
  {
    id: "msg_01",
    mailbox: "owner@gmail.com",
    sender: "Google Workspace",
    subject: "Security alert: verify your sign-in",
    preview: "Use verification code 428163 to confirm access to your account.",
    receivedAt: "09:41",
    verificationCode: "428163",
    unread: true,
  },
  {
    id: "msg_02",
    mailbox: "ops@outlook.com",
    sender: "Microsoft Account Team",
    subject: "Your one-time sign-in code",
    preview: "A one-time code was requested. Enter 902551 within 10 minutes.",
    receivedAt: "09:18",
    verificationCode: "902551",
    unread: true,
  },
  {
    id: "msg_03",
    mailbox: "archive@163.com",
    sender: "NetEase Mail",
    subject: "Mailbox security digest",
    preview: "Recent connection summary and suspicious login review.",
    receivedAt: "Yesterday",
  },
];

export const selectedMessage = {
  subject: "Security alert: verify your sign-in",
  sender: "Google Workspace <no-reply@google.com>",
  receivedAt: "Friday, May 22 at 09:41",
  verificationCode: "428163",
  body: [
    "A sign-in attempt needs your attention.",
    "Use the verification code below to finish access confirmation.",
    "If this was not you, rotate credentials and review connected mailbox sessions.",
  ],
};
