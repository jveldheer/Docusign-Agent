#!/usr/bin/env node
/**
 * Send Agreements Script
 * Main orchestration script to send participation agreements to all VLV members
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

import { loadMembers, validateMember } from './member-reader.js';
import { MightyNetworksClient, createDMMessage } from './mighty-networks-client.js';
import { GmailSender } from './email-sender.js';
import { generateClickwrapUrl } from './link-generator.js';
import { ResponseTracker } from './response-tracker.js';

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
    // DocuSign Click
    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      accessToken: process.env.DOCUSIGN_ACCESS_TOKEN,
      clickwrapId: process.env.DOCUSIGN_CLICKWRAP_ID,
      environment: process.env.DOCUSIGN_ENV || 'demo'
    },
    // Mighty Networks
    mightyNetworks: {
      apiKey: process.env.MIGHTY_NETWORKS_API_KEY,
      networkId: process.env.MIGHTY_NETWORKS_NETWORK_ID
    },
    // Gmail
    gmail: {
      email: process.env.GMAIL_EMAIL,
      password: process.env.GMAIL_PASSWORD
    }
  };
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const missing = [];

  if (!config.docusign.accountId) missing.push('DOCUSIGN_ACCOUNT_ID');
  if (!config.docusign.accessToken) missing.push('DOCUSIGN_ACCESS_TOKEN');
  if (!config.docusign.clickwrapId) missing.push('DOCUSIGN_CLICKWRAP_ID');
  if (!config.mightyNetworks.apiKey) missing.push('MIGHTY_NETWORKS_API_KEY');
  if (!config.mightyNetworks.networkId) missing.push('MIGHTY_NETWORKS_NETWORK_ID');
  if (!config.gmail.email) missing.push('GMAIL_EMAIL');
  if (!config.gmail.password) missing.push('GMAIL_PASSWORD');

  return missing;
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
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     VLV Participation Agreement - Send to Members         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log();

  // Step 1: Check configuration
  console.log('Step 1: Checking configuration...');
  const config = getConfig();
  const missing = validateConfig(config);

  if (missing.length > 0) {
    console.error('\nMissing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease add these to your .env file and try again.');
    console.error('See .env.example for the template.');
    rl.close();
    process.exit(1);
  }
  console.log('  ✓ Configuration OK\n');

  // Step 2: Find and load member files
  console.log('Step 2: Loading member data...');
  const memberFiles = await findMemberFiles();

  if (memberFiles.length === 0) {
    console.error('\nNo member files found in ./data/ directory.');
    console.error('Please add your Mighty Networks member export files:');
    console.error('  - plan_Veldheer_Lineman_Vault_Monthly_Plan_members_*.xlsx');
    console.error('  - plan__50_Off_Annual_Plan_Veldheer_Lineman_Vault_members_*.xlsx');
    rl.close();
    process.exit(1);
  }

  console.log(`  Found ${memberFiles.length} member file(s)`);
  const members = await loadMembers(memberFiles, { activeOnly: true });

  if (members.length === 0) {
    console.error('\nNo active members found in the files.');
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

  // Step 3: Initialize services
  console.log('Step 3: Initializing services...');

  const mightyClient = new MightyNetworksClient({
    apiKey: config.mightyNetworks.apiKey,
    networkId: config.mightyNetworks.networkId
  });

  const emailSender = new GmailSender({
    email: config.gmail.email,
    password: config.gmail.password
  });

  const tracker = new ResponseTracker({
    accountId: config.docusign.accountId,
    accessToken: config.docusign.accessToken,
    clickwrapId: config.docusign.clickwrapId,
    environment: config.docusign.environment
  });

  // Verify Gmail connection
  console.log('  Verifying Gmail connection...');
  const gmailOk = await emailSender.verifyConnection();
  if (!gmailOk) {
    console.error('\n  Failed to connect to Gmail. Check your credentials.');
    console.error('  Note: You may need to use an App Password if 2FA is enabled.');
    rl.close();
    process.exit(1);
  }
  console.log('  ✓ Gmail connected');

  // Verify Mighty Networks connection
  console.log('  Verifying Mighty Networks connection...');
  const mnOk = await mightyClient.verifyConnection();
  if (!mnOk) {
    console.log('  ⚠ Could not verify Mighty Networks - will continue but DMs may fail');
  } else {
    console.log('  ✓ Mighty Networks connected');
  }
  console.log();

  // Step 4: Initialize tracking
  console.log('Step 4: Initializing tracking...');
  await tracker.initializeTracking(validMembers);
  console.log('  ✓ Tracking initialized\n');

  // Step 5: Confirm before sending
  console.log('=' .repeat(60));
  console.log('READY TO SEND');
  console.log('=' .repeat(60));
  console.log();
  console.log(`Members to contact: ${validMembers.length}`);
  console.log();
  console.log('For each member, we will:');
  console.log('  1. Generate personalized DocuSign Click link');
  console.log('  2. Send direct message via Mighty Networks');
  console.log('  3. Send email via Gmail');
  console.log();

  const confirm = await question('Proceed with sending? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\nCancelled. No messages were sent.');
    rl.close();
    process.exit(0);
  }

  console.log();
  console.log('Starting to send...\n');

  // Step 6: Send to each member
  const results = {
    total: validMembers.length,
    dmsSent: 0,
    dmsFailed: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: []
  };

  for (let i = 0; i < validMembers.length; i++) {
    const member = validMembers[i];
    const progress = `[${i + 1}/${validMembers.length}]`;

    console.log(`${progress} Processing: ${member.firstName} ${member.lastName} (${member.email})`);

    // Generate personalized link
    const docusignLink = generateClickwrapUrl(config.docusign, member);

    // Send DM
    try {
      const dmMessage = createDMMessage(member, docusignLink);
      const dmResult = await mightyClient.sendDirectMessageByEmail(member.email, dmMessage);

      if (dmResult.success) {
        results.dmsSent++;
        await tracker.markDMSent(member);
        console.log(`  ✓ DM sent`);
      } else {
        results.dmsFailed++;
        console.log(`  ✗ DM failed: ${dmResult.error}`);
        results.errors.push({ type: 'dm', email: member.email, error: dmResult.error });
      }
    } catch (error) {
      results.dmsFailed++;
      console.log(`  ✗ DM error: ${error.message}`);
      results.errors.push({ type: 'dm', email: member.email, error: error.message });
    }

    // Send email
    try {
      const emailResult = await emailSender.sendAgreementEmail(member, docusignLink);

      if (emailResult.success) {
        results.emailsSent++;
        await tracker.markEmailSent(member);
        console.log(`  ✓ Email sent`);
      } else {
        results.emailsFailed++;
        console.log(`  ✗ Email failed: ${emailResult.error}`);
        results.errors.push({ type: 'email', email: member.email, error: emailResult.error });
      }
    } catch (error) {
      results.emailsFailed++;
      console.log(`  ✗ Email error: ${error.message}`);
      results.errors.push({ type: 'email', email: member.email, error: error.message });
    }

    // Rate limiting - wait between members
    if (i < validMembers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 7: Summary
  console.log();
  console.log('=' .repeat(60));
  console.log('SENDING COMPLETE');
  console.log('=' .repeat(60));
  console.log();
  console.log('RESULTS:');
  console.log(`  Total members: ${results.total}`);
  console.log(`  DMs sent: ${results.dmsSent}`);
  console.log(`  DMs failed: ${results.dmsFailed}`);
  console.log(`  Emails sent: ${results.emailsSent}`);
  console.log(`  Emails failed: ${results.emailsFailed}`);

  if (results.errors.length > 0) {
    console.log();
    console.log('ERRORS:');
    for (const err of results.errors) {
      console.log(`  ${err.type.toUpperCase()} to ${err.email}: ${err.error}`);
    }
  }

  // Save results
  const resultsPath = path.join(process.cwd(), 'data', 'send-results.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify({
    ...results,
    completedAt: new Date().toISOString()
  }, null, 2));
  console.log();
  console.log(`Results saved to: ${resultsPath}`);

  console.log();
  console.log('NEXT STEPS:');
  console.log('  - Run "npm run check-responses" to see who has accepted');
  console.log('  - Check the tracking report for detailed status');
  console.log();

  emailSender.close();
  rl.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
