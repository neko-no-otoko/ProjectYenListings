import { runSyncListingsJob } from '../lib/ingestion/syncListings';

async function main() {
  console.log('[Sync] Starting listings sync...');
  const result = await runSyncListingsJob();
  console.log('[Sync] Result:', result);
}

main().catch(console.error);
