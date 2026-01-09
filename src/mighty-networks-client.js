/**
 * Mighty Networks API Client
 * Handles API interactions for sending direct messages
 */

const MIGHTY_NETWORKS_API_BASE = 'https://www.mightynetworks.com/api/v1';

/**
 * Mighty Networks API Client
 */
class MightyNetworksClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.networkId = config.networkId;
    this.baseUrl = MIGHTY_NETWORKS_API_BASE;
  }

  /**
   * Make an API request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} API response
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mighty Networks API error: ${response.status} - ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Get network information
   * @returns {Promise<Object>} Network details
   */
  async getNetwork() {
    return this.request(`/networks/${this.networkId}`);
  }

  /**
   * Get members of the network
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of members
   */
  async getMembers(options = {}) {
    const { page = 1, perPage = 50 } = options;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });

    return this.request(`/networks/${this.networkId}/members?${queryParams}`);
  }

  /**
   * Find a member by email
   * @param {string} email - Member email
   * @returns {Promise<Object|null>} Member object or null
   */
  async findMemberByEmail(email) {
    try {
      const queryParams = new URLSearchParams({
        email: email
      });
      const result = await this.request(`/networks/${this.networkId}/members/search?${queryParams}`);
      return result.members?.[0] || null;
    } catch (error) {
      console.error(`Error finding member ${email}:`, error.message);
      return null;
    }
  }

  /**
   * Send a direct message to a member
   * @param {string} memberId - The member's ID in Mighty Networks
   * @param {string} message - The message content
   * @returns {Promise<Object>} Message result
   */
  async sendDirectMessage(memberId, message) {
    return this.request(`/networks/${this.networkId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: memberId,
        body: message
      })
    });
  }

  /**
   * Send a direct message by email
   * First finds the member, then sends the message
   * @param {string} email - Member email
   * @param {string} message - The message content
   * @returns {Promise<Object>} Result with success status
   */
  async sendDirectMessageByEmail(email, message) {
    // First find the member
    const member = await this.findMemberByEmail(email);

    if (!member) {
      return {
        success: false,
        error: 'Member not found',
        email
      };
    }

    try {
      const result = await this.sendDirectMessage(member.id, message);
      return {
        success: true,
        memberId: member.id,
        email,
        messageId: result.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        email
      };
    }
  }

  /**
   * Send bulk direct messages with rate limiting
   * @param {Array} recipients - Array of {email, message} objects
   * @param {Object} options - Options for sending
   * @returns {Promise<Object>} Summary of results
   */
  async sendBulkMessages(recipients, options = {}) {
    const { delayMs = 1000, onProgress } = options;

    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < recipients.length; i++) {
      const { email, message } = recipients[i];

      try {
        const result = await this.sendDirectMessageByEmail(email, message);

        if (result.success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push({ email, error: result.error });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({ email, error: error.message });
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: recipients.length,
          email,
          success: results.sent > i ? true : false
        });
      }

      // Rate limiting delay (except for last message)
      if (i < recipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }

  /**
   * Verify API connection
   * @returns {Promise<boolean>} True if connected
   */
  async verifyConnection() {
    try {
      await this.getNetwork();
      return true;
    } catch (error) {
      console.error('Mighty Networks connection failed:', error.message);
      return false;
    }
  }
}

/**
 * Create DM message content with DocuSign link
 * @param {Object} member - Member data
 * @param {string} docusignLink - The DocuSign Click link
 * @returns {string} Formatted message
 */
function createDMMessage(member, docusignLink) {
  return `The VLV has updated its training guidelines please accept the updates in the following link.

${docusignLink}

If you are under 18, do not tap I agree. Forward this message to your parent or legal guardian and have them tap I agree for you.

After you finish, please reply DONE to this message.`;
}

export { MightyNetworksClient, createDMMessage };
