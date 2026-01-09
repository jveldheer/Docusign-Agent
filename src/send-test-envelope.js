#!/usr/bin/env node
/**
 * Send a test envelope via DocuSign eSignature
 * This sends the participation agreement to a test email for review
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { getJWTAccessToken } from './jwt-auth.js';
import { DocuSignESignClient } from './docusign-esign-client.js';
import { generatePDF, AGREEMENT_CONFIG } from './generate-pdf.js';

async function sendTestEnvelope() {
  console.log('='.repeat(60));
  console.log('DocuSign eSignature - Send Test Agreement');
  console.log('='.repeat(60));
  console.log();

  // Test recipient
  const testRecipient = {
    name: 'Jared Veldheer',
    email: 'jared.veldheer@gmail.com'
  };

  // Get config
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const userId = process.env.DOCUSIGN_USER_ID;
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './private.key';
  const env = process.env.DOCUSIGN_ENV || 'demo';

  // Validate config
  if (!accountId || !userId || !integrationKey) {
    console.error('ERROR: Missing DocuSign configuration in .env');
    console.error('Required: DOCUSIGN_ACCOUNT_ID, DOCUSIGN_USER_ID, DOCUSIGN_INTEGRATION_KEY');
    process.exit(1);
  }

  // Check for private key
  if (!fs.existsSync(privateKeyPath)) {
    console.error(`ERROR: Private key not found at ${privateKeyPath}`);
    process.exit(1);
  }

  console.log(`Recipient: ${testRecipient.name} <${testRecipient.email}>`);
  console.log(`Environment: ${env}`);
  console.log();

  // Step 1: Generate PDF if needed
  console.log('Step 1: Checking PDF agreement...');
  const pdfPath = path.join(process.cwd(), 'agreements', AGREEMENT_CONFIG.fileName);

  if (!fs.existsSync(pdfPath)) {
    console.log('  Generating PDF...');
    await generatePDF();
  }
  console.log(`  PDF ready: ${pdfPath}`);
  console.log();

  // Step 2: Get access token
  console.log('Step 2: Authenticating with DocuSign...');
  let accessToken;
  try {
    accessToken = await getJWTAccessToken({
      integrationKey,
      userId,
      privateKeyPath,
      environment: env
    });
    console.log('  Authentication successful');
  } catch (error) {
    console.error('  Authentication failed:', error.message);
    process.exit(1);
  }
  console.log();

  // Step 3: Create and send envelope
  console.log('Step 3: Sending envelope...');
  const basePath = DocuSignESignClient.getBasePath(env);
  const esignClient = new DocuSignESignClient({
    accountId,
    accessToken,
    basePath
  });

  try {
    const result = await esignClient.sendEnvelope({
      signerEmail: testRecipient.email,
      signerName: testRecipient.name,
      documentPath: pdfPath,
      documentName: 'VLV Participation Agreement',
      emailSubject: 'VLV Action Required: Please Sign Your Participation Agreement',
      emailBody: `Hello ${testRecipient.name.split(' ')[0]},

The Veldheer Lineman Vault has updated its training guidelines. Please review and sign the attached Participation Agreement.

If you are under 18, do not sign. Forward this to your parent or legal guardian to sign on your behalf.

Thank you for being part of VLV!`
    });

    console.log();
    console.log('='.repeat(60));
    console.log('SUCCESS! Envelope sent.');
    console.log('='.repeat(60));
    console.log();
    console.log(`Envelope ID: ${result.envelopeId}`);
    console.log(`Status: ${result.status}`);
    console.log();
    console.log('NEXT STEPS:');
    console.log(`1. Check ${testRecipient.email} for the DocuSign email`);
    console.log('2. Click the link to review the agreement');
    console.log('3. Sign the document to test the flow');
    console.log();
    console.log('The email will come FROM DocuSign, not from your Gmail.');
    console.log();

  } catch (error) {
    console.error('Failed to send envelope:', error.message);
    if (error.body) {
      console.error('Details:', error.body);
    }
    process.exit(1);
  }
}

sendTestEnvelope().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
