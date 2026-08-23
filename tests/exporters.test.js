const assert = require('assert');
const exporters = require('../lib/exporters.js');

console.log('--- Running WhatsApp Exporter Unit Tests ---');

const sampleContacts = [
  {
    phoneNumber: '14155552671',
    formattedNumber: '+1 415-555-2671',
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
    phoneNumber: '447911123456',
    formattedNumber: '+44 7911 123456',
    savedName: '',
    publicName: 'Bob Builder',
    isSaved: false,
    isBusiness: true,
    about: 'At work 🔨',
    groupName: 'Tech Innovators',
    groupRole: 'Member',
    labels: [],
    jid: '447911123456@s.whatsapp.net'
  },
  {
    phoneNumber: '919876543210',
    formattedNumber: '+91 98765 43210',
    savedName: 'مرحبا / नमस्ते Contact',
    publicName: 'Raj',
    isSaved: true,
    isBusiness: false,
    about: 'Busy with "important, quotes" & symbols <test>',
    groupName: '',
    groupRole: 'Member',
    labels: 'Prospects',
    jid: '919876543210@s.whatsapp.net'
  }
];

// Test 1: CSV Generation
console.log('1. Testing CSV generation...');
const csv = exporters.generateCSV(sampleContacts);
assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
assert(csv.includes('Phone Number,Formatted Phone,Display Name'), 'CSV header missing');
assert(csv.includes('Alice Smith'), 'Alice missing in CSV');
assert(csv.includes('+14155552671'), 'Phone number formatting issue in CSV');
assert(csv.includes('""important, quotes""'), 'Quotes escaping issue in CSV');
assert(csv.includes('مرحبا / नमस्ते Contact'), 'Unicode name support in CSV');
console.log('✓ CSV test passed');

// Test 2: vCard 3.0 Generation
console.log('2. Testing vCard generation...');
const vcf = exporters.generateVCard(sampleContacts);
assert(vcf.includes('BEGIN:VCARD'), 'vCard header missing');
assert(vcf.includes('VERSION:3.0'), 'vCard version missing');
assert(vcf.includes('FN:Alice Smith'), 'Formatted name missing in vCard');
assert(vcf.includes('TEL;TYPE=CELL,VOICE:+14155552671'), 'TEL field formatted incorrectly');
assert(vcf.includes('NOTE:Saved Name: Alice Smith | Push Name: Alice ✨ | About: Available for chats & projects 🚀 | Group: Tech Innovators (Admin) | Labels: VIP\\, Clients'), 'Notes field escaping mismatch');
assert(vcf.includes('END:VCARD'), 'vCard closing missing');
console.log('✓ vCard test passed');

// Test 3: JSON Generation
console.log('3. Testing JSON generation...');
const jsonStr = exporters.generateJSON(sampleContacts, { filter: 'all' });
const parsed = JSON.parse(jsonStr);
assert.strictEqual(parsed.metadata.totalCount, 3, 'Metadata count mismatch');
assert.strictEqual(parsed.contacts.length, 3, 'Contacts length mismatch');
assert.strictEqual(parsed.contacts[0].phoneNumber, '14155552671');
assert.strictEqual(parsed.contacts[1].isSaved, false);
console.log('✓ JSON test passed');

// Test 4: Excel XML Generation
console.log('4. Testing Excel XML generation...');
const excelXml = exporters.generateExcelXML(sampleContacts, 'Sample Sheet');
assert(excelXml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Excel XML header missing');
assert(excelXml.includes('ss:Name="Sample Sheet"'), 'Sheet name missing');
assert(excelXml.includes('&amp; symbols &lt;test&gt;'), 'XML escaping missing');
assert(excelXml.includes('Alice Smith'), 'Data row missing in Excel XML');
console.log('✓ Excel XML test passed');

console.log('\n🎉 ALL EXPORTER TESTS PASSED SUCCESSFULLY!');
