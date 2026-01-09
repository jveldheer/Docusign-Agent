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
import { getJWTAccessToken } from './jwt-auth.js';
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
  const userId = process.env.DOCUSIGN_USER_ID;
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './private.key';
  const env = process.env.DOCUSIGN_ENV || 'demo';

  if (!accountId) {
    console.error('ERROR: DOCUSIGN_ACCOUNT_ID is required in .env file');
    process.exit(1);
  }

  if (!userId) {
    console.error('ERROR: DOCUSIGN_USER_ID is required in .env file');
    process.exit(1);
  }

  if (!integrationKey) {
    console.error('ERROR: DOCUSIGN_INTEGRATION_KEY is required in .env file');
    process.exit(1);
  }

  // Check private key exists
  try {
    await fs.access(privateKeyPath);
  } catch {
    console.error(`ERROR: Private key not found at: ${privateKeyPath}`);
    console.error('Make sure you saved your private.key file in the Docusign-Agent folder');
    process.exit(1);
  }

  console.log(`  Account ID: ${accountId.substring(0, 8)}...`);
  console.log(`  User ID: ${userId.substring(0, 8)}...`);
  console.log(`  Environment: ${env}`);
  console.log('  ✓ Configuration OK');
  console.log();

  // Step 2: Get JWT Access Token
  console.log('Step 2: Authenticating with DocuSign...');

  let accessToken;
  try {
    accessToken = await getJWTAccessToken({
      integrationKey,
      userId,
      privateKeyPath,
      environment: env
    });
    console.log('  ✓ Authentication successful');
  } catch (error) {
    console.error('ERROR: Authentication failed');
    console.error(`  ${error.message}`);

    if (error.message.includes('consent_required')) {
      console.error('\nYou need to grant consent. Visit this URL:');
      console.error(`https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20click.manage%20click.send&client_id=${integrationKey}&redirect_uri=https://developers.docusign.com/platform/auth/consent`);
    }
    process.exit(1);
  }
  console.log();

  // Step 3: Generate or load PDF
  console.log('Step 3: Preparing PDF document...');

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

  // Step 4: Initialize DocuSign Click client
  console.log('Step 4: Connecting to DocuSign Click API...');

  const basePath = DocuSignClickClient.getBasePath(env);
  const clickClient = new DocuSignClickClient({
    accountId,
    accessToken,
    basePath
  });

  console.log(`  Base path: ${basePath}`);
  console.log('  ✓ Client initialized');
  console.log();

  // Step 5: Create the clickwrap
  console.log('Step 5: Creating clickwrap agreement...');
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

    // Step 6: Activate/publish the clickwrap
    console.log('Step 6: Publishing clickwrap...');

    const activateResult = await clickClient.activateClickwrap(
      createResult.clickwrapId,
      createResult.versionId
    );

    console.log('  ✓ Clickwrap published!');
    console.log(`    Status: ${activateResult.status}`);
    console.log();

    // Step 7: Get the sharing URL
    console.log('Step 7: Generating sharing URLs...');

    const urlInfo = clickClient.getClickwrapUrl(createResult.clickwrapId);

    console.log();
    console.log('='.repeat(70));
    console.log('SUCCESS! Clickwrap Agreement Created');
    console.log('='.repeat(70));
    console.log();
    console.log('IMPORTANT - Add this to your .env file:');
    console.log('-'.repeat(70));
    console.log(`DOCUSIGN_CLICKWRAP_ID=${createResult.clickwrapId}`);
    console.log('-'.repeat(70));
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
    console.log('1. Add the DOCUSIGN_CLICKWRAP_ID to your .env file');
    console.log('2. Run: npm run send-agreements');
    console.log();

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'clickwrap-result.json');
    await fs.writeFile(resultsPath, JSON.stringify({
      ...createResult,
      urls: urlInfo,
      config: VLV_CLICKWRAP_CONFIG,
      createdAt: new Date().toISOString()
    }, null, 2));
    console.log(`Results saved to: ${resultsPath}`);

    return createResult;

  } catch (error) {
    console.error();
    console.error('ERROR creating clickwrap:');
    console.error(`  ${error.message}`);

    if (error.body) {
      console.error(`  Response: ${error.body}`);
    }

    console.error();
    console.error('TROUBLESHOOTING:');
    console.error('1. Make sure you granted consent to the app');
    console.error('2. Check that your account has Click enabled');
    console.error('3. Verify the private.key file is correct');

    process.exit(1);
  }
}

// Run if executed directly
createVLVClickwrap().catch(console.error);

export { createVLVClickwrap, VLV_CLICKWRAP_CONFIG };
