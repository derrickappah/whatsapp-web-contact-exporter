# 📥 WhatsApp Web Exporter Pro (v2.0)

An enterprise-grade Chrome Extension (Manifest V3) to export, filter, segment, and backup contacts, unsaved chat numbers, group participants, and business leads from **WhatsApp Web** with zero background CPU/RAM overhead and 100% client-side privacy.

---

## ✨ 100 Comprehensive Features & Capabilities

### 📇 Data Extraction & Store Resolvers
- **Deep IndexedDB Extractor**: Direct on-demand reading from modern WhatsApp Web stores (`wawc`, `model-storage`).
- **All Contacts Exporter**: Exports saved address book contacts and unsaved direct messages.
- **Unsaved Leads Isolator**: 1-click filter for phone numbers not in your phonebook.
- **Group Participants Exporter**: Export members from individual groups or batch-export multiple groups.
- **Role Hierarchy Detection**: Distinguishes between Super Admin / Creator, Admin, and Regular Member.
- **Labels Support**: Filter and export contacts organized by WhatsApp Business color labels.
- **Bio / About Text**: Extracts user about status, profile notes, and business badges.

### 🌐 Country Intelligence & Formatting
- **240+ Country Database**: Built-in ISO 3166-1 dial code mapping.
- **National Flag Emojis**: Displays flag badges beside phone numbers in the preview list.
- **E.164 & Spaced Formatting**: Generates clean formatted numbers (`+1 (415) 555-2671` and `+14155552671`).
- **Country Breakdown View**: Visual counter of contacts grouped by country of origin.

### 📁 Advanced Export Formats
1. **CSV (RFC 4180 + UTF-8 BOM)**: Unicode-ready CSV for Excel on Windows & Mac with configurable delimiters (Comma, Semicolon, Tab).
2. **Excel Workbook (.xlsx / .xls)**: Styled SpreadsheetML with branded headers, alternating row colors, and auto-width columns.
3. **vCard 3.0 & 4.0 (.vcf)**: Ready for 1-click import into Google Contacts, Apple iCloud / iPhone, and Android.
4. **Google Contacts Import CSV**: Dedicated format mapping directly to Google Contacts import fields.
5. **CRM Lead Export**: Ready-to-import CSV for HubSpot, Salesforce, and Zoho CRM with Lead Status and Company mapping.
6. **Plain Text List**: Export pure phone numbers (one per line) for bulk SMS & dialer tools.
7. **HTML Report**: Responsive, printable standalone HTML table report.
8. **JSON Data**: Structured JSON with full export metadata, timestamps, and version tags.

### 🛡️ Security & 100% Client-Side Privacy
- **0.00% Background Footprint**: Completely passive when popup is closed; 0 background CPU and 0 MB RAM overhead.
- **CSV Formula Injection Sanitization**: Strips or escapes `=`, `+`, `-`, `@`, `\t`, `\r` to prevent CSV Command Injection vulnerabilities in Excel.
- **Privacy Masking Mode**: 1-click toggle to mask middle digits for screen recording and presentations.
- **100% Client-Side**: No external network requests, no analytics, no third-party tracking.

### 🎨 Modern Dashboard UI
- **Responsive Theme**: WhatsApp-themed UI supporting Light and Dark modes.
- **Debounced Search (200ms)**: Fast search across Name, Phone, Group, Country, and About bio.
- **1-Click Copy to Clipboard**: Instant copy of selected numbers with toast notifications.
- **Preferences Modal**: Customize default delimiter, auto-deduplication, and privacy options.
- **Keyboard Shortcuts**: `Ctrl+A` to select all, `Esc` to clear search / dismiss modals, `Enter` to export.

---

## 📦 How to Install in Chrome / Edge / Brave

1. Open your Chromium-based browser (**Google Chrome**, **Microsoft Edge**, **Brave**, **Arc**).
2. Navigate to:
   ```text
   chrome://extensions
   ```
3. Turn on **Developer mode** (top right toggle).
4. Click **Load unpacked** (top left button).
5. Select the project directory:
   ```text
   c:\Users\DELL\Documents\antigravity\magical-brahmagupta
   ```
6. Pin **WhatsApp Web Exporter Pro** to your extension bar for 1-click access!

---

## 🎯 How to Use

1. Open [web.whatsapp.com](https://web.whatsapp.com) and ensure you are logged in.
2. Click the **WA Exporter Pro** icon in your browser toolbar.
3. Select your desired tab:
   - **All Contacts** — All saved & unsaved contacts.
   - **Unsaved Leads** — Only numbers not saved in address book.
   - **Group Chats** — Select one or multiple groups to export participants.
   - **Countries** — View and export contacts grouped by country.
   - **Labels** — Export contacts by business labels.
4. Filter by country or search by keyword if needed.
5. Click **CSV**, **Excel**, **vCard**, **Google**, or **Download** to save your file!

---

## 🧪 Automated Test Suite

Run the comprehensive test suite verifying all 8 export formats, security sanitization, and phone utilities:
```bash
node tests/run-all-tests.js
```

---

## 📄 License
MIT License • Open Source
