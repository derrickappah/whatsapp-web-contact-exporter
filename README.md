# 📥 WhatsApp Web Contact & Group Exporter

A Chrome Extension (Manifest V3) that lets you export all your contacts, unsaved direct chat numbers, and group participants from **WhatsApp Web** directly into **CSV**, **Excel (.xlsx / .xls)**, **vCard (.vcf)**, and **JSON** formats.

---

## ✨ Features

- 📇 **Export All Contacts**: Save your entire WhatsApp address book with phone numbers, saved names, push names, statuses/about text, and contact types.
- ❓ **Export Unsaved Numbers**: Isolate and export only leads or chats that are not yet saved to your phone contacts.
- 👥 **Group Members Exporter**:
  - Export members from the active group chat in 1 click.
  - Export members from all or selected WhatsApp groups at once.
  - Captures group roles (*Admin*, *Super Admin*, *Member*).
- 🏷️ **Labels Support**: View and export contacts filtered by WhatsApp Business labels.
- 📁 **Multiple Export Formats**:
  - **CSV (`.csv`)**: Formatted with UTF-8 BOM so Microsoft Excel opens international characters, emojis, and Arabic/Hindi text without distortion.
  - **Excel (`.xlsx / .xls`)**: Styled spreadsheet with clean column headers and auto-width formatting.
  - **vCard 3.0 (`.vcf`)**: Standard address book format ready for 1-click import into Google Contacts, Apple iCloud / iPhone, and Android.
  - **JSON (`.json`)**: Structured data format for CRM integrations and custom developer scripts.
- 🚀 **Dual UI Options**:
  - **Extension Popup**: Full dashboard with search, filters, counters, and live preview table.
  - **In-Page Injected Toolbar**: 1-click `"📥 Export Members"` button injected directly into the WhatsApp Web chat header, plus a floating quick-export drawer.
- 🔒 **100% Private & Client-Side**: All extraction and file generation runs entirely in your local browser. No data is sent to external servers.

---

## 📦 How to Install in Chrome / Chromium

1. Open your Chromium-based browser (**Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**, etc.).
2. In the address bar, navigate to:
   ```text
   chrome://extensions
   ```
3. Enable **Developer mode** using the toggle in the top right corner.
4. Click the **Load unpacked** button in the top left.
5. Select the project directory:
   ```text
   c:\Users\DELL\Documents\antigravity\magical-brahmagupta
   ```
6. The extension **"WhatsApp Web Contact & Group Exporter"** is now installed! Pin it to your browser toolbar for quick access.

---

## 🎯 How to Use

### Method 1: Using the Extension Popup
1. Open [web.whatsapp.com](https://web.whatsapp.com) and make sure you are logged in.
2. Click the **WA Exporter Pro** icon in your browser extension toolbar.
3. Switch between tabs:
   - **All Contacts** — View and export all direct contacts.
   - **Unsaved Numbers** — Export only phone numbers not in your address book.
   - **Group Chats** — Select one or multiple groups to export all their members.
   - **Labels** — Export contacts by business labels.
4. Use the search bar to filter, or toggle the **Select All** checkbox.
5. Click **CSV**, **Excel**, **vCard (.vcf)**, or **JSON** to download your file instantly.

### Method 2: 1-Click In-Page Export (Directly inside WhatsApp Web)
1. Open any group chat on WhatsApp Web.
2. You will see a green **"📥 Export Members"** button in the top right chat header.
3. Click it, select your desired export format, and click **Export Now**.

---

## 🗂️ Extracted Fields

| Column / Field | Description |
| :--- | :--- |
| **Phone Number** | International E.164 phone number (`+14155552671`) |
| **Formatted Phone** | Country-formatted phone number |
| **Display Name** | Preferred name (Saved name or push name) |
| **Saved Name** | Address book contact name |
| **Public Push Name** | User's public WhatsApp name / emoji profile name |
| **Is Saved Contact** | `Yes` if in address book, `No` if unsaved number |
| **Contact Type** | `Business` or `Regular` account |
| **About / Status** | User's WhatsApp status / About bio |
| **Source Group** | Group name (if exported from a group) |
| **Group Role** | `Admin`, `Super Admin`, or `Member` |
| **Labels** | WhatsApp Business label tags |
| **WhatsApp JID** | Unique internal identifier (`@s.whatsapp.net`) |

---

## 🧪 Testing

To run the unit test suite for format generators:
```bash
node tests/exporters.test.js
```
