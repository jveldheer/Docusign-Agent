#!/usr/bin/env node
/**
 * Send DMs Script
 * Sends Mighty Networks DMs to all active VLV members
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

import { loadMembers, validateMember } from './member-reader.js';
import { MightyNetworksClient } from './mighty-networks-client.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

/**
 * Get configuration from environment
 */
function getConfig() {
  return {
    mightyNetworks: {
      apiKey: process.env.MIGHTY_NETWORKS_API_KEY,
      networkId: process.env.MIGHTY_NETWORKS_NETWORK_ID
    }
  };
}

/**
 * Create DM message for member
 */
function createDMMessage(member) {
  return `Hello ${member.firstName},

The VLV has updated its training guidelines. Please check your email for a DocuSign request to review and sign the Participation Agreement.

The email will come from DocuSign (dse@docusign.net). Please check your spam folder if you don't see it.

If you are under 18, do not sign. Forward the DocuSign email to your parent or legal guardian and have them sign for you.

Thank you for being part of VLV!`;
}

/**
 * Find member data files
 */
async function findMemberFiles() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    const files = await fs.readdir(dataDir);
    return files
      .filter(f => f.endsWith('.xlsx') && f.includes('members'))
      .map(f => path.join(dataDir, f));
  } catch {
    return [];
  }
}

/**
 * Main send process
 */
async function main() {
  console.log();
  console.log('='.repeat(60));
  console.log('  VLV - Send Mighty Networks DMs');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Check configuration
  console.log('Step 1: Checking configuration...');
  const config = getConfig();

  if (!config.mightyNetworks.apiKey) {
    console.error('Missing MIGHTY_NETWORKS_API_KEY in .env');
    rl.close();
    process.exit(1);
  }
  if (!config.mightyNetworks.networkId) {
    console.error('Missing MIGHTY_NETWORKS_NETWORK_ID in .env');
    rl.close();
    process.exit(1);
  }
  console.log('  Configuration OK\n');

  // Step 2: Find and load member files
  console.log('Step 2: Loading member data...');
  const memberFiles = await findMemberFiles();

  if (memberFiles.length === 0) {
    console.error('\nNo member files found in ./data/ directory.');
    rl.close();
    process.exit(1);
  }

  console.log(`  Found ${memberFiles.length} member file(s)`);
  const members = await loadMembers(memberFiles, { activeOnly: true });

  if (members.length === 0) {
    console.error('\nNo active members found.');
    rl.close();
    process.exit(1);
  }

  // Validate members
  const validMembers = [];
  const invalidMembers = [];

  for (const member of members) {
    const validation = validateMember(member);
    if (validation.valid) {
      validMembers.push(member);
    } else {
      invalidMembers.push(validation);
    }
  }

  console.log(`  Valid members: ${validMembers.length}`);
  if (invalidMembers.length > 0) {
    console.log(`  Invalid/skipped: ${invalidMembers.length}`);
  }
  console.log();

  // Step 3: Connect to Mighty Networks
  console.log('Step 3: Connecting to Mighty Networks...');
  const mightyClient = new MightyNetworksClient({
    apiKey: config.mightyNetworks.apiKey,
    networkId: config.mightyNetworks.networkId
  });

  const connected = await mightyClient.verifyConnection();
  if (!connected) {
    console.error('  Failed to connect to Mighty Networks');
    console.error('  Check your API key and Network ID');
    rl.close();
    process.exit(1);
  }
  console.log('  Connected to Mighty Networks');
  console.log();

  // Step 4: Confirm before sending
  console.log('='.repeat(60));
  console.log('READY TO SEND DMs');
  console.log('='.repeat(60));
  console.log();
  console.log(`Members to contact: ${validMembers.length}`);
  console.log();
  console.log('Message preview:');
  console.log('-'.repeat(40));
  console.log(createDMMessage({ firstName: '[FirstName]' }));
  console.log('-'.repeat(40));
  console.log();

  const confirm = await question('Proceed with sending DMs? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\nCancelled. No DMs were sent.');
    rl.close();
    process.exit(0);
  }

  console.log();
  console.log('Starting to send DMs...\n');

  // Step 5: Send to each member
  const results = {
    total: validMembers.length,
    sent: 0,
    failed: 0,
    errors: []
  };

  for (let i = 0; i < validMembers.length; i++) {
    const member = validMembers[i];
    const progress = `[${i + 1}/${validMembers.length}]`;

    console.log(`${progress} ${member.firstName} ${member.lastName} (${member.email})`);

    try {
      const dmMessage = createDMMessage(member);
      const dmResult = await mightyClient.sendDirectMessageByEmail(member.email, dmMessage);

      if (dmResult.success) {
        results.sent++;
        console.log(`        DM: Sent`);
      } else {
        results.failed++;
        results.errors.push({
          email: member.email,
          name: `${member.firstName} ${member.lastName}`,
          error: dmResult.error
        });
        console.log(`        DM: Failed - ${dmResult.error}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        error: error.message
      });
      console.log(`        DM: Failed - ${error.message}`);
    }

    // Rate limiting
    if (i < validMembers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Step 6: Summary
  console.log();
  console.log('='.repeat(60));
  console.log('SENDING COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('RESULTS:');
  console.log(`  Total members: ${results.total}`);
  console.log(`  DMs Sent: ${results.sent}`);
  console.log(`  DMs Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log();
    console.log('ERRORS:');
    for (const err of results.errors) {
      console.log(`  ${err.name} (${err.email}): ${err.error}`);
    }
  }

  // Save results
  const resultsPath = path.join(process.cwd(), 'data', 'dm-results.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify({
    ...results,
    completedAt: new Date().toISOString()
  }, null, 2));

  console.log();
  console.log(`Results saved to: ${resultsPath}`);
  console.log();

  rl.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
