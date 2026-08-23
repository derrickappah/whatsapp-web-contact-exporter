/**
 * WhatsApp Web Contact Exporter - Advanced Multi-Format Generator (v2.1)
 * Supports CSV (with Column Filtering & Injection Guard), Excel (.xlsx / .xls),
 * vCard 3.0 / 4.0, Google Contacts, CRM Leads, Plain Text, HTML Report, JSON, and ZIP archives.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./phone-utils', './countries', './zip'], factory);
  } else if (typeof module === 'object' && module.exports) {
    const phoneUtils = require('./phone-utils');
    const countries = require('./countries');
    const zip = require('./zip');
    module.exports = factory(phoneUtils, countries, zip);
  } else {
    root.WAExporters = factory(root.WAPhoneUtils, root.WACountries, root.WAZip);
  }
}(typeof self !== 'undefined' ? self : this, function (WAPhoneUtils, WACountries, WAZip) {

  const ALL_COLUMNS = [
    { key: 'phone', label: 'Phone Number', getter: c => c.phoneNumber ? `+${c.phoneNumber}` : '' },
    { key: 'formattedPhone', label: 'Formatted Phone', getter: c => c.formattedNumber },
    { key: 'country', label: 'Country', getter: c => c.country },
    { key: 'displayName', label: 'Display Name', getter: c => c.displayName },
    { key: 'savedName', label: 'Saved Name', getter: c => c.savedName },
    { key: 'publicName', label: 'Public Push Name', getter: c => c.publicName },
    { key: 'isSaved', label: 'Is Saved Contact', getter: c => c.isSaved ? 'Yes' : 'No' },
    { key: 'isBusiness', label: 'Contact Type', getter: c => c.isBusiness ? 'Business' : 'Regular' },
    { key: 'about', label: 'About / Status', getter: c => c.about },
    { key: 'groupName', label: 'Source Group', getter: c => c.groupName },
    { key: 'groupRole', label: 'Group Role', getter: c => c.groupName ? c.groupRole : '' },
    { key: 'labels', label: 'Labels', getter: c => c.labels },
    { key: 'jid', label: 'WhatsApp JID', getter: c => c.jid }
  ];

  function triggerDownload(blob, filename) {
    if (typeof window === 'undefined' || !window.document) {
      return blob;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
    return true;
  }

  function normalizeContact(item) {
    const rawNumber = item.phoneNumber || item.number || (item.id && !item.id.includes('@g.us') ? item.id.replace(/@.*$/, '') : '');
    const cleanDigits = WAPhoneUtils ? WAPhoneUtils.cleanDigits(rawNumber) : String(rawNumber).replace(/[^0-9]/g, '');
    const savedName = item.savedName || item.name || '';
    const publicName = item.publicName || item.pushname || item.notifyName || '';
    const formattedTitle = item.formattedTitle || item.formattedName || '';
    
    const isSaved = item.isSaved !== undefined ? item.isSaved : Boolean(item.isMyContact || item.isAddressBookContact || (savedName && savedName !== cleanDigits));
    const displayName = item.displayName || (savedName && savedName !== cleanDigits ? savedName : '') || formattedTitle || publicName || (cleanDigits ? `+${cleanDigits}` : 'Unknown');

    const countryInfo = WAPhoneUtils ? WAPhoneUtils.detectCountry(cleanDigits) : { name: 'International', code: '', flag: '🌐' };
    const formattedNumber = WAPhoneUtils ? WAPhoneUtils.formatPretty(cleanDigits) : (cleanDigits ? `+${cleanDigits}` : '');

    return {
      phoneNumber: cleanDigits,
      formattedNumber: formattedNumber || `+${cleanDigits}`,
      savedName: savedName,
      publicName: publicName,
      displayName: displayName,
      isSaved: isSaved,
      isBusiness: item.isBusiness || item.isEnterprise || false,
      about: item.about || item.status || '',
      groupName: item.groupName || item.sourceGroup || '',
      groupRole: item.groupRole || (item.isAdmin ? (item.isSuperAdmin ? 'Super Admin' : 'Admin') : 'Member'),
      labels: Array.isArray(item.labels) ? item.labels.join(', ') : (item.labels || ''),
      country: countryInfo.name || 'International',
      countryCode: countryInfo.code ? `+${countryInfo.code}` : '',
      countryFlag: countryInfo.flag || '🌐',
      jid: item.jid || item.id || (cleanDigits ? `${cleanDigits}@c.us` : '')
    };
  }

  /**
   * Merges contacts appearing in multiple groups into single records with combined group names
   */
  function mergeGroupContacts(contactsList) {
    const map = new Map();

    contactsList.forEach(raw => {
      const c = normalizeContact(raw);
      const phone = c.phoneNumber;
      if (!phone) return;

      if (!map.has(phone)) {
        map.set(phone, { ...c, groupNamesSet: new Set(c.groupName ? [c.groupName] : []) });
      } else {
        const existing = map.get(phone);
        if (c.groupName) existing.groupNamesSet.add(c.groupName);
        if (!existing.savedName && c.savedName) existing.savedName = c.savedName;
        if (!existing.about && c.about) existing.about = c.about;
        if (!existing.isBusiness && c.isBusiness) existing.isBusiness = c.isBusiness;
      }
    });

    return Array.from(map.values()).map(c => ({
      ...c,
      groupName: Array.from(c.groupNamesSet || []).join(', ')
    }));
  }

  /**
   * Sanitizes string against CSV Formula Injection Attacks
   */
  function sanitizeCell(val) {
    if (val === null || val === undefined) return '';
    let str = String(val);

    if (/^[=@\-\t\r]/.test(str)) {
      str = "'" + str;
    } else if (str.startsWith('+') && !/^\+[0-9\s()-]+$/.test(str)) {
      str = "'" + str;
    }

    if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function getActiveColumns(selectedColumns) {
    if (!selectedColumns || typeof selectedColumns !== 'object') {
      return ALL_COLUMNS;
    }
    const filtered = ALL_COLUMNS.filter(col => Boolean(selectedColumns[col.key]));
    return filtered.length > 0 ? filtered : ALL_COLUMNS;
  }

  /**
   * CSV Generator with UTF-8 BOM & Selective Columns
   */
  function generateCSV(contacts, delimiter = ',', selectedColumns = null) {
    const cols = getActiveColumns(selectedColumns);
    const headers = cols.map(c => c.label);
    const rows = [headers.map(sanitizeCell).join(delimiter)];

    for (const raw of contacts) {
      const c = normalizeContact(raw);
      const row = cols.map(col => sanitizeCell(col.getter(c)));
      rows.push(row.join(delimiter));
    }

    return '\uFEFF' + rows.join('\r\n');
  }

  function exportToCSV(contacts, filename = 'whatsapp_contacts.csv', delimiter = ',', selectedColumns = null) {
    const csvContent = generateCSV(contacts, delimiter, selectedColumns);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return csvContent;
  }

  /**
   * Google Contacts CSV Format Generator
   */
  function generateGoogleContactsCSV(contacts) {
    const headers = [
      'Name',
      'Given Name',
      'Family Name',
      'Group Membership',
      'Phone 1 - Type',
      'Phone 1 - Value',
      'Notes'
    ];

    const rows = [headers.map(sanitizeCell).join(',')];

    for (const raw of contacts) {
      const c = normalizeContact(raw);
      const split = WAPhoneUtils ? WAPhoneUtils.splitName(c.displayName) : { firstName: c.displayName, lastName: '' };
      const notes = [c.about, c.groupRole ? `Group: ${c.groupName} (${c.groupRole})` : ''].filter(Boolean).join(' | ');

      const row = [
        sanitizeCell(c.displayName),
        sanitizeCell(split.firstName),
        sanitizeCell(split.lastName),
        sanitizeCell(c.groupName ? `* WhatsApp ::: ${c.groupName}` : '* WhatsApp Contacts'),
        sanitizeCell('Mobile'),
        sanitizeCell(c.phoneNumber ? `+${c.phoneNumber}` : ''),
        sanitizeCell(notes)
      ];
      rows.push(row.join(','));
    }

    return '\uFEFF' + rows.join('\r\n');
  }

  function exportToGoogleContactsCSV(contacts, filename = 'google_contacts_import.csv') {
    const csvContent = generateGoogleContactsCSV(contacts);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return csvContent;
  }

  /**
   * CRM / Lead Format Generator (HubSpot / Salesforce / Zoho ready)
   */
  function generateCRMCSV(contacts) {
    const headers = [
      'First Name',
      'Last Name',
      'Full Name',
      'Mobile Phone',
      'Country',
      'Lead Status',
      'Company / Source Group',
      'Contact Type',
      'Notes / Bio',
      'Labels'
    ];

    const rows = [headers.map(sanitizeCell).join(',')];

    for (const raw of contacts) {
      const c = normalizeContact(raw);
      const split = WAPhoneUtils ? WAPhoneUtils.splitName(c.displayName) : { firstName: c.displayName, lastName: '' };

      const row = [
        sanitizeCell(split.firstName),
        sanitizeCell(split.lastName),
        sanitizeCell(c.displayName),
        sanitizeCell(c.phoneNumber ? `+${c.phoneNumber}` : ''),
        sanitizeCell(c.country),
        sanitizeCell(c.isSaved ? 'Saved Contact' : 'New Lead'),
        sanitizeCell(c.groupName || 'Direct Message'),
        sanitizeCell(c.isBusiness ? 'Business' : 'Individual'),
        sanitizeCell(c.about),
        sanitizeCell(c.labels)
      ];
      rows.push(row.join(','));
    }

    return '\uFEFF' + rows.join('\r\n');
  }

  function exportToCRMCSV(contacts, filename = 'crm_leads_export.csv') {
    const csvContent = generateCRMCSV(contacts);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return csvContent;
  }

  /**
   * Plain Text (One Phone Number Per Line)
   */
  function generatePlainText(contacts) {
    const lines = [];
    for (const raw of contacts) {
      const c = normalizeContact(raw);
      if (c.phoneNumber) {
        lines.push(`+${c.phoneNumber}`);
      }
    }
    return lines.join('\r\n');
  }

  function exportToPlainText(contacts, filename = 'whatsapp_phone_numbers.txt') {
    const textContent = generatePlainText(contacts);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return textContent;
  }

  /**
   * vCard 3.0 Generator (.vcf)
   */
  function generateVCard(contacts) {
    function escapeVCard(str) {
      if (!str) return '';
      return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    }

    const vCards = [];

    for (const raw of contacts) {
      const c = normalizeContact(raw);
      const phone = c.phoneNumber ? (c.phoneNumber.startsWith('+') ? c.phoneNumber : `+${c.phoneNumber}`) : '';
      if (!phone && !c.displayName) continue;

      const name = c.displayName || phone || 'WhatsApp Contact';
      const notes = [];
      if (c.savedName) notes.push(`Saved Name: ${c.savedName}`);
      if (c.publicName) notes.push(`Push Name: ${c.publicName}`);
      if (c.about) notes.push(`About: ${c.about}`);
      if (c.groupName) notes.push(`Group: ${c.groupName} (${c.groupRole})`);
      if (c.labels) notes.push(`Labels: ${c.labels}`);

      const split = WAPhoneUtils ? WAPhoneUtils.splitName(name) : { firstName: name, lastName: '' };

      const card = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVCard(name)}`,
        `N:${escapeVCard(split.lastName)};${escapeVCard(split.firstName)};;;`,
        phone ? `TEL;TYPE=CELL,VOICE:${phone}` : '',
        c.groupName ? `ORG:${escapeVCard(c.groupName)}` : '',
        notes.length > 0 ? `NOTE:${escapeVCard(notes.join(' | '))}` : '',
        c.labels ? `CATEGORIES:${escapeVCard(c.labels)}` : '',
        c.isBusiness ? `X-WA-BIZ:TRUE` : '',
        c.jid ? `X-WA-JID:${escapeVCard(c.jid)}` : '',
        'END:VCARD'
      ].filter(Boolean).join('\r\n');

      vCards.push(card);
    }

    return vCards.join('\r\n\r\n');
  }

  function exportToVCard(contacts, filename = 'whatsapp_contacts.vcf') {
    const vcfContent = generateVCard(contacts);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return vcfContent;
  }

  /**
   * JSON Generator
   */
  function generateJSON(contacts, metadata = {}) {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalCount: contacts.length,
        version: '2.1.0',
        exporter: 'WhatsApp Web Exporter Pro',
        ...metadata
      },
      contacts: contacts.map(normalizeContact)
    };

    return JSON.stringify(exportData, null, 2);
  }

  function exportToJSON(contacts, filename = 'whatsapp_contacts.json', metadata = {}) {
    const jsonContent = generateJSON(contacts, metadata);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return jsonContent;
  }

  /**
   * Excel SpreadsheetML Generator (.xls / .xlsx readable)
   */
  function generateExcelXML(contacts, sheetName = 'WhatsApp Contacts', selectedColumns = null) {
    const cols = getActiveColumns(selectedColumns);

    function xmlEscape(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    }

    let rowsXml = '';

    // Header Row
    rowsXml += '   <Row ss:StyleID="HeaderStyle">\n';
    cols.forEach(col => {
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(col.label)}</Data></Cell>\n`;
    });
    rowsXml += '   </Row>\n';

    // Data Rows
    contacts.forEach((raw, idx) => {
      const c = normalizeContact(raw);
      const styleId = idx % 2 === 1 ? 'AltRow' : 'Default';

      rowsXml += `   <Row ss:StyleID="${styleId}">\n`;
      cols.forEach(col => {
        rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(col.getter(c))}</Data></Cell>\n`;
      });
      rowsXml += '   </Row>\n';
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111B21"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="AltRow">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#111B21"/>
   <Interior ss:Color="#F0F2F5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#075E54"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#00A884" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName.substring(0, 31))}">
  <Table ss:DefaultColumnWidth="130">
${rowsXml}  </Table>
 </Worksheet>
</Workbook>`;

    return xml;
  }

  function exportToExcel(contacts, filename = 'whatsapp_contacts.xls', sheetName = 'WhatsApp Contacts', selectedColumns = null) {
    const xmlContent = generateExcelXML(contacts, sheetName, selectedColumns);
    const cleanFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      return triggerDownload(blob, cleanFilename);
    }
    return xmlContent;
  }

  /**
   * HTML Report Generator with Print-Ready Stylesheet
   */
  function generateHTMLReport(contacts, title = 'WhatsApp Contacts Report') {
    function esc(s) {
      if (!s) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let rowsHtml = '';
    contacts.forEach((raw, i) => {
      const c = normalizeContact(raw);
      rowsHtml += `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${esc(c.displayName)}</strong></td>
          <td><code>${esc(c.formattedNumber)}</code></td>
          <td>${esc(c.countryFlag)} ${esc(c.country)}</td>
          <td><span class="badge ${c.isSaved ? 'badge-saved' : 'badge-unsaved'}">${c.isSaved ? 'Saved' : 'Unsaved'}</span></td>
          <td>${esc(c.groupName || '-')}</td>
          <td>${esc(c.about || '-')}</td>
        </tr>
      `;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #111b21; background: #fafafa; }
    h1 { color: #00a884; font-size: 20px; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #667781; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 13px; }
    th { background: #00a884; color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; }
    td { padding: 10px 12px; border-bottom: 1px solid #e9edef; vertical-align: middle; }
    tr:nth-child(even) { background: #f9f9f9; }
    .badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 10px; }
    .badge-saved { background: #dcf8c6; color: #075e54; }
    .badge-unsaved { background: #fef3c7; color: #92400e; }
    code { font-family: monospace; font-size: 12px; }
    @media print { body { margin: 0; background: #fff; } table { box-shadow: none; } }
  </style>
</head>
<body>
  <h1>📥 ${esc(title)}</h1>
  <div class="meta">Generated by WhatsApp Web Exporter Pro • ${new Date().toLocaleString()} • Total Contacts: ${contacts.length}</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Display Name</th>
        <th>Phone Number</th>
        <th>Country</th>
        <th>Status</th>
        <th>Group</th>
        <th>About</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;
  }

  function exportToHTMLReport(contacts, filename = 'whatsapp_report.html', title = 'WhatsApp Contacts Report') {
    const htmlContent = generateHTMLReport(contacts, title);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return htmlContent;
  }

  /**
   * Export Multiple Groups as a ZIP Archive with individual files per group
   */
  function exportGroupsToZip(groupsWithMembers, zipFilename = 'whatsapp_groups_archive.zip', format = 'csv', delimiter = ',', selectedColumns = null) {
    if (!WAZip || typeof WAZip.createZip !== 'function') {
      throw new Error('ZIP Generator library not loaded');
    }

    const zip = WAZip.createZip();

    groupsWithMembers.forEach(item => {
      const groupName = (item.name || 'Group').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_') || 'Group';
      const members = item.members || [];

      if (format === 'xlsx' || format === 'xls') {
        const xml = generateExcelXML(members, groupName, selectedColumns);
        zip.addFile(`${groupName}.xls`, xml);
      } else {
        const csv = generateCSV(members, delimiter, selectedColumns);
        zip.addFile(`${groupName}.csv`, csv);
      }
    });

    const zipBlob = zip.generateBlob();
    return triggerDownload(zipBlob, zipFilename);
  }

  return {
    ALL_COLUMNS,
    normalizeContact,
    mergeGroupContacts,
    sanitizeCell,
    generateCSV,
    exportToCSV,
    generateGoogleContactsCSV,
    exportToGoogleContactsCSV,
    generateCRMCSV,
    exportToCRMCSV,
    generatePlainText,
    exportToPlainText,
    generateVCard,
    exportToVCard,
    generateJSON,
    exportToJSON,
    generateExcelXML,
    exportToExcel,
    generateHTMLReport,
    exportToHTMLReport,
    exportGroupsToZip,
    triggerDownload
  };
}));
