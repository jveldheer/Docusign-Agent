#!/usr/bin/env node
/**
 * Send a single test email to verify the email content
 * Usage: npm run send-test-email
 */

import 'dotenv/config';
import { GmailSender } from './email-sender.js';
import { generateClickwrapUrl } from './link-generator.js';

async function sendTestEmail() {
  console.log('='.repeat(60));
  console.log('VLV Test Email - Sending Proof to Jared');
  console.log('='.repeat(60));
  console.log();

  // Test user data
  const testMember = {
    firstName: 'Jared',
    lastName: 'Veldheer',
    email: 'jared.veldheer@gmail.com'
  };

  // Get config from env
  const config = {
    docusign: {
      accountId: process.env.DOCUSIGN_ACCOUNT_ID,
      clickwrapId: process.env.DOCUSIGN_CLICKWRAP_ID,
      environment: process.env.DOCUSIGN_ENV || 'demo'
    },
    gmail: {
      email: process.env.GMAIL_EMAIL,
      password: process.env.GMAIL_PASSWORD
    }
  };

  // Validate config
  if (!config.docusign.clickwrapId) {
    console.error('ERROR: DOCUSIGN_CLICKWRAP_ID not set in .env');
    process.exit(1);
  }
  if (!config.gmail.email || !config.gmail.password) {
    console.error('ERROR: Gmail credentials not set in .env');
    process.exit(1);
  }

  console.log(`To: ${testMember.email}`);
  console.log(`Name: ${testMember.firstName} ${testMember.lastName}`);
  console.log();

  // Generate personalized DocuSign link
  const docusignLink = generateClickwrapUrl(config.docusign, testMember);
  console.log('Generated DocuSign Link:');
  console.log(docusignLink);
  console.log();

  // Initialize Gmail sender
  const emailSender = new GmailSender({
    email: config.gmail.email,
    password: config.gmail.password
  });

  // Verify connection
  console.log('Verifying Gmail connection...');
  const connected = await emailSender.verifyConnection();
  if (!connected) {
    console.error('Failed to connect to Gmail');
    process.exit(1);
  }
  console.log('Gmail connected!\n');

  // Send the exact email that members will receive
  console.log('Sending test email...');
  const result = await emailSender.sendAgreementEmail(testMember, docusignLink);

  if (result.success) {
    console.log();
    console.log('SUCCESS! Test email sent.');
    console.log(`Message ID: ${result.messageId}`);
    console.log();
    console.log('='.repeat(60));
    console.log('NEXT STEPS:');
    console.log('='.repeat(60));
    console.log();
    console.log('1. Check jared.veldheer@gmail.com for the test email');
    console.log('2. Review the email content and formatting');
    console.log('3. Click the link to test the agreement (see note below)');
    console.log();
    console.log('NOTE: The DocuSign Click link requires the clickwrap to be');
    console.log('properly configured. If you see an "Application Error":');
    console.log('  - Go to https://admindemo.docusign.com');
    console.log('  - Navigate to Click settings');
    console.log('  - Add your domain to Allowed Domains');
    console.log();
  } else {
    console.error('Failed to send email:', result.error);
    process.exit(1);
  }

  emailSender.close();
}

sendTestEmail().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
