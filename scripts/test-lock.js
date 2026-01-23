#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const JOB_NAME = 'sync_listings';

async function testLock() {
  console.log(`Testing advisory lock for job: ${JOB_NAME}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('---');

  const call1 = fetch(`${BASE_URL}/api/admin/test-lock?job=${JOB_NAME}&hold=5`)
    .then(res => res.json())
    .then(data => {
      console.log('Call 1 (first):', data);
      return data;
    });

  await new Promise(resolve => setTimeout(resolve, 100));

  const call2 = fetch(`${BASE_URL}/api/admin/test-lock?job=${JOB_NAME}&hold=5`)
    .then(res => res.json())
    .then(data => {
      console.log('Call 2 (while first holds lock):', data);
      return data;
    });

  const [result1, result2] = await Promise.all([call1, call2]);

  console.log('---');
  console.log('Results:');
  console.log(`  Call 1 locked: ${result1.locked} (expected: true)`);
  console.log(`  Call 2 locked: ${result2.locked} (expected: false)`);
  
  const passed = result1.locked === true && result2.locked === false;
  console.log(`\nTest ${passed ? 'PASSED' : 'FAILED'}`);
  
  process.exit(passed ? 0 : 1);
}

testLock().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
