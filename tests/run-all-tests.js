console.log('====================================================');
console.log('  WHATSAPP WEB EXPORTER PRO - MASTER TEST SUITE');
console.log('====================================================\n');

try {
  require('./phone-utils.test.js');
  console.log('\n----------------------------------------------------\n');
  require('./exporters.test.js');
  console.log('\n====================================================');
  console.log('  🎉 100% OF ALL SUITES & VERIFICATIONS PASSED!');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
}
