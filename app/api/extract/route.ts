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
      const mailbox = await client.mailboxOpen("INBOX");

      // Fetch the last 10 email UIDs using sequence range (e.g. "90:100")
      const totalMessages = mailbox.exists || 0;
      const startSeq = Math.max(1, totalMessages - 9);
      const seqRange = `${startSeq}:${totalMessages}`;

      if (totalMessages > 0) {
        for await (let message of client.fetch(seqRange, { source: true, envelope: true })) {
          if (message && message.source) {
            const rawBody = message.source.toString("utf-8");
            const decodedBody = decodeQuotedPrintable(rawBody);
            const subject = message.envelope?.subject || "No Subject";
            const date = message.envelope?.date
              ? message.envelope.date.toISOString()
              : new Date().toISOString();

          // Regex to match any HTTP/HTTPS URLs (or tremendous specifically if wanted, let's match any link for testing)
          const urlPattern = /https?:\/\/[^\s<>"]+/g;
          const matches = decodedBody.match(urlPattern);

          if (matches) {
            // Deduplicate
            const uniqueMatches = Array.from(new Set(matches));
            for (const url of uniqueMatches) {
              // Clean trailing or leading HTML entities, quotes, brackets
              let cleanUrl = url
                .replace(/&amp;/g, "&")
                .split('"')[0]
                .split("'")[0]
                .split(">")[0]
                .split("<")[0];
              
              // Only return links that look like actual websites (exclude tracking/internal email schemas)
              if (cleanUrl.includes(".") && cleanUrl.length > 10) {
                links.push({
                  subject,
                  url: cleanUrl,
                  date,
                });
              }
            }
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
