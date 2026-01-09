/**
 * DocuSign JWT Authentication
 * Handles JWT token generation for DocuSign API
 */

import fs from 'fs';
import crypto from 'crypto';

/**
 * Generate a JWT access token for DocuSign
 */
async function getJWTAccessToken(config) {
  const {
    integrationKey,
    userId,
    privateKeyPath,
    environment = 'demo'
  } = config;

  // Read private key
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // Determine auth server based on environment
  const authServer = environment === 'production'
    ? 'account.docusign.com'
    : 'account-d.docusign.com';

  // Create JWT header
  const header = {
    typ: 'JWT',
    alg: 'RS256'
  };

  // Create JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: authServer,
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'signature click.manage click.send'
  };

  // Encode header and payload
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // Create signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  // Complete JWT
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenUrl = `https://${authServer}/oauth/token`;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Token response:', responseText);
    throw new Error(`Failed to get access token: ${response.status} - ${responseText}`);
  }

  const tokenData = JSON.parse(responseText);
  const accessToken = tokenData.access_token;

  // Get user info to find the correct base URI
  const authServer2 = environment === 'production'
    ? 'account.docusign.com'
    : 'account-d.docusign.com';

  const userInfoResponse = await fetch(`https://${authServer2}/oauth/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (userInfoResponse.ok) {
    const userInfo = await userInfoResponse.json();
    // Find the account and get its base_uri
    if (userInfo.accounts && userInfo.accounts.length > 0) {
      const account = userInfo.accounts[0];
      return {
        accessToken,
        baseUri: account.base_uri,
        accountId: account.account_id
      };
    }
  }

  // Fallback if userinfo fails
  return {
    accessToken,
    baseUri: environment === 'production'
      ? 'https://na.docusign.net'
      : 'https://demo.na.docusign.net',
    accountId: null
  };
}

export { getJWTAccessToken };
