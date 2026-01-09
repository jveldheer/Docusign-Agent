/**
 * DocuSign Authentication Module
 * Supports JWT Grant authentication for server-to-server integration
 */

import docusignEsign from 'docusign-esign';
import fs from 'fs/promises';
import path from 'path';

const SCOPES = [
  'signature',
  'click.manage',
  'click.send'
];

/**
 * DocuSign JWT Authentication
 */
class DocuSignAuth {
  constructor(config) {
    this.integrationKey = config.integrationKey;
    this.userId = config.userId;
    this.privateKeyPath = config.privateKeyPath;
    this.accountId = config.accountId;
    this.basePath = config.basePath || 'https://demo.docusign.net';

    this.apiClient = new docusignEsign.ApiClient();
    this.apiClient.setBasePath(this.basePath + '/restapi');
  }

  /**
   * Get OAuth base path based on environment
   */
  getOAuthBasePath() {
    return this.basePath.includes('demo')
      ? 'account-d.docusign.com'
      : 'account.docusign.com';
  }

  /**
   * Authenticate using JWT Grant
   * @returns {Promise<Object>} Access token and expiration
   */
  async authenticate() {
    try {
      // Read private key
      const privateKey = await fs.readFile(this.privateKeyPath, 'utf8');

      // Request JWT token
      const response = await this.apiClient.requestJWTUserToken(
        this.integrationKey,
        this.userId,
        SCOPES,
        privateKey,
        3600 // Token expires in 1 hour
      );

      const accessToken = response.body.access_token;
      const expiresIn = response.body.expires_in;

      return {
        accessToken,
        expiresIn,
        expiresAt: new Date(Date.now() + (expiresIn * 1000))
      };
    } catch (error) {
      if (error.response && error.response.body && error.response.body.error === 'consent_required') {
        // User needs to grant consent
        const consentUrl = this.getConsentUrl();
        throw new Error(
          `Consent required. Please visit this URL to grant consent:\n${consentUrl}\n\n` +
          `After granting consent, run this script again.`
        );
      }
      throw error;
    }
  }

  /**
   * Generate consent URL for initial authorization
   * @returns {string} Consent URL
   */
  getConsentUrl() {
    const oauthBasePath = this.getOAuthBasePath();
    const redirectUri = 'https://developers.docusign.com/platform/auth/consent';

    return `https://${oauthBasePath}/oauth/auth?` +
      `response_type=code&` +
      `scope=${encodeURIComponent(SCOPES.join(' '))}&` +
      `client_id=${this.integrationKey}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  /**
   * Get user info to retrieve account ID
   * @param {string} accessToken - The access token
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(accessToken) {
    this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const response = await this.apiClient.getUserInfo(accessToken);

    return {
      accounts: response.accounts,
      name: response.name,
      email: response.email,
      defaultAccountId: response.accounts[0]?.accountId
    };
  }
}

/**
 * Simple token-based authentication (for testing with existing token)
 */
class SimpleAuth {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async authenticate() {
    return {
      accessToken: this.accessToken,
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000)
    };
  }
}

export { DocuSignAuth, SimpleAuth };
