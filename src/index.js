#!/usr/bin/env node
/**
 * DocuSign Click Agent
 * Interactive CLI for managing DocuSign Click agreements
 */

import 'dotenv/config';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { DocuSignClickClient } from './docusign-click-client.js';
import { generatePDF } from './generate-pdf.js';
import { createVLVClickwrap, VLV_CLICKWRAP_CONFIG } from './create-clickwrap.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

/**
 * Print the main menu
 */
function printMenu() {
  console.log();
  console.log('='.repeat(50));
  console.log('  DocuSign Click Agent - Main Menu');
  console.log('='.repeat(50));
  console.log();
  console.log('  1. Create VLV Participation Agreement');
  console.log('  2. List all clickwraps');
  console.log('  3. View clickwrap details');
  console.log('  4. View user agreements (audit trail)');
  console.log('  5. Generate PDF only');
  console.log('  6. Check configuration');
  console.log('  7. Exit');
  console.log();
}

/**
 * Check environment configuration
 */
function checkConfig() {
  console.log();
  console.log('Configuration Check');
  console.log('-'.repeat(40));

  const checks = {
    'DOCUSIGN_ACCOUNT_ID': process.env.DOCUSIGN_ACCOUNT_ID,
    'DOCUSIGN_ACCESS_TOKEN': process.env.DOCUSIGN_ACCESS_TOKEN,
    'DOCUSIGN_ENV': process.env.DOCUSIGN_ENV || 'demo (default)'
  };

  let allGood = true;
  for (const [key, value] of Object.entries(checks)) {
    if (value && !value.includes('default')) {
      console.log(`  ✓ ${key}: ${value.substring(0, 20)}...`);
    } else if (value) {
      console.log(`  ○ ${key}: ${value}`);
    } else {
      console.log(`  ✗ ${key}: NOT SET`);
      allGood = false;
    }
  }

  console.log();
  if (allGood) {
    console.log('All required configuration is present!');
  } else {
    console.log('Missing required configuration. Copy .env.example to .env and fill in values.');
  }
}

/**
 * Get initialized client
 */
function getClient() {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN;
  const env = process.env.DOCUSIGN_ENV || 'demo';

  if (!accountId || !accessToken) {
    throw new Error('Missing configuration. Run option 6 to check.');
  }

  return new DocuSignClickClient({
    accountId,
    accessToken,
    basePath: DocuSignClickClient.getBasePath(env)
  });
}

/**
 * List all clickwraps
 */
async function listClickwraps() {
  console.log();
  console.log('Fetching clickwraps...');

  try {
    const client = getClient();
    const clickwraps = await client.listClickwraps();

    if (clickwraps.length === 0) {
      console.log('No clickwraps found.');
      return;
    }

    console.log();
    console.log(`Found ${clickwraps.length} clickwrap(s):`);
    console.log('-'.repeat(60));

    for (const cw of clickwraps) {
      console.log(`  ID: ${cw.clickwrapId}`);
      console.log(`  Name: ${cw.clickwrapName}`);
      console.log(`  Status: ${cw.status}`);
      console.log(`  Version: ${cw.versionNumber}`);
      console.log('-'.repeat(60));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * View clickwrap details
 */
async function viewClickwrap() {
  const clickwrapId = await question('Enter Clickwrap ID: ');

  if (!clickwrapId.trim()) {
    console.log('No ID provided.');
    return;
  }

  console.log();
  console.log('Fetching clickwrap details...');

  try {
    const client = getClient();
    const details = await client.getClickwrap(clickwrapId.trim());

    console.log();
    console.log('Clickwrap Details:');
    console.log('-'.repeat(40));
    console.log(JSON.stringify(details, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * View user agreements
 */
async function viewAgreements() {
  const clickwrapId = await question('Enter Clickwrap ID: ');

  if (!clickwrapId.trim()) {
    console.log('No ID provided.');
    return;
  }

  console.log();
  console.log('Fetching user agreements...');

  try {
    const client = getClient();
    const agreements = await client.getUserAgreements(clickwrapId.trim());

    if (agreements.length === 0) {
      console.log('No agreements found for this clickwrap.');
      return;
    }

    console.log();
    console.log(`Found ${agreements.length} agreement(s):`);
    console.log('-'.repeat(60));

    for (const agreement of agreements) {
      console.log(`  User ID: ${agreement.clientUserId}`);
      console.log(`  Agreed: ${agreement.agreedOn}`);
      console.log(`  Version: ${agreement.versionNumber}`);
      console.log('-'.repeat(60));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

/**
 * Main interactive loop
 */
async function main() {
  console.log();
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║          DocuSign Click Agent for VLV                     ║');
  console.log('║    Veldheer Lineman Vault Participation Agreements        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  while (true) {
    printMenu();
    const choice = await question('Select an option (1-7): ');

    switch (choice.trim()) {
      case '1':
        await createVLVClickwrap();
        break;

      case '2':
        await listClickwraps();
        break;

      case '3':
        await viewClickwrap();
        break;

      case '4':
        await viewAgreements();
        break;

      case '5':
        console.log();
        console.log('Generating PDF...');
        await generatePDF();
        console.log('Done!');
        break;

      case '6':
        checkConfig();
        break;

      case '7':
        console.log();
        console.log('Goodbye!');
        rl.close();
        process.exit(0);

      default:
        console.log('Invalid option. Please select 1-7.');
    }

    await question('\nPress Enter to continue...');
  }
}

// Run the agent
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
