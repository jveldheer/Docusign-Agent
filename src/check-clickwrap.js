#!/usr/bin/env node
/**
 * Check clickwrap status and configuration
 */

import 'dotenv/config';
import { DocuSignClickClient } from './docusign-click-client.js';
import { getJWTAccessToken } from './jwt-auth.js';

async function checkClickwrap() {
  console.log('='.repeat(60));
  console.log('DocuSign Click - Clickwrap Status Check');
  console.log('='.repeat(60));
  console.log();

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const userId = process.env.DOCUSIGN_USER_ID;
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const privateKeyPath = process.env.DOCUSIGN_PRIVATE_KEY_PATH || './private.key';
  const clickwrapId = process.env.DOCUSIGN_CLICKWRAP_ID;
  const env = process.env.DOCUSIGN_ENV || 'demo';

  if (!clickwrapId) {
    console.error('ERROR: DOCUSIGN_CLICKWRAP_ID not set');
    process.exit(1);
  }

  console.log(`Clickwrap ID: ${clickwrapId}`);
  console.log(`Account ID: ${accountId}`);
  console.log();

  // Get access token
  console.log('Authenticating...');
  let accessToken;
  try {
    accessToken = await getJWTAccessToken({
      integrationKey,
      userId,
      privateKeyPath,
      environment: env
    });
    console.log('Authentication successful');
  } catch (error) {
    console.error('Authentication failed:', error.message);
    process.exit(1);
  }

  // Initialize client
  const basePath = DocuSignClickClient.getBasePath(env);
  const clickClient = new DocuSignClickClient({
    accountId,
    accessToken,
    basePath
  });

  // Get clickwrap details
  console.log();
  console.log('Fetching clickwrap details...');
  try {
    const clickwrap = await clickClient.getClickwrap(clickwrapId);

    console.log();
    console.log('CLICKWRAP DETAILS:');
    console.log('-'.repeat(40));
    console.log(`  Name: ${clickwrap.clickwrapName}`);
    console.log(`  Status: ${clickwrap.status}`);
    console.log(`  Version ID: ${clickwrap.versionId}`);
    console.log(`  Version Number: ${clickwrap.versionNumber}`);
    console.log(`  Created: ${clickwrap.createdTime}`);

    if (clickwrap.status !== 'active') {
      console.log();
      console.log('WARNING: Clickwrap is NOT active!');
      console.log('The clickwrap must be activated before it can be used.');
    }

    // List all clickwraps to see what's available
    console.log();
    console.log('ALL CLICKWRAPS IN ACCOUNT:');
    console.log('-'.repeat(40));
    const allClickwraps = await clickClient.listClickwraps();
    for (const cw of allClickwraps) {
      const marker = cw.clickwrapId === clickwrapId ? ' <-- CURRENT' : '';
      console.log(`  ${cw.clickwrapName}: ${cw.status}${marker}`);
    }

  } catch (error) {
    console.error('Error fetching clickwrap:', error.message);
    if (error.body) {
      console.error('Response:', error.body);
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('TROUBLESHOOTING EMBED ERRORS:');
  console.log('='.repeat(60));
  console.log();
  console.log('If you see "Application Error" when embedding, check:');
  console.log();
  console.log('1. ALLOWED DOMAINS - In DocuSign Admin:');
  console.log('   - Go to: Settings > Click > Allowed Domains');
  console.log('   - Add: localhost');
  console.log('   - Add: your production domain');
  console.log();
  console.log('2. CLICKWRAP STATUS - Must be "active"');
  console.log('   - If status is "draft", run: npm run create-clickwrap');
  console.log();
  console.log('3. CORS SETTINGS - Check browser console for errors');
  console.log();
}

checkClickwrap().catch(console.error);
