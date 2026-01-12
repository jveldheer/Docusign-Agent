#!/usr/bin/env node
/**
 * Resend Failed Agreements Script
 * Sends VLV participation agreements to specific members who failed previously
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

import { getJWTAccessToken } from './jwt-auth.js';
import { DocuSignESignClient } from './docusign-esign-client.js';
import { generatePDF, AGREEMENT_CONFIG } from './generate-pdf.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

// Members who failed
const FAILED_MEMBERS = [
  { firstName: 'Caden', lastName: 'Frake', email: 'dan.frake@gmail.com' },
  { firstName: 'Joshua', lastName: 'Vasallo', email: 'vasallo1228@yahoo.com' },
  { firstName: 'Jordan', lastName: 'Moran', email: 'jrdnmoran94@gmail.com' },
  { firstName: 'Bryce', lastName: 'Burnett', email: 'bryceburnett2004@gmail.com' },
  { firstName: 'Will', lastName: 'Kowalewski', email: 'julieb.kowalewski@comcast.net' },
  { firstName: 'Ayden', lastName: 'VanWinkle', email: 'coontreinmax@gmail.com' },
  { firstName: 'Sean', lastName: 'Joy', email: 'seanpatrick7116@gmail.com' },
  { firstName: 'Max', lastName: 'Kotel', email: 'mjkotelnicki@gmail.com' },
  { firstName: 'Joshua', lastName: 'Ezeudu', email: 'jezeudu@gmail.com' },
  { firstName: 'dan', lastName: 'judy', email: 'djudy4142@gmail.com' },
  { firstName: 'Isaac', lastName: 'FRISCH', email: 'isaacfrisch@gmail.com' },
  { firstName: 'Gavin', lastName: 'Grech', email: 'gpgrech@utica.edu' },
  { firstName: 'Bill', lastName: 'Skewes', email: 'skewesw@yahoo.com' },
  { firstName: 'Chris', lastName: 'Williams', email: 'bigwill45@gmail.com' },
  { firstName: 'Zach', lastName: 'Mcclain', email: 'zacharymcclain86@gmail.com' },
  { firstName: 'Grant', lastName: 'Lower', email: 'gnlower@gmail.com' },
  { firstName: 'Pace', lastName: 'Briggs', email: 'p.briggs1224@gmail.com' },
  { firstName: 'Cristian', lastName: 'Hervia', email: 'crishervia@gmail.com' },
  { firstName: 'Cormac', lastName: 'Householder', email: 'keith5375@yahoo.com' },
  { firstName: 'Ian', lastName: 'Bonneau', email: 'ian.bonneau9@gmail.com' }
];

function getConfig() {
  return {
    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      userId: process.env.DOCUSIGN_USER_ID,
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH || './private.key',
      environment: process.env.DOCUSIGN_ENV || 'demo'
    }
  };
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  VLV - Resend Failed Agreements');
  console.log('='.repeat(60) + '\n');

  const config = getConfig();

  // Check PDF
  const pdfPath = path.join(process.cwd(), 'agreements', AGREEMENT_CONFIG.fileName);
  try {
    await fs.access(pdfPath);
  } catch {
    await generatePDF();
  }

  // Authenticate
  console.log('Authenticating with DocuSign...');
  const authResult = await getJWTAccessToken({
    integrationKey: config.docusign.integrationKey,
    userId: config.docusign.userId,
    privateKeyPath: config.docusign.privateKeyPath,
    environment: config.docusign.environment
  });
  console.log('  Authenticated. Base URI:', authResult.baseUri, '\n');

  const esignClient = new DocuSignESignClient({
    accountId: authResult.accountId || config.docusign.accountId,
    accessToken: authResult.accessToken,
    basePath: `${authResult.baseUri}/restapi`
  });

  console.log(`Sending to ${FAILED_MEMBERS.length} members...\n`);

  const confirm = await question('Proceed? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('Cancelled.');
    rl.close();
    return;
  }

  let sent = 0, failed = 0;

  for (let i = 0; i < FAILED_MEMBERS.length; i++) {
    const m = FAILED_MEMBERS[i];
    console.log(`[${i + 1}/${FAILED_MEMBERS.length}] ${m.firstName} ${m.lastName} (${m.email})`);

    try {
      const result = await esignClient.sendEnvelope({
        signerEmail: m.email,
        signerName: `${m.firstName} ${m.lastName}`,
        documentPath: pdfPath,
        documentName: 'VLV Participation Agreement',
        emailSubject: 'VLV Action Required: Please Sign Your Participation Agreement',
        emailBody: `Hello ${m.firstName},\n\nPlease review and sign the VLV Participation Agreement.\n\nIf under 18, forward to your parent/guardian.\n\nThank you!`
      });
      console.log(`        Sent (${result.envelopeId})`);
      sent++;
    } catch (error) {
      console.log(`        FAILED - ${error.message}`);
      failed++;
    }

    if (i < FAILED_MEMBERS.length - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`DONE: ${sent} sent, ${failed} failed`);
  console.log('='.repeat(60) + '\n');

  rl.close();
}

main().catch(e => { console.error(e); rl.close(); process.exit(1); });
