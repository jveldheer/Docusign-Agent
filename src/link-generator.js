/**
 * DocuSign Click Link Generator
 * Generates personalized clickwrap links for each member
 */

/**
 * Generate a unique client user ID for a member
 * This ID is used by DocuSign to identify who accepted the agreement
 * @param {Object} member - Member data
 * @returns {string} Unique client user ID
 */
function generateClientUserId(member) {
  // Use email as the primary identifier (guaranteed unique)
  // Sanitize for URL safety
  return encodeURIComponent(member.email.toLowerCase());
}

/**
 * Generate DocuSign Click embed parameters for a member
 * @param {Object} config - DocuSign Click configuration
 * @param {Object} member - Member data
 * @returns {Object} Embed parameters
 */
function generateEmbedParams(config, member) {
  const clientUserId = generateClientUserId(member);

  return {
    environment: config.environment || 'demo',
    accountId: config.accountId,
    clickwrapId: config.clickwrapId,
    clientUserId: clientUserId,
    // Additional user identification for audit trail
    clientUserEmail: member.email,
    clientUserFullName: `${member.firstName} ${member.lastName}`.trim()
  };
}

/**
 * Generate a hosted clickwrap URL for a member
 * Points to the GitHub Pages hosted agreement page
 * @param {Object} config - DocuSign Click configuration
 * @param {Object} member - Member data
 * @returns {string} Personalized clickwrap URL
 */
function generateClickwrapUrl(config, member) {
  const params = generateEmbedParams(config, member);

  // Use GitHub Pages hosted agreement page
  // Format: https://jveldheer.github.io/Docusign-Agent/agreement.html?params
  const baseUrl = config.landingPageUrl || 'https://jveldheer.github.io/Docusign-Agent/agreement.html';

  const queryParams = new URLSearchParams({
    uid: params.clientUserId,
    name: params.clientUserFullName,
    email: params.clientUserEmail
  });

  return `${baseUrl}?${queryParams}`;
}

/**
 * Generate a landing page URL that renders the clickwrap
 * This requires hosting a page with the DocuSign Click JS SDK
 * @param {Object} config - Configuration including landing page base URL
 * @param {Object} member - Member data
 * @returns {string} Landing page URL with parameters
 */
function generateLandingPageUrl(config, member) {
  if (!config.landingPageUrl) {
    // Fallback to direct clickwrap URL if no landing page configured
    return generateClickwrapUrl(config, member);
  }

  const params = generateEmbedParams(config, member);
  const queryParams = new URLSearchParams({
    uid: params.clientUserId,
    name: params.clientUserFullName,
    email: params.clientUserEmail
  });

  return `${config.landingPageUrl}?${queryParams}`;
}

/**
 * Generate the JavaScript embed code for a specific member
 * @param {Object} config - DocuSign Click configuration
 * @param {Object} member - Member data
 * @returns {string} JavaScript embed code
 */
function generateEmbedCode(config, member) {
  const params = generateEmbedParams(config, member);
  const sdkUrl = config.environment === 'production'
    ? 'https://www.docusign.net/clickapi/sdk/latest/docusign-click.js'
    : 'https://demo.docusign.net/clickapi/sdk/latest/docusign-click.js';

  return `<!-- DocuSign Click for ${member.firstName} ${member.lastName} -->
<div id="ds-clickwrap"></div>
<script src="${sdkUrl}"></script>
<script>
  docuSignClick.Clickwrap.render({
    environment: '${params.environment}',
    accountId: '${params.accountId}',
    clickwrapId: '${params.clickwrapId}',
    clientUserId: '${params.clientUserId}',
    clientUserEmail: '${params.clientUserEmail}',
    clientUserFullName: '${params.clientUserFullName}',
    onAgreed: function(agreementData) {
      console.log('Agreement accepted:', agreementData);
      // Redirect or show confirmation
    },
    onDeclined: function() {
      console.log('Agreement declined');
    },
    onError: function(error) {
      console.error('Clickwrap error:', error);
    }
  }, '#ds-clickwrap');
</script>`;
}

/**
 * Generate links for all members
 * @param {Object} config - DocuSign Click configuration
 * @param {Array} members - Array of member objects
 * @returns {Array} Array of {member, link, embedCode} objects
 */
function generateAllLinks(config, members) {
  return members.map(member => ({
    member,
    link: generateLandingPageUrl(config, member),
    directLink: generateClickwrapUrl(config, member),
    embedCode: generateEmbedCode(config, member),
    clientUserId: generateClientUserId(member)
  }));
}

/**
 * Export links to a CSV for reference
 * @param {Array} memberLinks - Array from generateAllLinks
 * @returns {string} CSV content
 */
function exportLinksToCSV(memberLinks) {
  const headers = ['Email', 'First Name', 'Last Name', 'Client User ID', 'DocuSign Link'];
  const rows = memberLinks.map(ml => [
    ml.member.email,
    ml.member.firstName,
    ml.member.lastName,
    ml.clientUserId,
    ml.directLink
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

export {
  generateClientUserId,
  generateEmbedParams,
  generateClickwrapUrl,
  generateLandingPageUrl,
  generateEmbedCode,
  generateAllLinks,
  exportLinksToCSV
};
