const assert = require('assert');
const exporters = require('../lib/exporters.js');
const zip = require('../lib/zip.js');

console.log('--- Running WhatsApp Exporter Format, ZIP & Security Tests ---');

const sampleContacts = [
  {
    phoneNumber: '14155552671',
    formattedNumber: '+1 (415) 555-2671',
    savedName: 'Alice Smith',
    publicName: 'Alice ✨',
    isSaved: true,
    isBusiness: false,
    about: 'Available for chats & projects 🚀',
    groupName: 'Tech Innovators',
    groupRole: 'Admin',
    labels: ['VIP', 'Clients'],
    jid: '14155552671@s.whatsapp.net'
  },
  {
    phoneNumber: '233206314924',
    formattedNumber: '+233 20 631 4924',
    savedName: '',
    publicName: 'Bob Builder',
    isSaved: false,
    isBusiness: true,
    about: '=1+1 dangerous formula',
    groupName: 'Tech Innovators',
    groupRole: 'Member',
    labels: [],
    jid: '233206314924@s.whatsapp.net'
  },
  {
    phoneNumber: '14155552671',
    formattedNumber: '+1 (415) 555-2671',
    savedName: 'Alice Smith',
    publicName: 'Alice ✨',
    isSaved: true,
    isBusiness: false,
    about: 'Available for chats & projects 🚀',
    groupName: 'Design Leaders',
    groupRole: 'Member',
    labels: [],
    jid: '14155552671@s.whatsapp.net'
  }
];

// Test 1: CSV Generation & Formula Injection Guard
console.log('1. Testing CSV generation & Formula injection protection...');
const csv = exporters.generateCSV(sampleContacts);
assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
assert(csv.includes('Phone Number,Formatted Phone,Country'), 'CSV header missing');
assert(csv.includes('Alice Smith'), 'Alice missing in CSV');
assert(csv.includes("'+1+1 dangerous formula") || csv.includes("''=1+1") || csv.includes("'=1+1 dangerous formula"), 'Formula injection not sanitized');
console.log('✓ CSV & Security tests passed');

// Test 2: Column Selection Filtering
console.log('2. Testing Column selection filtering...');
const customCols = {
  phone: true,
  displayName: true,
  country: false,
  savedName: false,
  publicName: false,
  isSaved: false,
  isBusiness: false,
  about: false,
  groupName: false,
  groupRole: false,
  labels: false,
  jid: false
};
const filteredCsv = exporters.generateCSV(sampleContacts, ',', customCols);
assert(filteredCsv.includes('Phone Number,Display Name'), 'Filtered CSV header mismatch');
assert(!filteredCsv.includes('Public Push Name'), 'Disabled column was not removed from header');
console.log('✓ Column selection tests passed');

// Test 3: Multi-Group Contact Merger
console.log('3. Testing Multi-group duplicate contact merging...');
const merged = exporters.mergeGroupContacts(sampleContacts);
assert.strictEqual(merged.length, 2, 'Merged contacts count should be 2');
const alice = merged.find(c => c.phoneNumber === '14155552671');
assert(alice.groupName.includes('Tech Innovators') && alice.groupName.includes('Design Leaders'), 'Alice group names not combined');
console.log('✓ Multi-group merger tests passed');

// Test 4: ZIP Archive Generation
console.log('4. Testing Pure JS ZIP Archive generation...');
const zipArchive = zip.createZip();
zipArchive.addFile('Group_A.csv', 'Phone,Name\n+14155552671,Alice');
zipArchive.addFile('Group_B.csv', 'Phone,Name\n+233206314924,Bob');
const zipBytes = zipArchive.generateUint8Array();
assert(zipBytes.length > 50, 'ZIP buffer should not be empty');
assert.strictEqual(zipBytes[0], 0x50, 'ZIP signature byte 0 must be P (0x50)');
assert.strictEqual(zipBytes[1], 0x4B, 'ZIP signature byte 1 must be K (0x4B)');
console.log('✓ ZIP Archive generation tests passed');

// Test 5: vCard 3.0 Generation
console.log('5. Testing vCard generation...');
const vcf = exporters.generateVCard(sampleContacts);
assert(vcf.includes('BEGIN:VCARD'), 'vCard header missing');
assert(vcf.includes('VERSION:3.0'), 'vCard version missing');
assert(vcf.includes('FN:Alice Smith'), 'Formatted name missing in vCard');
console.log('✓ vCard tests passed');

// Test 6: Excel XML Generation with Custom Columns
console.log('6. Testing Excel XML generation...');
const excelXml = exporters.generateExcelXML(sampleContacts, 'WhatsApp Leads', customCols);
assert(excelXml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Excel XML header missing');
assert(excelXml.includes('ss:Name="WhatsApp Leads"'), 'Sheet name missing');
assert(excelXml.includes('Alice Smith'), 'Data row missing in Excel XML');
console.log('✓ Excel XML tests passed');

// Test 7: Google Contacts CSV
console.log('7. Testing Google Contacts CSV format...');
const googleCsv = exporters.generateGoogleContactsCSV(sampleContacts);
assert(googleCsv.includes('Name,Given Name,Family Name,Group Membership'), 'Google CSV headers missing');
console.log('✓ Google Contacts CSV tests passed');

// Test 8: Plain Text
console.log('8. Testing Plain Text generator...');
const txt = exporters.generatePlainText(sampleContacts);
assert(txt.includes('+14155552671'), 'US number missing');
console.log('✓ Plain text tests passed');

console.log('\n🎉 ALL EXPORTER, ZIP & MERGER TESTS PASSED SUCCESSFULLY!');
