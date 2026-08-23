const { ImapFlow } = require('imapflow');
const { chromium } = require('playwright');

const PAYPAL_EMAIL = "creaky-infix.6h@icloud.com";

// Helper to decode quoted-printable text
function decodeQuotedPrintable(str) {
  return str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

async function extractLinksFromAccount(emailAddress, password) {
  const host = emailAddress.toLowerCase().endsWith("@gmail.com")
    ? "imap.gmail.com"
    : "outlook.office365.com";

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user: emailAddress, pass: password },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  const links = [];

  try {
    await client.mailboxOpen("INBOX");

    // Search for unread emails from tremendous.com containing TimePay in the subject
    const uids = await client.search({
      seen: false,
      from: "tremendous.com",
      or: [
        { subject: "TimePay" },
        { subject: "Timepay" }
      ]
    });

    for (const uid of uids) {
      const message = await client.fetchOne(uid, { source: true });
      if (message && message.source) {
        const rawBody = message.source.toString("utf-8");
        const decodedBody = decodeQuotedPrintable(rawBody);

        const urlPattern = /https?:\/\/[^\s<>"]*tremendous\.com\/(?:redeem|claim|c|rewards\/payout)\/[^\s<>"]+/g;
        const matches = decodedBody.match(urlPattern);

        if (matches) {
          const uniqueMatches = Array.from(new Set(matches));
          for (const url of uniqueMatches) {
            let cleanUrl = url
              .replace(/&amp;/g, "&")
              .split('"')[0]
              .split("'")[0]
              .split(">")[0]
              .split("<")[0];
            links.push({ url: cleanUrl, uid });
          }
        }
      }
    }
  } finally {
    lock.release();
  }

  return { client, links };
}

async function claimReward(url) {
  console.log(`Starting Playwright automation for: ${url}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    // 1. Click Redeem / Get Started button
    const startButton = page.locator('button:has-text("Redeem"), button:has-text("Get started"), button:has-text("Claim")');
    if (await startButton.count() > 0) {
      console.log("Clicking start button...");
      await startButton.first().click();
      await page.waitForTimeout(2000);
    }

    // 2. Select PayPal
    const paypalButton = page.locator('button:has-text("PayPal"), div[role="button"]:has-text("PayPal")');
    if (await paypalButton.count() > 0) {
      console.log("Selecting PayPal...");
      await paypalButton.first().click();
      await page.waitForTimeout(2000);
    }

    // 3. Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    if (await emailInput.count() > 0) {
      console.log("Entering claim email...");
      await emailInput.first().fill(PAYPAL_EMAIL);
      await page.waitForTimeout(1000);
    }

    // 4. Confirm payout
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Transfer")');
    if (await confirmButton.count() > 0) {
      console.log("Submitting redemption...");
      await confirmButton.first().click();
      await page.waitForTimeout(5000); // Wait for confirmation page
      console.log(`Successfully claimed: ${url}`);
      await browser.close();
      return true;
    }

    console.log(`Could not find confirmation button on: ${url}`);
  } catch (err) {
    console.error(`Failed to claim ${url}:`, err);
  }

  await browser.close();
  return false;
}

async function main() {
  const accountsJson = process.env.ACCOUNTS_JSON;
  if (!accountsJson) {
    console.error("Error: ACCOUNTS_JSON environment variable is missing.");
    process.exit(1);
  }

  const accounts = JSON.parse(accountsJson);
  console.log(`Loaded ${accounts.length} accounts to check.`);

  for (const acc of accounts) {
    console.log(`Checking ${acc.email}...`);
    try {
      const { client, links } = await extractLinksFromAccount(acc.email, acc.password);
      console.log(`Found ${links.length} new reward link(s).`);

      for (const item of links) {
        const success = await claimReward(item.url);
        if (success) {
          // Mark the email as READ so we don't process it again next run
          await client.messageFlagsAdd(item.uid, ['\\Seen']);
          console.log(`Marked email UID ${item.uid} as read.`);
        }
      }

      await client.logout();
    } catch (err) {
      console.error(`Error processing account ${acc.email}:`, err);
    }
  }
}

main();
