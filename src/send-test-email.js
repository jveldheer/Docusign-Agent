#!/usr/bin/env node
/**
 * Send a test agreement email to verify the DocuSign Click setup
 */

import 'dotenv/config';
import nodemailer from 'nodemailer';

const TEST_EMAIL = process.argv[2] || 'jared.veldheer@gmail.com';

async function sendTestEmail() {
  console.log('='.repeat(60));
  console.log('DocuSign Click - Send Test Agreement Email');
  console.log('='.repeat(60));
  console.log();

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const clickwrapId = process.env.DOCUSIGN_CLICKWRAP_ID;
  const gmailEmail = process.env.GMAIL_EMAIL;
  const gmailPassword = process.env.GMAIL_PASSWORD;

  if (!clickwrapId) {
    console.error('ERROR: DOCUSIGN_CLICKWRAP_ID not set in .env file');
    console.error('Run: npm run create-clickwrap first');
    process.exit(1);
  }

  if (!gmailEmail || !gmailPassword) {
    console.error('ERROR: Gmail credentials not set in .env file');
    process.exit(1);
  }

  // Generate the personalized agreement URL
  const clientUserId = encodeURIComponent(TEST_EMAIL);
  const agreementUrl = `https://demo.docusign.net/clickapi/v1/accounts/${accountId}/clickwraps/${clickwrapId}/agreements?clientUserId=${clientUserId}`;

  console.log(`Sending test email to: ${TEST_EMAIL}`);
  console.log(`Clickwrap ID: ${clickwrapId}`);
  console.log();

  // Create email transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailPassword
    }
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background: #f9f9f9; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Veldheer Lineman Vault</h1>
    </div>
    <div class="content">
      <h2>TEST - Participation Agreement</h2>
      <p>This is a <strong>TEST EMAIL</strong> to verify the DocuSign Click setup.</p>
      <p>As a member of the Veldheer Lineman Vault, we need you to review and accept our participation agreement.</p>
      <p>This agreement outlines the terms and conditions for your membership and helps protect both you and VLV.</p>
      <p style="text-align: center;">
        <a href="${agreementUrl}" class="button">Review & Accept Agreement</a>
      </p>
      <p><small>If the button doesn't work, copy and paste this link into your browser:</small></p>
      <p><small>${agreementUrl}</small></p>
    </div>
    <div class="footer">
      <p>Dermadventures LLC dba Veldheer Lineman Vault</p>
      <p>This is a test email - please confirm you received it.</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const result = await transporter.sendMail({
      from: `"Veldheer Lineman Vault" <${gmailEmail}>`,
      to: TEST_EMAIL,
      subject: 'TEST - VLV Participation Agreement - Please Review',
      html: emailHtml
    });

    console.log('SUCCESS! Test email sent.');
    console.log(`Message ID: ${result.messageId}`);
    console.log();
    console.log('NEXT STEPS:');
    console.log(`1. Check ${TEST_EMAIL} inbox for the test email`);
    console.log('2. Click the "Review & Accept Agreement" button');
    console.log('3. Accept the agreement to verify it works');
    console.log('4. Run: npm run check-responses to verify acceptance was recorded');
    console.log();

  } catch (error) {
    console.error('ERROR sending email:', error.message);
    process.exit(1);
  }
}

sendTestEmail().catch(console.error);
