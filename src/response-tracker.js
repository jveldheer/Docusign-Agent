/**
 * Response Tracker
 * Tracks who has accepted the DocuSign Click agreement
 */

import fs from 'fs/promises';
import path from 'path';
import { DocuSignClickClient } from './docusign-click-client.js';
import { generateClientUserId } from './link-generator.js';

/**
 * Response Tracker class
 * Manages tracking of agreement acceptances
 */
class ResponseTracker {
  constructor(config) {
    this.clickClient = new DocuSignClickClient({
      accountId: config.accountId,
      accessToken: config.accessToken,
      basePath: DocuSignClickClient.getBasePath(config.environment || 'demo')
    });
    this.clickwrapId = config.clickwrapId;
    this.trackingFilePath = config.trackingFilePath || path.join(process.cwd(), 'data', 'tracking.json');
  }

  /**
   * Load tracking data from file
   * @returns {Promise<Object>} Tracking data
   */
  async loadTrackingData() {
    try {
      const data = await fs.readFile(this.trackingFilePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {
        createdAt: new Date().toISOString(),
        members: {},
        lastChecked: null
      };
    }
  }

  /**
   * Save tracking data to file
   * @param {Object} data - Tracking data
   */
  async saveTrackingData(data) {
    await fs.mkdir(path.dirname(this.trackingFilePath), { recursive: true });
    await fs.writeFile(this.trackingFilePath, JSON.stringify(data, null, 2));
  }

  /**
   * Initialize tracking for a list of members
   * @param {Array} members - Array of member objects
   */
  async initializeTracking(members) {
    const data = await this.loadTrackingData();

    for (const member of members) {
      const clientUserId = generateClientUserId(member);

      if (!data.members[clientUserId]) {
        data.members[clientUserId] = {
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          plan: member.plan,
          dmSent: false,
          dmSentAt: null,
          emailSent: false,
          emailSentAt: null,
          agreed: false,
          agreedAt: null,
          addedAt: new Date().toISOString()
        };
      }
    }

    await this.saveTrackingData(data);
    return data;
  }

  /**
   * Mark that a DM was sent to a member
   * @param {Object} member - Member object
   */
  async markDMSent(member) {
    const data = await this.loadTrackingData();
    const clientUserId = generateClientUserId(member);

    if (data.members[clientUserId]) {
      data.members[clientUserId].dmSent = true;
      data.members[clientUserId].dmSentAt = new Date().toISOString();
      await this.saveTrackingData(data);
    }
  }

  /**
   * Mark that an email was sent to a member
   * @param {Object} member - Member object
   */
  async markEmailSent(member) {
    const data = await this.loadTrackingData();
    const clientUserId = generateClientUserId(member);

    if (data.members[clientUserId]) {
      data.members[clientUserId].emailSent = true;
      data.members[clientUserId].emailSentAt = new Date().toISOString();
      await this.saveTrackingData(data);
    }
  }

  /**
   * Check DocuSign for agreement responses
   * @returns {Promise<Object>} Updated tracking data with responses
   */
  async checkResponses() {
    console.log('Fetching agreement responses from DocuSign...');

    const data = await this.loadTrackingData();

    try {
      // Get all agreements for this clickwrap
      const agreements = await this.clickClient.getUserAgreements(this.clickwrapId);

      console.log(`Found ${agreements.length} total agreements in DocuSign`);

      // Update tracking data with agreements
      for (const agreement of agreements) {
        const clientUserId = agreement.clientUserId;

        if (data.members[clientUserId]) {
          data.members[clientUserId].agreed = true;
          data.members[clientUserId].agreedAt = agreement.agreedOn || agreement.createdOn;
          data.members[clientUserId].agreementId = agreement.agreementId;
        } else {
          // Agreement from someone not in our tracking (edge case)
          console.log(`  Note: Agreement from unknown user: ${clientUserId}`);
        }
      }

      data.lastChecked = new Date().toISOString();
      await this.saveTrackingData(data);

      return data;
    } catch (error) {
      console.error('Error checking responses:', error.message);
      throw error;
    }
  }

  /**
   * Get summary statistics
   * @returns {Promise<Object>} Summary stats
   */
  async getSummary() {
    const data = await this.loadTrackingData();
    const members = Object.values(data.members);

    return {
      total: members.length,
      dmsSent: members.filter(m => m.dmSent).length,
      emailsSent: members.filter(m => m.emailSent).length,
      agreed: members.filter(m => m.agreed).length,
      pending: members.filter(m => !m.agreed).length,
      lastChecked: data.lastChecked
    };
  }

  /**
   * Get list of members who haven't agreed yet
   * @returns {Promise<Array>} Array of pending members
   */
  async getPendingMembers() {
    const data = await this.loadTrackingData();
    return Object.values(data.members).filter(m => !m.agreed);
  }

  /**
   * Get list of members who have agreed
   * @returns {Promise<Array>} Array of agreed members
   */
  async getAgreedMembers() {
    const data = await this.loadTrackingData();
    return Object.values(data.members).filter(m => m.agreed);
  }

  /**
   * Export tracking report
   * @returns {Promise<string>} Report as string
   */
  async exportReport() {
    const data = await this.loadTrackingData();
    const summary = await this.getSummary();

    let report = '=' .repeat(60) + '\n';
    report += 'VLV PARTICIPATION AGREEMENT TRACKING REPORT\n';
    report += '=' .repeat(60) + '\n\n';

    report += `Report Generated: ${new Date().toISOString()}\n`;
    report += `Last Checked: ${data.lastChecked || 'Never'}\n\n`;

    report += 'SUMMARY\n';
    report += '-' .repeat(40) + '\n';
    report += `Total Members: ${summary.total}\n`;
    report += `DMs Sent: ${summary.dmsSent}\n`;
    report += `Emails Sent: ${summary.emailsSent}\n`;
    report += `Agreements Accepted: ${summary.agreed}\n`;
    report += `Pending: ${summary.pending}\n\n`;

    report += 'AGREED MEMBERS\n';
    report += '-' .repeat(40) + '\n';
    const agreed = await this.getAgreedMembers();
    for (const m of agreed) {
      report += `✓ ${m.firstName} ${m.lastName} (${m.email}) - Agreed: ${m.agreedAt}\n`;
    }

    report += '\nPENDING MEMBERS\n';
    report += '-' .repeat(40) + '\n';
    const pending = await this.getPendingMembers();
    for (const m of pending) {
      report += `○ ${m.firstName} ${m.lastName} (${m.email})\n`;
      report += `  DM: ${m.dmSent ? 'Sent ' + m.dmSentAt : 'Not sent'}\n`;
      report += `  Email: ${m.emailSent ? 'Sent ' + m.emailSentAt : 'Not sent'}\n`;
    }

    return report;
  }

  /**
   * Export to CSV
   * @returns {Promise<string>} CSV content
   */
  async exportCSV() {
    const data = await this.loadTrackingData();
    const members = Object.values(data.members);

    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Plan',
      'DM Sent',
      'DM Sent At',
      'Email Sent',
      'Email Sent At',
      'Agreed',
      'Agreed At'
    ];

    const rows = members.map(m => [
      m.email,
      m.firstName,
      m.lastName,
      m.plan,
      m.dmSent ? 'Yes' : 'No',
      m.dmSentAt || '',
      m.emailSent ? 'Yes' : 'No',
      m.emailSentAt || '',
      m.agreed ? 'Yes' : 'No',
      m.agreedAt || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  }
}

export { ResponseTracker };
