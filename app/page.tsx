"use strict";

"use client";

import React, { useState, useEffect } from "react";

interface Account {
  id: string;
  email: string;
  password?: string;
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  linksCount: number;
}

interface RewardLink {
  account: string;
  subject: string;
  url: string;
  date: string;
}

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [rewardLinks, setRewardLinks] = useState<RewardLink[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Load saved emails from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("tremendous_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAccounts(
          parsed.map((email: string) => ({
            id: Math.random().toString(),
            email,
            status: "idle",
            linksCount: 0,
          }))
        );
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveAccountsToStorage = (updated: Account[]) => {
    localStorage.setItem(
      "tremendous_accounts",
      JSON.stringify(updated.map((a) => a.email))
    );
  };

  const addAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    // Check if email already added
    if (accounts.some((a) => a.email.toLowerCase() === newEmail.toLowerCase())) {
      alert("This account is already added.");
      return;
    }

    const updated = [
      ...accounts,
      {
        id: Math.random().toString(),
        email: newEmail,
        password: newPassword,
        status: "idle",
        linksCount: 0,
      },
    ];
    setAccounts(updated);
    saveAccountsToStorage(updated);
    setNewEmail("");
    setNewPassword("");
  };

  const removeAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    saveAccountsToStorage(updated);
  };

  const updateAccountPassword = (id: string, password: string) => {
    setAccounts(
      accounts.map((a) => (a.id === id ? { ...a, password } : a))
    );
  };

  const scanAccount = async (account: Account): Promise<RewardLink[]> => {
    if (!account.password) {
      throw new Error("Password missing. Please set a password.");
    }

    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: account.password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to scan account.");
    }

    return (data.links || []).map((link: any) => ({
      account: account.email,
      subject: link.subject,
      url: link.url,
      date: link.date,
    }));
  };

  const startScan = async () => {
    if (accounts.length === 0) return;
    setIsScanning(true);
    setRewardLinks([]);

    const scanPromises = accounts.map(async (acc) => {
      // Set status to loading
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, status: "loading", error: undefined, linksCount: 0 } : a))
      );

      try {
        const links = await scanAccount(acc);
        setAccounts((prev) =>
          prev.map((a) => (a.id === acc.id ? { ...a, status: "success", linksCount: links.length } : a))
        );
        setRewardLinks((prev) => {
          const combined = [...prev, ...links];
          const unique = [];
          const seen = new Set();
          for (const item of combined) {
            if (!seen.has(item.url)) {
              seen.add(item.url);
              unique.push(item);
            }
          }
          return unique;
        });
      } catch (err: any) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === acc.id ? { ...a, status: "error", error: err.message || "Error" } : a))
        );
      }
    });

    await Promise.all(scanPromises);
    setIsScanning(false);
  };

  return (
    <main className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">
      {/* Browser Automation Helper */}
      <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
            ⚡ Browser Auto-Claiming Active
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            You can automate the payout process (clicks "PayPal" and fills your email <b>creaky-infix.6h@icloud.com</b> automatically). Install the Tampermonkey browser extension, then click the button to add the script.
          </p>
        </div>
        <a
          href="/autoclaimer.user.js"
          target="_blank"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shrink-0"
        >
          Install Auto-Claimer Script
        </a>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            🎁 Tremendous AutoClaim
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Extract Tremendous reward links across multiple Outlook and Gmail inboxes at once.
          </p>
        </div>
        <button
          onClick={startScan}
          disabled={isScanning || accounts.length === 0}
          className="w-full md:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition shadow-lg shadow-emerald-950/20"
        >
          {isScanning ? "Scanning..." : "Scan All Accounts"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Settings */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6">
            <h2 className="text-xl font-bold text-white">Accounts Setup</h2>

            {/* Add Account Form */}
            <form onSubmit={addAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@outlook.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  App Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
              >
                Add Account
              </button>
            </form>

            {/* Help Accordion */}
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/50">
              <details className="group">
                <summary className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer select-none flex justify-between items-center list-none">
                  <span>🔑 Detailed App Password Guide</span>
                  <span className="transition-transform group-open:rotate-180 text-[10px]">▼</span>
                </summary>
                <div className="mt-3 text-xs text-slate-300 space-y-4 pt-2 border-t border-slate-800">
                  <div>
                    <h4 className="font-bold text-white mb-1 flex items-center gap-1">
                      <span>Ⓜ️</span> Outlook / Hotmail (Microsoft)
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                      <li>
                        Go directly to your{" "}
                        <a
                          href="https://account.live.com/proofs/Manage"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline font-semibold"
                        >
                          Microsoft Advanced Security Options
                        </a>.
                      </li>
                      <li>Enable <b>Two-step verification</b> if it isn't active.</li>
                      <li>Scroll to the <b>App passwords</b> header.</li>
                      <li>Click <b>Create a new app password</b> and copy the 16-character key.</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1 flex items-center gap-1">
                      <span>🔴</span> Gmail (Google)
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px]">
                      <li>
                        Enable IMAP in your{" "}
                        <a
                          href="https://mail.google.com/mail/u/0/#settings/fwdandpop"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-450 hover:underline font-semibold"
                        >
                          Gmail IMAP Settings
                        </a>.
                      </li>
                      <li>
                        Go directly to{" "}
                        <a
                          href="https://myaccount.google.com/apppasswords"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-450 hover:underline font-semibold"
                        >
                          Google App Passwords
                        </a> (requires 2-Step Verification enabled first).
                      </li>
                      <li>Type a custom name (e.g. "AutoClaim") and click **Create**.</li>
                      <li>Copy the 16-letter password from the yellow box.</li>
                    </ol>
                  </div>
                </div>
              </details>
            </div>

            <hr className="border-slate-850" />

            {/* Account List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400">Configured Accounts ({accounts.length})</h3>
              {accounts.length === 0 ? (
                <p className="text-xs text-slate-600">No accounts configured yet.</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-2">
                          <span className="text-sm font-medium text-white block truncate">
                            {acc.email}
                          </span>
                          <span className="text-xs text-slate-500">
                            {acc.email.endsWith("gmail.com") ? "Gmail" : "Outlook"}
                          </span>
                        </div>
                        <button
                          onClick={() => removeAccount(acc.id)}
                          className="text-xs text-rose-500 hover:text-rose-400 font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Password Input for existing accounts */}
                      <div>
                        <input
                          type="password"
                          placeholder="Update password/token"
                          value={acc.password || ""}
                          onChange={(e) => updateAccountPassword(acc.id, e.target.value)}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-805 rounded text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      {/* Status indicator */}
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-slate-400">Status:</span>
                        {acc.status === "idle" && (
                          <span className="text-slate-500 font-medium">Idle</span>
                        )}
                        {acc.status === "loading" && (
                          <span className="text-amber-500 font-medium animate-pulse">Scanning...</span>
                        )}
                        {acc.status === "success" && (
                          <span className="text-emerald-500 font-medium">
                            Success ({acc.linksCount} found)
                          </span>
                        )}
                        {acc.status === "error" && (
                          <span
                            className="text-rose-500 font-medium truncate max-w-[150px]"
                            title={acc.error}
                          >
                            Error: {acc.error}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 min-h-[400px] flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4">Extracted Reward Links</h2>

            {rewardLinks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                <span className="text-4xl">📥</span>
                <p className="font-medium text-slate-400">No links fetched yet.</p>
                <p className="text-xs max-w-sm text-center">
                  Add your accounts, supply their App Passwords, and click "Scan All Accounts" above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                      <th className="py-3 px-2">Account</th>
                      <th className="py-3 px-2">Subject</th>
                      <th className="py-3 px-2">Received</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-sm">
                    {rewardLinks.map((link, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-3 px-2 font-medium text-slate-300 max-w-[150px] truncate">
                          {link.account}
                        </td>
                        <td className="py-3 px-2 text-slate-400 max-w-[200px] truncate" title={link.subject}>
                          {link.subject}
                        </td>
                        <td className="py-3 px-2 text-slate-500 text-xs">
                          {new Date(link.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-3 py-1 bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-400 font-semibold rounded text-xs transition"
                          >
                            Claim Reward ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
