# DocuSign Click Agent

A Node.js agent for creating and managing DocuSign Click agreements for the Veldheer Lineman Vault (VLV) participation agreement.

## What is DocuSign Click?

DocuSign Click provides clickwrap agreements with a simple "I agree" button. Perfect for:
- Terms of service
- Liability waivers
- Participation agreements

Features:
- Single-tap acceptance
- Full audit trail
- Version control
- Completion records

**Important:** Click is for simple click-to-agree flows. It cannot collect custom fields or do multi-signer routing.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure DocuSign

Run the setup wizard:

```bash
npm run setup
```

Or manually create a `.env` file:

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Create the Clickwrap

```bash
npm run create-clickwrap
```

This will:
1. Generate the PDF agreement
2. Create the clickwrap in DocuSign
3. Publish it
4. Provide embed code for your website

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Interactive setup wizard |
| `npm run create-clickwrap` | Create VLV participation agreement |
| `npm run generate-pdf` | Generate PDF only |
| `npm start` | Interactive agent menu |

## Getting DocuSign Credentials

### Account ID

1. Go to [DocuSign Admin](https://admindemo.docusign.com/) (demo) or [DocuSign Admin](https://admin.docusign.com/) (production)
2. Navigate to Settings > Apps and Keys
3. Copy the "API Account ID"

### Access Token

For testing/demo:
1. Go to [DocuSign Developer Tools](https://developers.docusign.com/tools/api-access-token)
2. Select "Click" API
3. Generate and copy the token

Note: Access tokens expire after ~8 hours. For production, set up JWT authentication.

## The VLV Agreement

This agent creates a clickwrap for:

**Dermadventures LLC dba Veldheer Lineman Vault Participation Agreement**
- Version: 2026 01
- Button text: "I agree"

The agreement covers:
- Training, nutrition, and supplement guidance
- Risk acknowledgment
- Liability waiver
- Minor participant provisions

## Embedding on Your Website

After creating the clickwrap, you'll receive embed code like this:

```html
<div id="ds-clickwrap"></div>
<script src="https://demo.docusign.net/clickapi/sdk/latest/docusign-click.js"></script>
<script>
  docuSignClick.Clickwrap.render({
    environment: 'demo',
    accountId: 'YOUR_ACCOUNT_ID',
    clickwrapId: 'YOUR_CLICKWRAP_ID',
    clientUserId: 'unique-user-id-here',
  }, '#ds-clickwrap');
</script>
```

Replace `clientUserId` with each user's unique identifier.

## DM Template for Members

```
Action required to keep workout access.

Please open this link and tap I agree.

[YOUR CLICKWRAP LINK]

If you are under 18, do not tap I agree. Forward this message to
your parent or legal guardian and have them tap I agree for you.

After you finish, reply DONE in this thread.
```

## Project Structure

```
├── src/
│   ├── index.js              # Interactive CLI agent
│   ├── setup.js              # Setup wizard
│   ├── create-clickwrap.js   # Main clickwrap creation script
│   ├── generate-pdf.js       # PDF generator
│   ├── docusign-click-client.js  # DocuSign Click API client
│   └── auth.js               # Authentication module
├── agreements/
│   ├── vlv-participation-agreement.txt  # Agreement text
│   └── *.pdf                 # Generated PDFs
├── docs/
│   └── (documentation)
├── .env.example              # Environment template
├── .env                      # Your credentials (gitignored)
└── package.json
```

## Security Notes

- Never commit `.env` or private keys to git
- Access tokens are short-lived (~8 hours)
- Use JWT authentication for production
- The `.gitignore` file excludes sensitive files

## Support

For DocuSign API questions:
- [DocuSign Developer Center](https://developers.docusign.com/)
- [Click API Documentation](https://developers.docusign.com/docs/click-api/)

## License

MIT
