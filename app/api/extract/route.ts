import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

// Helper to decode quoted-printable text (common in email encoding)
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, "") // Join soft line breaks
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const host = email.toLowerCase().endsWith("@gmail.com")
      ? "imap.gmail.com"
      : "outlook.office365.com";

    const client = new ImapFlow({
      host,
      port: 993,
      secure: true,
      auth: {
        user: email,
        pass: password,
      },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    const links: { subject: string; url: string; date: string }[] = [];

    try {
      // Select Inbox
      await client.mailboxOpen("INBOX");

      // Search for emails from tremendous.com OR containing tremendous.com in the body
      const uids = await client.search({
        or: [
          { from: "tremendous.com" },
          { body: "tremendous.com" }
        ]
      });

      for (const uid of uids) {
        const message = await client.fetchOne(uid, { source: true, envelope: true });
        if (message && message.source) {
          const rawBody = message.source.toString("utf-8");
          const decodedBody = decodeQuotedPrintable(rawBody);
          const subject = message.envelope?.subject || "No Subject";
          const date = message.envelope?.date
            ? message.envelope.date.toISOString()
            : new Date().toISOString();

          // Regex to match Tremendous reward redeem/claim/payout links specifically
          const urlPattern = /https?:\/\/[^\s<>"]*tremendous\.com\/(?:redeem|claim|c|rewards\/payout)\/[^\s<>"]+/g;
          const matches = decodedBody.match(urlPattern);

          if (matches) {
            // Deduplicate within the email
            const uniqueMatches = Array.from(new Set(matches));
            for (const url of uniqueMatches) {
              // Clean trailing or leading HTML entities, quotes, brackets
              let cleanUrl = url
                .replace(/&amp;/g, "&")
                .split('"')[0]
                .split("'")[0]
                .split(">")[0]
                .split("<")[0];
              
              links.push({
                subject,
                url: cleanUrl,
                date,
              });
            }
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({ success: true, links });
  } catch (error: any) {
    console.error("IMAP extraction error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to connect or fetch emails." },
      { status: 500 }
    );
  }
}
