#!/usr/bin/env node
/**
 * Send Agreements Script
 * Sends VLV participation agreements to all active members via DocuSign eSignature
 * Also sends Mighty Networks DMs to notify members
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

import { loadMembers, validateMember } from './member-reader.js';
import { getJWTAccessToken } from './jwt-auth.js';
import { DocuSignESignClient } from './docusign-esign-client.js';
import { MightyNetworksClient } from './mighty-networks-client.js';
import { generatePDF, AGREEMENT_CONFIG } from './generate-pdf.js';

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
    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      userId: process.env.DOCUSIGN_USER_ID,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || './private.key',
      environment: process.env.DOCUSIGN_ENV || 'demo'
    },
    mightyNetworks: {
      apiKey: process.env.MIGHTY_NETWORKS_API_KEY,
      networkId: process.env.MIGHTY_NETWORKS_NETWORK_ID
    }
  };
}

/**
 * Validate configuration
 */
function validateConfig(config) {
  const missing = [];
  if (!config.docusign.accountId) missing.push('DOCUSIGN_ACCOUNT_ID');
  if (!config.docusign.userId) missing.push('DOCUSIGN_USER_ID');
  if (!config.docusign.integrationKey) missing.push('DOCUSIGN_INTEGRATION_KEY');
  if (!config.mightyNetworks.apiKey) missing.push('MIGHTY_NETWORKS_API_KEY');
  if (!config.mightyNetworks.networkId) missing.push('MIGHTY_NETWORKS_NETWORK_ID');
  return missing;
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
  console.log('  VLV Participation Agreement - Send to All Members');
  console.log('  Using DocuSign eSignature');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Check configuration
  console.log('Step 1: Checking configuration...');
  const config = getConfig();
  const missing = validateConfig(config);

  if (missing.length > 0) {
    console.error('\nMissing required environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\nPlease add these to your .env file.');
    rl.close();
    process.exit(1);
  }

  // Check private key
  try {
    await fs.access(config.docusign.privateKeyPath);
  } catch {
    console.error(`\nPrivate key not found: ${config.docusign.privateKeyPath}`);
    rl.close();
    process.exit(1);
  }
  console.log('  Configuration OK\n');

  // Step 2: Find and load member files
  console.log('Step 2: Loading member data...');
  const memberFiles = await findMemberFiles();

  if (memberFiles.length === 0) {
    console.error('\nNo member files found in ./data/ directory.');
    console.error('Please add your Mighty Networks member export files.');
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

  // Step 3: Generate PDF
  console.log('Step 3: Checking PDF agreement...');
  const pdfPath = path.join(process.cwd(), 'agreements', AGREEMENT_CONFIG.fileName);

  try {
    await fs.access(pdfPath);
    console.log(`  PDF exists: ${AGREEMENT_CONFIG.fileName}`);
  } catch {
    console.log('  Generating PDF...');
    await generatePDF();
  }
  console.log();

  // Step 4: Authenticate with DocuSign
  console.log('Step 4: Authenticating with DocuSign...');
  let authResult;
  try {
    authResult = await getJWTAccessToken({
      integrationKey: config.docusign.integrationKey,
      userId: config.docusign.userId,
      privateKeyPath: config.docusign.privateKeyPath,
      environment: config.docusign.environment
    });
    console.log('  Authentication successful');
    console.log(`  Base URI: ${authResult.baseUri}`);
  } catch (error) {
    console.error('  Authentication failed:', error.message);
    rl.close();
    process.exit(1);
  }
  console.log();

  // Initialize eSignature client
  const basePath = `${authResult.baseUri}/restapi`;
  const esignClient = new DocuSignESignClient({
    accountId: authResult.accountId || config.docusign.accountId,
    accessToken: authResult.accessToken,
    basePath
  });

  // Step 5: Initialize Mighty Networks
  console.log('Step 5: Connecting to Mighty Networks...');
  const mightyClient = new MightyNetworksClient({
    apiKey: config.mightyNetworks.apiKey,
    networkId: config.mightyNetworks.networkId
  });

  const mnConnected = await mightyClient.verifyConnection();
  if (mnConnected) {
    console.log('  Mighty Networks connected');
  } else {
    console.log('  WARNING: Could not connect to Mighty Networks - DMs will be skipped');
  }
  console.log();

  // Step 6: Confirm before sending
  console.log('='.repeat(60));
  console.log('READY TO SEND');
  console.log('='.repeat(60));
  console.log();
  console.log(`Members to contact: ${validMembers.length}`);
  console.log();
  console.log('Each member will receive:');
  console.log('  1. DocuSign email with the participation agreement to sign');
  console.log('  2. Mighty Networks DM notifying them to check their email');
  console.log();
  console.log('NOTE: DocuSign demo accounts have daily sending limits.');
  console.log('For production, ensure you have a paid DocuSign account.');
  console.log();

  const confirm = await question('Proceed with sending? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\nCancelled. No envelopes were sent.');
    rl.close();
    process.exit(0);
  }

  console.log();
  console.log('Starting to send...\n');

  // Step 7: Send to each member
  const results = {
    total: validMembers.length,
    docusignSent: 0,
    docusignFailed: 0,
    dmsSent: 0,
    dmsFailed: 0,
    errors: [],
    envelopes: []
  };

  for (let i = 0; i < validMembers.length; i++) {
    const member = validMembers[i];
    const progress = `[${i + 1}/${validMembers.length}]`;

    console.log(`${progress} ${member.firstName} ${member.lastName} (${member.email})`);

    // Send DocuSign envelope
    let envelopeSent = false;
    try {
      const result = await esignClient.sendEnvelope({
        signerEmail: member.email,
        signerName: `${member.firstName} ${member.lastName}`.trim(),
        documentPath: pdfPath,
        documentName: 'VLV Participation Agreement',
        emailSubject: 'VLV Action Required: Please Sign Your Participation Agreement',
        emailBody: `Hello ${member.firstName},

The Veldheer Lineman Vault has updated its training guidelines. Please review and sign the attached Participation Agreement.

If you are under 18, do not sign. Forward this to your parent or legal guardian to sign on your behalf.

Thank you for being part of VLV!`
      });

      results.docusignSent++;
      envelopeSent = true;
      results.envelopes.push({
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        envelopeId: result.envelopeId
      });
      console.log(`        DocuSign: Sent (${result.envelopeId})`);

    } catch (error) {
      results.docusignFailed++;
      results.errors.push({
        type: 'docusign',
        email: member.email,
        name: `${member.firstName} ${member.lastName}`,
        error: error.message
      });
      console.log(`        DocuSign: FAILED - ${error.message}`);
    }

    // Send Mighty Networks DM (only if connected and DocuSign sent)
    if (mnConnected && envelopeSent) {
      try {
        const dmMessage = createDMMessage(member);
        const dmResult = await mightyClient.sendDirectMessageByEmail(member.email, dmMessage);

        if (dmResult.success) {
          results.dmsSent++;
          console.log(`        DM: Sent`);
        } else {
          results.dmsFailed++;
          console.log(`        DM: Failed - ${dmResult.error}`);
        }
      } catch (error) {
        results.dmsFailed++;
        console.log(`        DM: Failed - ${error.message}`);
      }
    }

    // Rate limiting - DocuSign and Mighty Networks have API limits
    if (i < validMembers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // Step 8: Summary
  console.log();
  console.log('='.repeat(60));
  console.log('SENDING COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('RESULTS:');
  console.log(`  Total members: ${results.total}`);
  console.log();
  console.log('  DocuSign Envelopes:');
  console.log(`    Sent: ${results.docusignSent}`);
  console.log(`    Failed: ${results.docusignFailed}`);
  console.log();
  console.log('  Mighty Networks DMs:');
  console.log(`    Sent: ${results.dmsSent}`);
  console.log(`    Failed: ${results.dmsFailed}`);

  if (results.errors.length > 0) {
    console.log();
    console.log('ERRORS:');
    for (const err of results.errors) {
      console.log(`  [${err.type}] ${err.name} (${err.email}): ${err.error}`);
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
  console.log('Members will receive emails from DocuSign.');
  console.log('You can track signing status in your DocuSign account.');
  console.log();

  rl.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
