# JWT Authentication Setup for Production

For production use, JWT (JSON Web Token) authentication is recommended over short-lived access tokens.

## Prerequisites

1. DocuSign Developer or Production account
2. An Integration Key (Client ID)
3. An RSA key pair
4. Admin consent for your application

## Step 1: Create an Integration Key

1. Log in to DocuSign Admin
2. Go to **Settings > Apps and Keys**
3. Click **Add App and Integration Key**
4. Give it a name (e.g., "VLV Click Agent")
5. Copy the **Integration Key** (Client ID)

## Step 2: Generate RSA Key Pair

In the Integration Key settings:

1. Click **Generate RSA Key Pair**
2. Download and save the private key as `private.key` in the project root
3. **Important:** This is the only time you can download the private key!

Or generate manually:

```bash
openssl genpkey -algorithm RSA -out private.key -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubkey -in private.key -out public.key
```

Then paste the public key in DocuSign Admin.

## Step 3: Add Redirect URI

Add this redirect URI to your Integration Key:
```
https://developers.docusign.com/platform/auth/consent
```

## Step 4: Grant Admin Consent

1. Run the agent: `npm start`
2. It will display a consent URL
3. Visit the URL and grant consent
4. You only need to do this once per account

## Step 5: Update .env

```env
DOCUSIGN_INTEGRATION_KEY=your-integration-key
DOCUSIGN_USER_ID=your-user-guid
DOCUSIGN_RSA_PRIVATE_KEY_PATH=./private.key
DOCUSIGN_ACCOUNT_ID=your-account-id
DOCUSIGN_ENV=production
```

## Finding Your User ID

1. Go to DocuSign Admin
2. Go to **Settings > Apps and Keys**
3. Under your user, find the **User ID** (a GUID)

## Security Best Practices

1. **Never commit private keys to git**
2. **Rotate keys periodically**
3. **Use environment variables in production**
4. **Limit scopes to only what's needed**

## Required Scopes

The agent needs these scopes:
- `signature` - Basic DocuSign access
- `click.manage` - Create and manage clickwraps
- `click.send` - Send clickwraps to users

## Troubleshooting

### "consent_required" Error

Visit the consent URL and grant access. You only need to do this once.

### "invalid_grant" Error

1. Check that your Integration Key is correct
2. Verify the User ID matches the account
3. Ensure the private key file is readable
4. Check that consent has been granted

### Token Expired

JWT tokens are automatically refreshed. If issues persist:
1. Regenerate your RSA key pair
2. Re-grant consent

## More Information

- [JWT Grant Authentication](https://developers.docusign.com/platform/auth/jwt/)
- [DocuSign Click API](https://developers.docusign.com/docs/click-api/)
