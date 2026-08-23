# Privacy Policy for WhatsApp Web Contact & Group Exporter

**Last Updated:** August 23, 2026

This Privacy Policy describes how **WhatsApp Web Contact & Group Exporter** ("we", "our", or "the extension") handles your information. We are committed to protecting your privacy and ensuring you have complete control over your data.

---

## 1. Zero Data Collection & 100% Client-Side Guarantee

- **No Remote Servers:** The extension does **NOT** operate any external servers, databases, or cloud endpoints.
- **No Data Transmission:** We do **NOT** collect, transmit, store, track, sell, or share any of your personal data, phone numbers, contact names, chat logs, messages, or metadata.
- **100% Local Execution:** All data extraction, parsing, and formatting (CSV, Excel, vCard, JSON) are executed entirely on your local machine within your browser's client-side sandbox.

---

## 2. Information Handled Locally

When you use the extension on WhatsApp Web (`web.whatsapp.com`), the following data is processed **locally and temporarily in your browser memory**:

- **Contacts & Phone Numbers:** Retrieved directly from your active WhatsApp Web local session to generate your requested export files.
- **Group Metadata:** Member lists, group titles, and admin statuses are read solely to create group export spreadsheets or ZIP archives.
- **User Preferences:** Settings such as your preferred theme (Dark/Light), CSV delimiter, privacy number masking toggle, and selected export columns are saved locally via Chrome's `chrome.storage.local` API and never leave your computer.

---

## 3. Permissions Explained

The extension requests only the minimum permissions necessary to function:

- `https://web.whatsapp.com/*`: Required to read contact and group metadata from your active WhatsApp Web session when you open the extension.
- `storage`: Used exclusively to persist your local user preferences (theme, delimiters, column selections) in your own browser.

---

## 4. Third-Party Services & Analytics

- We do **NOT** use any third-party analytics (e.g., Google Analytics), tracking cookies, advertising networks, or telemetry scripts.
- No network requests containing your information are ever made.

---

## 5. Security of Your Data

Because all operations occur locally on your machine, your data security is governed by your own device and browser security settings. Once an export file is generated, it is saved directly to your local computer's default downloads folder.

---

## 6. Children's Privacy

The extension does not knowingly collect or solicit any personal information from children under the age of 13.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be published directly in this repository with an updated revision date.

---

## 8. Contact & Support

If you have any questions, concerns, or feedback regarding this Privacy Policy, please open an issue on our GitHub repository:
- **Repository:** https://github.com/derrickappah/whatsapp-web-contact-exporter
- **Issues & Support:** https://github.com/derrickappah/whatsapp-web-contact-exporter/issues

---

*Disclaimer: WhatsApp™ is a registered trademark of Meta Platforms, Inc. This extension is an independent tool and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. or WhatsApp Inc.*
