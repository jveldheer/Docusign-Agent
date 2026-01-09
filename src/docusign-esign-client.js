/**
 * DocuSign eSignature Client
 * Sends documents for signature via DocuSign's email system
 */

import fs from 'fs';
import path from 'path';

class DocuSignESignClient {
  constructor(config) {
    this.accountId = config.accountId;
    this.accessToken = config.accessToken;
    this.basePath = config.basePath || 'https://demo.na.docusign.net/restapi';
  }

  /**
   * Get the base path for the environment
   */
  static getBasePath(environment) {
    return environment === 'production'
      ? 'https://na.docusign.net/restapi'
      : 'https://demo.na.docusign.net/restapi';
  }

  /**
   * Make an API request
   */
  async request(method, endpoint, body = null) {
    const url = `${this.basePath}/v2.1/accounts/${this.accountId}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    if (!response.ok) {
      const error = new Error(`DocuSign API error: ${response.status}`);
      error.status = response.status;
      error.body = text;
      throw error;
    }

    return text ? JSON.parse(text) : null;
  }

  /**
   * Send an envelope (document for signature) to a single recipient
   * @param {Object} options - Envelope options
   * @returns {Promise<Object>} Envelope result with envelopeId
   */
  async sendEnvelope(options) {
    const {
      signerEmail,
      signerName,
      documentPath,
      documentName,
      emailSubject,
      emailBody
    } = options;

    // Read the PDF document
    const documentBytes = fs.readFileSync(documentPath);
    const documentBase64 = documentBytes.toString('base64');

    // Create the envelope definition
    const envelopeDefinition = {
      emailSubject: emailSubject || 'Please sign this document',
      emailBlurb: emailBody || 'Please review and sign this document.',
      documents: [
        {
          documentBase64: documentBase64,
          name: documentName || 'Agreement',
          fileExtension: 'pdf',
          documentId: '1'
        }
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  anchorString: '/sig/',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '0'
                }
              ],
              dateSignedTabs: [
                {
                  anchorString: '/date/',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '0'
                }
              ]
            }
          }
        ]
      },
      status: 'sent' // 'sent' to send immediately, 'created' to save as draft
    };

    const result = await this.request('POST', '/envelopes', envelopeDefinition);

    return {
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      uri: result.uri
    };
  }

  /**
   * Send envelope with signature at fixed position (no anchor tags needed)
   */
  async sendEnvelopeWithFixedPosition(options) {
    const {
      signerEmail,
      signerName,
      documentPath,
      documentName,
      emailSubject,
      emailBody,
      signaturePageNumber = 1,
      signatureX = 100,
      signatureY = 700
    } = options;

    // Read the PDF document
    const documentBytes = fs.readFileSync(documentPath);
    const documentBase64 = documentBytes.toString('base64');

    // Create the envelope definition with fixed position signature
    const envelopeDefinition = {
      emailSubject: emailSubject || 'Please sign this document',
      emailBlurb: emailBody || 'Please review and sign this document.',
      documents: [
        {
          documentBase64: documentBase64,
          name: documentName || 'Agreement',
          fileExtension: 'pdf',
          documentId: '1'
        }
      ],
      recipients: {
        signers: [
          {
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: String(signaturePageNumber),
                  xPosition: String(signatureX),
                  yPosition: String(signatureY)
                }
              ]
            }
          }
        ]
      },
      status: 'sent'
    };

    const result = await this.request('POST', '/envelopes', envelopeDefinition);

    return {
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      uri: result.uri
    };
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId) {
    return this.request('GET', `/envelopes/${envelopeId}`);
  }

  /**
   * List recent envelopes
   */
  async listEnvelopes(options = {}) {
    const { fromDate, status } = options;
    let query = '?from_date=' + (fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (status) {
      query += `&status=${status}`;
    }
    return this.request('GET', `/envelopes${query}`);
  }
}

export { DocuSignESignClient };
