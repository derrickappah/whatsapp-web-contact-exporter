const assert = require('assert');
const exporters = require('../lib/exporters.js');

console.log('--- Running WhatsApp Exporter Format & Security Tests ---');

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
    phoneNumber: '919876543210',
    formattedNumber: '+91 98765 43210',
    savedName: 'مرحبا / नमस्ते Contact',
    publicName: 'Raj',
    isSaved: true,
    isBusiness: false,
    about: '@SUM(A1:A10) formula injection test',
    groupName: '',
    groupRole: 'Member',
    labels: 'Prospects',
    jid: '919876543210@s.whatsapp.net'
  }
];

// Test 1: CSV Generation & Formula Injection Guard
console.log('1. Testing CSV generation & Formula injection protection...');
const csv = exporters.generateCSV(sampleContacts);
assert(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM');
assert(csv.includes('Phone Number,Formatted Phone,Country'), 'CSV header missing');
assert(csv.includes('Alice Smith'), 'Alice missing in CSV');
assert(csv.includes("'+1+1 dangerous formula") || csv.includes("''=1+1") || csv.includes("'=1+1 dangerous formula"), 'Formula injection = not sanitized');
assert(csv.includes("'@SUM(A1:A10) formula injection test"), 'Formula injection @ not sanitized');
assert(csv.includes('مرحبا / नमस्ते Contact'), 'Unicode name support in CSV');
console.log('✓ CSV & Security tests passed');

// Test 2: Google Contacts Import CSV
console.log('2. Testing Google Contacts CSV format...');
const googleCsv = exporters.generateGoogleContactsCSV(sampleContacts);
assert(googleCsv.includes('Name,Given Name,Family Name,Group Membership'), 'Google CSV headers missing');
assert(googleCsv.includes('Alice'), 'Alice missing in Google CSV');
assert(googleCsv.includes('* WhatsApp ::: Tech Innovators'), 'Group membership tag missing');
console.log('✓ Google Contacts CSV tests passed');

// Test 3: CRM / Lead Format CSV
console.log('3. Testing CRM Lead CSV format...');
const crmCsv = exporters.generateCRMCSV(sampleContacts);
assert(crmCsv.includes('First Name,Last Name,Full Name,Mobile Phone,Country,Lead Status'), 'CRM CSV headers missing');
assert(crmCsv.includes('New Lead'), 'New Lead status missing for unsaved contact');
assert(crmCsv.includes('Ghana'), 'Ghana country missing in CRM');
console.log('✓ CRM Lead format tests passed');

// Test 4: Plain Text List
console.log('4. Testing Plain Text list generator...');
const txt = exporters.generatePlainText(sampleContacts);
assert(txt.includes('+14155552671'), 'US number missing in plain text');
assert(txt.includes('+233206314924'), 'Ghana number missing in plain text');
console.log('✓ Plain text tests passed');

// Test 5: vCard 3.0 Generation
console.log('5. Testing vCard generation...');
const vcf = exporters.generateVCard(sampleContacts);
assert(vcf.includes('BEGIN:VCARD'), 'vCard header missing');
assert(vcf.includes('VERSION:3.0'), 'vCard version missing');
assert(vcf.includes('FN:Alice Smith'), 'Formatted name missing in vCard');
assert(vcf.includes('TEL;TYPE=CELL,VOICE:+14155552671'), 'TEL field formatted incorrectly');
assert(vcf.includes('ORG:Tech Innovators'), 'ORG group field missing in vCard');
assert(vcf.includes('END:VCARD'), 'vCard closing missing');
console.log('✓ vCard tests passed');

// Test 6: Excel SpreadsheetML XML Generation
console.log('6. Testing Excel XML generation...');
const excelXml = exporters.generateExcelXML(sampleContacts, 'WhatsApp Leads');
assert(excelXml.includes('<?xml version="1.0" encoding="UTF-8"?>'), 'Excel XML header missing');
assert(excelXml.includes('ss:Name="WhatsApp Leads"'), 'Sheet name missing');
assert(excelXml.includes('Alice Smith'), 'Data row missing in Excel XML');
assert(excelXml.includes('Ghana'), 'Country missing in Excel XML');
console.log('✓ Excel XML tests passed');

// Test 7: HTML Report Generation
console.log('7. Testing HTML Report generation...');
const html = exporters.generateHTMLReport(sampleContacts, 'My Contacts');
assert(html.includes('<!DOCTYPE html>'), 'HTML header missing');
assert(html.includes('Alice Smith'), 'Alice missing in HTML report');
assert(html.includes('Tech Innovators'), 'Group missing in HTML report');
console.log('✓ HTML Report tests passed');

// Test 8: JSON Generation
console.log('8. Testing JSON generation...');
const jsonStr = exporters.generateJSON(sampleContacts, { exportType: 'all' });
const parsed = JSON.parse(jsonStr);
assert.strictEqual(parsed.metadata.totalCount, 3, 'Metadata count mismatch');
assert.strictEqual(parsed.contacts.length, 3, 'Contacts length mismatch');
assert.strictEqual(parsed.contacts[0].country, 'United States');
assert.strictEqual(parsed.contacts[1].country, 'Ghana');
console.log('✓ JSON tests passed');

console.log('\n🎉 ALL EXPORTER FORMAT & SECURITY TESTS PASSED SUCCESSFULLY!');
