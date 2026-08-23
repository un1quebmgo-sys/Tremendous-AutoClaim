# Tremendous AutoClaim

A simple, secure Next.js web application designed to automatically scan multiple Outlook and Gmail inboxes for emails sent by `reward@tremendous.com`, extract the reward links, and present them in a single dashboard to claim.

## Key Features

- **Multi-Account Scan:** Add multiple Outlook or Gmail addresses and scan them concurrently.
- **Local-Only Credentials:** Your email passwords are saved only in your browser state/session. They are processed in-memory during API calls and never stored on any server or database.
- **Auto-Extraction:** Searches the inbox, decodes email encodings (Quoted-Printable), and pulls matching `tremendous.com` links.

## Prerequisites

To connect the app to your inboxes, you must use **App Passwords** rather than your regular account passwords:

### Outlook Accounts
1. Log into your Microsoft Account Security settings.
2. Enable 2-Factor Authentication if it is not already.
3. Generate an **App Password** and use it in this app.

### Gmail Accounts
1. Go to your Gmail settings -> **Forwarding and POP/IMAP** -> **Enable IMAP**.
2. Go to your Google Account Security settings.
3. Enable 2-Step Verification.
4. Search for **App Passwords**, generate one, and use it in this app.

## How to Deploy to Vercel

1. Log into [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository: `Tremendous-AutoClaim`.
4. Click **Deploy**. Vercel will automatically build and host the app for you.

*Note: Keep your deployed Vercel URL private to ensure your endpoint is not exposed to public scanning.*
