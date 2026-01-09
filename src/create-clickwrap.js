#!/usr/bin/env node
/**
 * DocuSign Click - Create VLV Participation Agreement Clickwrap
 *
 * This script creates a clickwrap agreement for the Veldheer Lineman Vault
 * participation agreement using DocuSign Click.
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { DocuSignClickClient } from './docusign-click-client.js';
import { DocuSignAuth, SimpleAuth } from './auth.js';
import { generatePDF, AGREEMENT_CONFIG } from './generate-pdf.js';

// VLV Clickwrap Configuration
const VLV_CLICKWRAP_CONFIG = {
  name: 'vlv-participation-agreement-2026-01',
  displayName: 'Dermadventures LLC dba Veldheer Lineman Vault Participation Agreement',
  version: '2026 01',
  buttonText: 'I agree',
  pdfFileName: 'VLV_Participation_Agreement_DermadventuresLLC_Jan2026_FINAL.pdf'
};

/**
 * Main function to create the clickwrap agreement
 */
async function createVLVClickwrap() {
  console.log('='.repeat(70));
  console.log('DocuSign Click - VLV Participation Agreement Setup');
  console.log('='.repeat(70));
  console.log();

  // Step 1: Check configuration
  console.log('Step 1: Checking configuration...');

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const accessToken = process.env.DOCUSIGN_ACCESS_TOKEN;
  const env = process.env.DOCUSIGN_ENV || 'demo';

  if (!accountId) {
    console.error('ERROR: DOCUSIGN_ACCOUNT_ID is required in .env file');
    console.log('\nTo get your Account ID:');
    console.log('1. Log in to DocuSign Admin');
    console.log('2. Go to Settings > Apps and Keys');
    console.log('3. Copy the "API Account ID"');
    process.exit(1);
  }

  if (!accessToken) {
    console.error('ERROR: DOCUSIGN_ACCESS_TOKEN is required in .env file');
    console.log('\nTo get an access token:');
    console.log('1. Go to https://developers.docusign.com/tools/api-access-token');
    console.log('2. Log in with your DocuSign developer account');
    console.log('3. Generate an access token');
    console.log('4. Copy it to your .env file');
    process.exit(1);
  }

  console.log(`  Account ID: ${accountId.substring(0, 8)}...`);
  console.log(`  Environment: ${env}`);
  console.log('  ✓ Configuration OK');
  console.log();

  // Step 2: Generate or load PDF
  console.log('Step 2: Preparing PDF document...');

  const pdfPath = path.join(process.cwd(), 'agreements', VLV_CLICKWRAP_CONFIG.pdfFileName);

  try {
    await fs.access(pdfPath);
    console.log(`  Found existing PDF: ${VLV_CLICKWRAP_CONFIG.pdfFileName}`);
  } catch {
    console.log('  Generating new PDF...');
    await generatePDF();
    console.log(`  ✓ PDF generated: ${VLV_CLICKWRAP_CONFIG.pdfFileName}`);
  }

  // Read PDF as base64
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');
  console.log(`  ✓ PDF loaded (${Math.round(pdfBuffer.length / 1024)} KB)`);
  console.log();

  // Step 3: Initialize DocuSign Click client
  console.log('Step 3: Connecting to DocuSign Click API...');

  const basePath = DocuSignClickClient.getBasePath(env);
  const clickClient = new DocuSignClickClient({
    accountId,
    accessToken,
    basePath
  });

  console.log(`  Base path: ${basePath}`);
  console.log('  ✓ Client initialized');
  console.log();

  // Step 4: Create the clickwrap
  console.log('Step 4: Creating clickwrap agreement...');
  console.log(`  Name: ${VLV_CLICKWRAP_CONFIG.displayName}`);
  console.log(`  Version: ${VLV_CLICKWRAP_CONFIG.version}`);
  console.log(`  Button text: "${VLV_CLICKWRAP_CONFIG.buttonText}"`);

  try {
    const createResult = await clickClient.createClickwrap({
      name: VLV_CLICKWRAP_CONFIG.name,
      displayName: VLV_CLICKWRAP_CONFIG.displayName,
      buttonText: VLV_CLICKWRAP_CONFIG.buttonText,
      documents: [{
        base64Content: pdfBase64,
        name: VLV_CLICKWRAP_CONFIG.pdfFileName,
        extension: 'pdf'
      }]
    });

    console.log('  ✓ Clickwrap created successfully!');
    console.log(`    Clickwrap ID: ${createResult.clickwrapId}`);
    console.log(`    Version ID: ${createResult.versionId}`);
    console.log(`    Status: ${createResult.status}`);
    console.log();

    // Step 5: Activate/publish the clickwrap
    console.log('Step 5: Publishing clickwrap...');

    const activateResult = await clickClient.activateClickwrap(
      createResult.clickwrapId,
      createResult.versionId
    );

    console.log('  ✓ Clickwrap published!');
    console.log(`    Status: ${activateResult.status}`);
    console.log();

    // Step 6: Get the sharing URL
    console.log('Step 6: Generating sharing URLs...');

    const urlInfo = clickClient.getClickwrapUrl(createResult.clickwrapId);

    console.log();
    console.log('='.repeat(70));
    console.log('SUCCESS! Clickwrap Agreement Created');
    console.log('='.repeat(70));
    console.log();
    console.log('CLICKWRAP DETAILS:');
    console.log(`  Name: ${VLV_CLICKWRAP_CONFIG.displayName}`);
    console.log(`  Version: ${VLV_CLICKWRAP_CONFIG.version}`);
    console.log(`  Clickwrap ID: ${createResult.clickwrapId}`);
    console.log(`  Version ID: ${createResult.versionId}`);
    console.log();
    console.log('EMBED CODE (for your website):');
    console.log('-'.repeat(70));
    console.log(urlInfo.embedScript);
    console.log('-'.repeat(70));
    console.log();
    console.log('NEXT STEPS:');
    console.log('1. Copy the embed code above to your website');
    console.log('2. Replace "unique-user-id-here" with each user\'s unique ID');
    console.log('3. Users can click "I agree" to accept the agreement');
    console.log('4. View accepted agreements in DocuSign Admin > Click');
    console.log();
    console.log('DM TEMPLATE FOR MEMBERS:');
    console.log('-'.repeat(70));
    console.log('Action required to keep workout access.');
    console.log();
    console.log('[Embed the clickwrap on your website and share the link here]');
    console.log();
    console.log('If you are under 18, do not tap I agree. Forward this message to');
    console.log('your parent or legal guardian and have them tap I agree for you.');
    console.log();
    console.log('After you finish, reply DONE in this thread.');
    console.log('-'.repeat(70));

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'clickwrap-result.json');
    await fs.writeFile(resultsPath, JSON.stringify({
      ...createResult,
      urls: urlInfo,
      config: VLV_CLICKWRAP_CONFIG,
      createdAt: new Date().toISOString()
    }, null, 2));
    console.log();
    console.log(`Results saved to: ${resultsPath}`);

    return createResult;

  } catch (error) {
    console.error();
    console.error('ERROR creating clickwrap:');

    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${JSON.stringify(error.response.body || error.response.data, null, 2)}`);
    } else {
      console.error(`  ${error.message}`);
    }

    console.error();
    console.error('TROUBLESHOOTING:');
    console.error('1. Verify your access token is valid and not expired');
    console.error('2. Check that your account has Click enabled');
    console.error('3. Ensure you have the correct Account ID');
    console.error('4. For demo accounts, use DOCUSIGN_ENV=demo');

    process.exit(1);
  }
}

// Run if executed directly
createVLVClickwrap().catch(console.error);

export { createVLVClickwrap, VLV_CLICKWRAP_CONFIG };
