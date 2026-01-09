#!/usr/bin/env node
/**
 * Check Responses Script
 * Checks DocuSign Click for agreement responses and generates reports
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { ResponseTracker } from './response-tracker.js';

async function main() {
  console.log();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     VLV Participation Agreement - Response Checker        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  // Check configuration
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN;
  const clickwrapId = process.env.DOCUSIGN_CLICKWRAP_ID;
  const environment = process.env.DOCUSIGN_ENV || 'demo';

  if (!accountId || !accessToken || !clickwrapId) {
    console.error('Missing required environment variables:');
    if (!accountId) console.error('  - DOCUSIGN_ACCOUNT_ID');
    if (!accessToken) console.error('  - DOCUSIGN_ACCESS_TOKEN');
    if (!clickwrapId) console.error('  - DOCUSIGN_CLICKWRAP_ID');
    console.error('\nPlease add these to your .env file.');
    process.exit(1);
  }

  // Initialize tracker
  const tracker = new ResponseTracker({
    accountId,
    accessToken,
    clickwrapId,
    environment
  });

  console.log('Checking DocuSign for responses...\n');

  try {
    // Check responses
    await tracker.checkResponses();

    // Get summary
    const summary = await tracker.getSummary();

    console.log('=' .repeat(50));
    console.log('SUMMARY');
    console.log('=' .repeat(50));
    console.log();
    console.log(`Total Members: ${summary.total}`);
    console.log(`DMs Sent: ${summary.dmsSent}`);
    console.log(`Emails Sent: ${summary.emailsSent}`);
    console.log();
    console.log(`✓ Agreements Accepted: ${summary.agreed}`);
    console.log(`○ Pending: ${summary.pending}`);
    console.log();
    console.log(`Last Checked: ${summary.lastChecked}`);
    console.log();

    // Show who agreed
    const agreed = await tracker.getAgreedMembers();
    if (agreed.length > 0) {
      console.log('MEMBERS WHO AGREED:');
      console.log('-' .repeat(50));
      for (const m of agreed) {
        console.log(`  ✓ ${m.firstName} ${m.lastName} (${m.email})`);
        console.log(`    Agreed: ${m.agreedAt}`);
      }
      console.log();
    }

    // Show who is pending
    const pending = await tracker.getPendingMembers();
    if (pending.length > 0) {
      console.log('MEMBERS PENDING:');
      console.log('-' .repeat(50));
      for (const m of pending) {
        console.log(`  ○ ${m.firstName} ${m.lastName} (${m.email})`);
      }
      console.log();
    }

    // Export reports
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Export text report
    const report = await tracker.exportReport();
    const reportPath = path.join(dataDir, 'tracking-report.txt');
    await fs.writeFile(reportPath, report);
    console.log(`Text report saved: ${reportPath}`);

    // Export CSV
    const csv = await tracker.exportCSV();
    const csvPath = path.join(dataDir, 'tracking-report.csv');
    await fs.writeFile(csvPath, csv);
    console.log(`CSV report saved: ${csvPath}`);

    console.log();

  } catch (error) {
    console.error('Error checking responses:', error.message);

    if (error.message.includes('401')) {
      console.error('\nYour access token may have expired.');
      console.error('Generate a new one at: https://developers.docusign.com/tools/api-access-token');
    }

    process.exit(1);
  }
}

main().catch(console.error);
