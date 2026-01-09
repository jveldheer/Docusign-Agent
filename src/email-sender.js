/**
 * Email Sender
 * Sends emails via Gmail using nodemailer
 */

import nodemailer from 'nodemailer';

/**
 * Gmail Email Sender
 */
class GmailSender {
  constructor(config) {
    this.email = config.email;
    this.password = config.password;
    this.fromName = config.fromName || 'Veldheer Lineman Vault';

    // Create transporter
    // Note: For Gmail, you need to use an App Password if 2FA is enabled
    // See: https://support.google.com/accounts/answer/185833
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.email,
        pass: this.password
      }
    });
  }

  /**
   * Send a single email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    const { to, subject, text, html } = options;

    const mailOptions = {
      from: `"${this.fromName}" <${this.email}>`,
      to,
      subject,
      text,
      html: html || undefined
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: result.messageId,
        to
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        to
      };
    }
  }

  /**
   * Send VLV agreement email to a member
   * @param {Object} member - Member data
   * @param {string} docusignLink - The DocuSign Click link
   * @returns {Promise<Object>} Send result
   */
  async sendAgreementEmail(member, docusignLink) {
    const subject = 'VLV Action Required';

    const text = `Hello ${member.firstName},

The VLV has updated its training guidelines please accept the updates in the following link.

${docusignLink}

If you are under 18, do not tap I agree. Forward this message to your parent or legal guardian and have them tap I agree for you.

Thank you!

Veldheer Lineman Vault`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { padding: 20px; font-size: 12px; color: #666; }
    .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Veldheer Lineman Vault</h1>
    </div>
    <div class="content">
      <p>Hello ${member.firstName},</p>

      <p>The VLV has updated its training guidelines. Please accept the updates by clicking the link below.</p>

      <p style="text-align: center;">
        <a href="${docusignLink}" class="button">Review and Accept Agreement</a>
      </p>

      <p>Or copy this link: <a href="${docusignLink}">${docusignLink}</a></p>

      <div class="warning">
        <strong>Under 18?</strong> Do not tap I agree. Forward this message to your parent or legal guardian and have them tap I agree for you.
      </div>

      <p>Thank you!</p>
    </div>
    <div class="footer">
      <p>Veldheer Lineman Vault<br>
      Dermadventures LLC</p>
    </div>
  </div>
</body>
</html>`;

    return this.sendEmail({
      to: member.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send bulk emails with rate limiting
   * @param {Array} recipients - Array of {member, docusignLink} objects
   * @param {Object} options - Options for sending
   * @returns {Promise<Object>} Summary of results
   */
  async sendBulkEmails(recipients, options = {}) {
    const { delayMs = 2000, onProgress } = options;

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < recipients.length; i++) {
      const { member, docusignLink } = recipients[i];

      try {
        const result = await this.sendAgreementEmail(member, docusignLink);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ email: member.email, error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ email: member.email, error: error.message });
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: recipients.length,
          email: member.email,
          success: results.sent === i + 1
        });
      }

      // Rate limiting delay (except for last email)
      // Gmail has a limit of ~500 emails/day for regular accounts
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<boolean>} True if connected
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Gmail connection failed:', error.message);
      console.error('\nIf using Gmail with 2FA:');
      console.error('1. Go to https://myaccount.google.com/apppasswords');
      console.error('2. Generate an App Password for "Mail"');
      console.error('3. Use that password instead of your regular password');
      return false;
    }
  }

  /**
   * Close the transporter
   */
  close() {
    this.transporter.close();
  }
}

export { GmailSender };
