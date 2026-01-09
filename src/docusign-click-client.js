/**
 * DocuSign Click API Client
 * Handles authentication and API calls for DocuSign Click
 * Uses direct HTTP calls for reliability
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * DocuSign Click API wrapper class
 */
class DocuSignClickClient {
  constructor(config) {
    this.accountId = config.accountId;
    this.basePath = config.basePath || 'https://demo.docusign.net/clickapi';
    this.accessToken = config.accessToken;
  }

  /**
   * Get base path based on environment
   */
  static getBasePath(env = 'demo') {
    return env === 'production'
      ? 'https://www.docusign.net/clickapi'
      : 'https://demo.docusign.net/clickapi';
  }

  /**
   * Make an API request
   */
  async request(endpoint, options = {}) {
    const url = `${this.basePath}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    const responseText = await response.text();

    if (!response.ok) {
      const error = new Error(`DocuSign API error: ${response.status}`);
      error.status = response.status;
      error.body = responseText;
      throw error;
    }

    return responseText ? JSON.parse(responseText) : {};
  }

  /**
   * Create a new clickwrap agreement
   * @param {Object} options - Clickwrap configuration
   * @returns {Promise<Object>} Created clickwrap details
   */
  async createClickwrap(options) {
    const {
      name,
      displayName,
      documents,
      buttonText = 'I agree',
      requireReacceptance = false
    } = options;

    const clickwrapRequest = {
      clickwrapName: name,
      displaySettings: {
        displayName: displayName || name,
        consentButtonText: buttonText,
        downloadable: true,
        format: 'modal',
        hasAccept: true,
        mustRead: true,
        requireAccept: true,
        sendToEmail: false
      },
      requireReacceptance: requireReacceptance,
      documents: documents.map((doc, index) => ({
        documentBase64: doc.base64Content,
        documentName: doc.name,
        fileExtension: doc.extension || 'pdf',
        order: index
      }))
    };

    try {
      const result = await this.request(`/v1/accounts/${this.accountId}/clickwraps`, {
        method: 'POST',
        body: JSON.stringify(clickwrapRequest)
      });

      return {
        success: true,
        clickwrapId: result.clickwrapId,
        clickwrapName: result.clickwrapName,
        versionId: result.versionId,
        versionNumber: result.versionNumber,
        status: result.status
      };
    } catch (error) {
      console.error('Error creating clickwrap:', error.message);
      if (error.body) {
        console.error('Response:', error.body);
      }
      throw error;
    }
  }

  /**
   * Activate/publish a clickwrap version
   * @param {string} clickwrapId - The clickwrap ID
   * @param {string} versionId - The version ID to activate
   * @returns {Promise<Object>} Activation result
   */
  async activateClickwrap(clickwrapId, versionId) {
    const updateRequest = {
      status: 'active'
    };

    try {
      const result = await this.request(
        `/v1/accounts/${this.accountId}/clickwraps/${clickwrapId}/versions/${versionId}`,
        {
          method: 'PUT',
          body: JSON.stringify(updateRequest)
        }
      );

      return {
        success: true,
        clickwrapId: result.clickwrapId,
        versionId: result.versionId,
        status: result.status
      };
    } catch (error) {
      console.error('Error activating clickwrap:', error.message);
      throw error;
    }
  }

  /**
   * Get clickwrap agreements URL for embedding
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Object} URL information
   */
  getClickwrapUrl(clickwrapId) {
    const baseUrl = this.basePath.replace('/clickapi', '');
    return {
      // Direct link that can be shared
      agreementUrl: `${baseUrl}/click/v1/clickwraps/${this.accountId}/${clickwrapId}/views/embed`,
      // JavaScript embed snippet
      embedScript: this.getEmbedScript(clickwrapId)
    };
  }

  /**
   * Generate JavaScript embed snippet for the clickwrap
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {string} HTML/JS embed code
   */
  getEmbedScript(clickwrapId) {
    const env = this.basePath.includes('demo') ? 'demo' : 'na1';

    return `<!-- DocuSign Click Embed -->
<div id="ds-clickwrap"></div>
<script src="https://demo.docusign.net/clickapi/sdk/latest/docusign-click.js"></script>
<script>
  docuSignClick.Clickwrap.render({
    environment: '${env}',
    accountId: '${this.accountId}',
    clickwrapId: '${clickwrapId}',
    clientUserId: 'unique-user-id-here', // Replace with actual user ID
  }, '#ds-clickwrap');
</script>`;
  }

  /**
   * Get list of all clickwraps
   * @returns {Promise<Array>} List of clickwraps
   */
  async listClickwraps() {
    try {
      const result = await this.request(`/v1/accounts/${this.accountId}/clickwraps`);
      return result.clickwraps || [];
    } catch (error) {
      console.error('Error listing clickwraps:', error.message);
      throw error;
    }
  }

  /**
   * Get clickwrap details
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<Object>} Clickwrap details
   */
  async getClickwrap(clickwrapId) {
    try {
      const result = await this.request(`/v1/accounts/${this.accountId}/clickwraps/${clickwrapId}`);
      return result;
    } catch (error) {
      console.error('Error getting clickwrap:', error.message);
      throw error;
    }
  }

  /**
   * Get user agreements (audit trail)
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<Array>} User agreements
   */
  async getUserAgreements(clickwrapId) {
    try {
      const result = await this.request(`/v1/accounts/${this.accountId}/clickwraps/${clickwrapId}/users`);
      return result.userAgreements || [];
    } catch (error) {
      console.error('Error getting user agreements:', error.message);
      throw error;
    }
  }

  /**
   * Delete a clickwrap (for cleanup/testing)
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteClickwrap(clickwrapId) {
    try {
      await this.request(`/v1/accounts/${this.accountId}/clickwraps/${clickwrapId}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error('Error deleting clickwrap:', error.message);
      throw error;
    }
  }
}

export { DocuSignClickClient };
