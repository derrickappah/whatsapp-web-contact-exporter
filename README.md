# 📥 WhatsApp Web Exporter Pro (v2.1)

An enterprise-grade Chrome Extension (Manifest V3) to export, filter, segment, and backup contacts, unsaved chat numbers, group participants, and business leads from **WhatsApp Web** with zero background CPU/RAM overhead and 100% client-side privacy.

---

## ✨ Features & Capabilities

### 📇 Data Extraction & Store Resolvers
- **Deep IndexedDB Extractor**: Direct on-demand reading from modern WhatsApp Web stores (`wawc`, `model-storage`).
- **All Contacts Exporter**: Exports saved address book contacts and unsaved direct messages.
- **Unsaved Leads Isolator**: 1-click filter for phone numbers not in your phonebook.
- **Group Participants Exporter**: Export members from individual groups or batch-export multiple groups.
- **Role Hierarchy Detection**: Distinguishes between Super Admin / Creator, Admin, and Regular Member.
- **Multi-Group Contact Merger**: Intelligently combines contacts appearing in multiple groups into a single record with combined group names.
- **Labels Support**: Filter and export contacts organized by WhatsApp Business color labels.
- **Bio / About Text**: Extracts user about status, profile notes, and business badges.

### 🎛️ Selective Column Selector & Preferences
- **Custom Column Checkboxes**: Choose exactly which columns to include in your CSV / Excel export (e.g. only `Phone Number` and `Name` for SMS blasting).
- **Persistent Settings**: Saves delimiter (Comma, Semicolon, Tab), deduplication, and column visibility in `chrome.storage.local`.

### 🗜️ Multi-Group ZIP Archive Generation
- **ZIP Bundle Mode**: When exporting multiple groups, download a single `.zip` file containing individual `.csv` or `.xlsx` files per group.

### 🌐 Country Intelligence & Formatting
- **240+ Country Database**: Built-in ISO 3166-1 dial code mapping (`lib/countries.js`).
- **National Flag Emojis**: Displays flag badges beside phone numbers in the preview list.
- **E.164 & Spaced Formatting**: Generates clean formatted numbers (`+1 (415) 555-2671` and `+14155552671`).
- **Country Breakdown View**: Visual counter of contacts grouped by country of origin.

### 📁 8 Advanced Export Formats
1. **CSV (RFC 4180 + UTF-8 BOM)**: Unicode-ready CSV with formula injection protection and custom delimiters.
2. **Excel Workbook (.xlsx / .xls)**: Styled SpreadsheetML with branded headers, alternating row colors, and auto-width columns.
3. **ZIP Archive (.zip)**: Bundled individual group spreadsheets.
4. **vCard 3.0 & 4.0 (.vcf)**: Ready for 1-click import into Google Contacts, Apple iCloud / iPhone, and Android.
5. **Google Contacts Import CSV**: Dedicated format mapping directly to Google Contacts import fields.
6. **CRM Lead Export**: Ready-to-import CSV for HubSpot, Salesforce, and Zoho CRM with Lead Status and Company mapping.
7. **Plain Text List**: Export pure phone numbers (one per line) for bulk SMS & dialer tools.
8. **HTML Report**: Responsive, printable standalone HTML table report.
9. **JSON Data**: Structured JSON with full export metadata, timestamps, and version tags.

### 📜 Export History & Local Activity Log
- **Recent Exports Log**: Keeps a local history of your last 25 exports with timestamps, filenames, record counts, and format badges.

### 🎨 Modern Dashboard UI
- **Light & Dark Theme Toggle**: Manual ☀️ / 🌙 switch in header or system auto-detection.
- **Debounced Search (200ms)**: Fast search across Name, Phone, Group, Country, and About bio.
- **Virtual Chunked DOM (60 FPS)**: Ultra-fast pagination rendering for 10,000+ contacts.
- **1-Click Copy to Clipboard**: Instant copy of selected numbers with toast notifications.
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

## 🧪 Automated Test Suite

Run the comprehensive test suite verifying all 8 export formats, ZIP generation, column filtering, and phone utilities:
```bash
node tests/run-all-tests.js
```

---

## 📄 License
MIT License • Open Source
