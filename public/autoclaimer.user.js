// ==UserScript==
// @name         Tremendous Auto-Claimer
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Automatically claims Tremendous rewards to PayPal
// @author       Antigravity
// @match        https://www.tremendous.com/rewards/payout/*
// @match        https://www.tremendous.com/redeem/*
// @match        https://www.tremendous.com/c/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const PAYPAL_EMAIL = "creaky-infix.6h@icloud.com";

    console.log("Tremendous Auto-Claimer active!");

    const interval = setInterval(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
        
        // 1. Look for and click the initial "Redeem" or "Get Started" buttons
        const startBtn = buttons.find(b => {
            const text = b.textContent?.toLowerCase() || '';
            return text.includes('redeem') || text.includes('get started') || text.includes('claim');
        });
        if (startBtn && !startBtn.disabled) {
            console.log("Clicking redemption start button...");
            startBtn.click();
        }

        // 2. Look for and click the PayPal option
        const paypalBtn = buttons.find(b => {
            const text = b.textContent?.toLowerCase() || '';
            return text.includes('paypal');
        });
        if (paypalBtn) {
            console.log("Selecting PayPal payout...");
            paypalBtn.click();
        }

        // 3. Auto-fill the email input with your iCloud address
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        if (emailInput && emailInput.value !== PAYPAL_EMAIL) {
            console.log("Auto-filling email address...");
            emailInput.value = PAYPAL_EMAIL;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 4. Click the final submit/confirm transfer button
        const confirmBtn = buttons.find(b => {
            const text = b.textContent?.toLowerCase() || '';
            return text.includes('confirm') || text.includes('submit') || text.includes('transfer') || text.includes('payout');
        });
        if (confirmBtn && emailInput && emailInput.value === PAYPAL_EMAIL) {
            console.log("Confirming transfer...");
            confirmBtn.click();
            clearInterval(interval); // Stop searching once submitted
        }
    }, 1000);
})();
