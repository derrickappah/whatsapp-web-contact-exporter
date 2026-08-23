/**
 * WhatsApp Web Contact Exporter - Format Generators
 * Supports CSV (with UTF-8 BOM), Excel (.xlsx / .xls), vCard 3.0 (.vcf), and JSON
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.WAExporters = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Helper to trigger browser download
  function triggerDownload(blob, filename) {
    if (typeof window === 'undefined' || !window.document) {
      return blob; // In Node/test environment
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
    }, 1000);
    return true;
  }

  // Standardize contact data fields
  function normalizeContact(item) {
    const rawNumber = item.phoneNumber || item.number || (item.id && !item.id.includes('@g.us') ? item.id.replace(/@.*$/, '') : '');
    const cleanNumber = rawNumber ? rawNumber.replace(/[^0-9+]/g, '') : '';
    const savedName = item.savedName || item.name || '';
    const publicName = item.publicName || item.pushname || item.notifyName || '';
    const displayName = item.displayName || savedName || item.formattedTitle || publicName || item.formattedNumber || (cleanNumber ? `+${cleanNumber}` : '') || 'Unknown';

    return {
      phoneNumber: cleanNumber,
      formattedNumber: item.formattedNumber || item.formattedTitle || (cleanNumber ? `+${cleanNumber.replace(/^\+/, '')}` : ''),
      savedName: savedName,
      publicName: publicName,
      displayName: displayName,
      isSaved: item.isSaved !== undefined ? item.isSaved : (item.isMyContact || item.isAddressBookContact || false),
      isBusiness: item.isBusiness || item.isEnterprise || false,
      about: item.about || item.status || '',
      groupName: item.groupName || item.sourceGroup || '',
      groupRole: item.groupRole || (item.isAdmin ? (item.isSuperAdmin ? 'Super Admin' : 'Admin') : 'Member'),
      labels: Array.isArray(item.labels) ? item.labels.join(', ') : (item.labels || ''),
      jid: item.jid || item.id || ''
    };
  }

  /**
   * Escape CSV cell
   */
  function escapeCSVCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Export to CSV with UTF-8 BOM (for Excel compatibility)
   */
  function generateCSV(contacts) {
    const headers = [
      'Phone Number',
      'Formatted Phone',
      'Display Name',
      'Saved Name',
      'Public Push Name',
      'Is Saved Contact',
      'Contact Type',
      'About / Status',
      'Source Group',
      'Group Role',
      'Labels',
      'WhatsApp JID'
    ];

    const rows = [headers.map(escapeCSVCell).join(',')];

    for (const raw of contacts) {
      const c = normalizeContact(raw);
      const phoneDisplay = c.phoneNumber ? `+${c.phoneNumber.replace(/^\+/, '')}` : '';
      const row = [
        escapeCSVCell(phoneDisplay),
        escapeCSVCell(c.formattedNumber),
        escapeCSVCell(c.displayName),
        escapeCSVCell(c.savedName),
        escapeCSVCell(c.publicName),
        escapeCSVCell(c.isSaved ? 'Yes' : 'No'),
        escapeCSVCell(c.isBusiness ? 'Business' : 'Regular'),
        escapeCSVCell(c.about),
        escapeCSVCell(c.groupName),
        escapeCSVCell(c.groupName ? c.groupRole : ''),
        escapeCSVCell(c.labels),
        escapeCSVCell(c.jid)
      ];
      rows.push(row.join(','));
    }

    // \uFEFF is UTF-8 Byte Order Mark for Excel
    return '\uFEFF' + rows.join('\r\n');
  }

  function exportToCSV(contacts, filename = 'whatsapp_contacts.csv') {
    const csvContent = generateCSV(contacts);
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      return triggerDownload(blob, filename);
    }
    return csvContent;
  }

  /**
   * Escape vCard strings (RFC 2426)
   */
  function escapeVCard(str) {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }

  /**
   * Export to vCard 3.0 (.vcf)
   */
  function generateVCard(contacts) {
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

      const card = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${escapeVCard(name)}`,
        `N:${escapeVCard(c.savedName || name)};;;;`,
        phone ? `TEL;TYPE=CELL,VOICE:${phone}` : '',
        notes.length > 0 ? `NOTE:${escapeVCard(notes.join(' | '))}` : '',
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
   * Export to JSON (.json)
   */
  function generateJSON(contacts, metadata = {}) {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        totalCount: contacts.length,
        exporter: 'WhatsApp Web Contact Exporter v1.0',
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
   * Generates Excel XML 2003 / SpreadsheetXML (Native Excel format readable by all Excel versions and LibreOffice)
   */
  function generateExcelXML(contacts, sheetName = 'WhatsApp Contacts') {
    const headers = [
      'Phone Number',
      'Formatted Phone',
      'Display Name',
      'Saved Name',
      'Public Push Name',
      'Is Saved Contact',
      'Contact Type',
      'About / Status',
      'Source Group',
      'Group Role',
      'Labels',
      'WhatsApp JID'
    ];

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
    headers.forEach(h => {
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>\n`;
    });
    rowsXml += '   </Row>\n';

    // Data Rows
    contacts.forEach(raw => {
      const c = normalizeContact(raw);
      const phone = c.phoneNumber ? `+${c.phoneNumber.replace(/^\+/, '')}` : '';
      rowsXml += '   <Row>\n';
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(phone)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.formattedNumber)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.displayName)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.savedName)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.publicName)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.isSaved ? 'Yes' : 'No')}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.isBusiness ? 'Business' : 'Regular')}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.about)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.groupName)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.groupName ? c.groupRole : '')}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.labels)}</Data></Cell>\n`;
      rowsXml += `    <Cell><Data ss:Type="String">${xmlEscape(c.jid)}</Data></Cell>\n`;
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
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#075E54"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#128C7E" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(sheetName)}">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="150"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="180"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="180"/>
${rowsXml}  </Table>
 </Worksheet>
</Workbook>`;

    return xml;
  }

  function exportToExcel(contacts, filename = 'whatsapp_contacts.xls', sheetName = 'WhatsApp Contacts') {
    if (typeof window !== 'undefined' && window.XLSX) {
      try {
        const rows = contacts.map(raw => {
          const c = normalizeContact(raw);
          return {
            'Phone Number': c.phoneNumber ? `+${c.phoneNumber.replace(/^\+/, '')}` : '',
            'Formatted Phone': c.formattedNumber,
            'Display Name': c.displayName,
            'Saved Name': c.savedName,
            'Public Push Name': c.publicName,
            'Is Saved Contact': c.isSaved ? 'Yes' : 'No',
            'Contact Type': c.isBusiness ? 'Business' : 'Regular',
            'About / Status': c.about,
            'Source Group': c.groupName,
            'Group Role': c.groupName ? c.groupRole : '',
            'Labels': c.labels,
            'WhatsApp JID': c.jid
          };
        });
        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
        const cleanFilename = filename.endsWith('.xlsx') ? filename : filename.replace(/\.xls$/, '.xlsx');
        window.XLSX.writeFile(wb, cleanFilename);
        return true;
      } catch (err) {
        console.warn('SheetJS export failed, falling back to Spreadsheet XML', err);
      }
    }

    const xmlContent = generateExcelXML(contacts, sheetName);
    const cleanFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
    if (typeof Blob !== 'undefined') {
      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      return triggerDownload(blob, cleanFilename);
    }
    return xmlContent;
  }

  return {
    normalizeContact,
    generateCSV,
    exportToCSV,
    generateVCard,
    exportToVCard,
    generateJSON,
    exportToJSON,
    generateExcelXML,
    exportToExcel,
    triggerDownload
  };
}));
