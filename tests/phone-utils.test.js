const assert = require('assert');
const phoneUtils = require('../lib/phone-utils.js');
const countries = require('../lib/countries.js');

console.log('--- Running Phone Utilities & Country Tests ---');

// 1. Country Detection
console.log('1. Testing Country detection...');
const ghana = phoneUtils.detectCountry('233206314924');
assert.strictEqual(ghana.iso, 'GH', 'Ghana ISO mismatch');
assert.strictEqual(ghana.name, 'Ghana', 'Ghana name mismatch');
assert.strictEqual(ghana.flag, '🇬🇭', 'Ghana flag mismatch');

const usa = phoneUtils.detectCountry('14155552671');
assert.strictEqual(usa.iso, 'US', 'US ISO mismatch');

const nigeria = phoneUtils.detectCountry('2348012345678');
assert.strictEqual(nigeria.iso, 'NG', 'Nigeria ISO mismatch');

const uk = phoneUtils.detectCountry('447911123456');
assert.strictEqual(uk.iso, 'GB', 'UK ISO mismatch');
console.log('✓ Country detection tests passed');

// 2. Phone Formatting
console.log('2. Testing Phone formatting (E.164 and pretty)...');
assert.strictEqual(phoneUtils.formatE164('233206314924'), '+233206314924');
assert.strictEqual(phoneUtils.formatE164('+14155552671'), '+14155552671');

const formattedUs = phoneUtils.formatPretty('14155552671');
assert.strictEqual(formattedUs, '+1 (415) 555-2671');
console.log('✓ Phone formatting tests passed');

// 3. Privacy Phone Masking
console.log('3. Testing Privacy phone masking...');
const masked = phoneUtils.maskPhone('233206314924');
assert(masked.includes('•••'), 'Masking must contain bullet points');
assert(masked.startsWith('+233'), 'Masked phone should preserve country code');
console.log('✓ Privacy masking tests passed');

// 4. Name Splitting
console.log('4. Testing Name splitting for CRM...');
const split1 = phoneUtils.splitName('Derrick Appah');
assert.strictEqual(split1.firstName, 'Derrick');
assert.strictEqual(split1.lastName, 'Appah');

const split2 = phoneUtils.splitName('SingleName');
assert.strictEqual(split2.firstName, 'SingleName');
assert.strictEqual(split2.lastName, '');
console.log('✓ Name splitting tests passed');

console.log('🎉 ALL PHONE & COUNTRY TESTS PASSED!');
