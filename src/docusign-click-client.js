/**
 * DocuSign Click API Client
 * Handles authentication and API calls for DocuSign Click
 */

import docusignClick from 'docusign-click';
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

    // Initialize API client
    this.apiClient = new docusignClick.ApiClient();
    this.apiClient.setBasePath(this.basePath);
    this.apiClient.addDefaultHeader('Authorization', `Bearer ${this.accessToken}`);
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

    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    // Build the clickwrap request
    const clickwrapRequest = new docusignClick.ClickwrapRequest();
    clickwrapRequest.clickwrapName = name;
    clickwrapRequest.displaySettings = new docusignClick.DisplaySettings();
    clickwrapRequest.displaySettings.displayName = displayName || name;
    clickwrapRequest.displaySettings.consentButtonText = buttonText;
    clickwrapRequest.displaySettings.downloadable = true;
    clickwrapRequest.displaySettings.format = 'modal';
    clickwrapRequest.displaySettings.hasAccept = true;
    clickwrapRequest.displaySettings.mustRead = true;
    clickwrapRequest.displaySettings.requireAccept = true;
    clickwrapRequest.displaySettings.sendToEmail = false;
    clickwrapRequest.requireReacceptance = requireReacceptance;

    // Add documents
    clickwrapRequest.documents = documents.map((doc, index) => {
      const document = new docusignClick.Document();
      document.documentBase64 = doc.base64Content;
      document.documentName = doc.name;
      document.fileExtension = doc.extension || 'pdf';
      document.order = index;
      return document;
    });

    try {
      const result = await accountsApi.createClickwrap(this.accountId, { clickwrapRequest });
      return {
        success: true,
        clickwrapId: result.clickwrapId,
        clickwrapName: result.clickwrapName,
        versionId: result.versionId,
        versionNumber: result.versionNumber,
        status: result.status
      };
    } catch (error) {
      console.error('Error creating clickwrap:', error);
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
    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    const clickwrapVersionRequest = new docusignClick.ClickwrapRequest();
    clickwrapVersionRequest.status = 'active';

    try {
      const result = await accountsApi.updateClickwrapVersion(
        this.accountId,
        clickwrapId,
        versionId,
        { clickwrapRequest: clickwrapVersionRequest }
      );

      return {
        success: true,
        clickwrapId: result.clickwrapId,
        versionId: result.versionId,
        status: result.status
      };
    } catch (error) {
      console.error('Error activating clickwrap:', error);
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
    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    try {
      const result = await accountsApi.getClickwraps(this.accountId);
      return result.clickwraps || [];
    } catch (error) {
      console.error('Error listing clickwraps:', error);
      throw error;
    }
  }

  /**
   * Get clickwrap details
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<Object>} Clickwrap details
   */
  async getClickwrap(clickwrapId) {
    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    try {
      const result = await accountsApi.getClickwrap(this.accountId, clickwrapId);
      return result;
    } catch (error) {
      console.error('Error getting clickwrap:', error);
      throw error;
    }
  }

  /**
   * Get user agreements (audit trail)
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<Array>} User agreements
   */
  async getUserAgreements(clickwrapId) {
    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    try {
      const result = await accountsApi.getClickwrapAgreements(this.accountId, clickwrapId);
      return result.userAgreements || [];
    } catch (error) {
      console.error('Error getting user agreements:', error);
      throw error;
    }
  }

  /**
   * Delete a clickwrap (for cleanup/testing)
   * @param {string} clickwrapId - The clickwrap ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteClickwrap(clickwrapId) {
    const accountsApi = new docusignClick.AccountsApi(this.apiClient);

    try {
      await accountsApi.deleteClickwrap(this.accountId, clickwrapId);
      return true;
    } catch (error) {
      console.error('Error deleting clickwrap:', error);
      throw error;
    }
  }
}

export { DocuSignClickClient };
