# DocuSign Click Agent

A Node.js agent for creating and managing DocuSign Click agreements for the Veldheer Lineman Vault (VLV) participation agreement. Includes automated sending via Mighty Networks DMs and Gmail.

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

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Create the Clickwrap

```bash
npm run create-clickwrap
```

### 4. Add Member Data

Place your Mighty Networks member export files in the `data/` directory:
- `plan_Veldheer_Lineman_Vault_Monthly_Plan_members_*.xlsx`
- `plan__50_Off_Annual_Plan_Veldheer_Lineman_Vault_members_*.xlsx`

### 5. Send to All Members

```bash
npm run send-agreements
```

### 6. Track Responses

```bash
npm run check-responses
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Interactive setup wizard |
| `npm run create-clickwrap` | Create VLV clickwrap in DocuSign |
| `npm run send-agreements` | Send to all active members (DM + Email) |
| `npm run check-responses` | Check who has accepted |
| `npm run generate-pdf` | Generate PDF only |
| `npm start` | Interactive agent menu |

## Configuration

Create a `.env` file with:

```env
# DocuSign Click
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_ACCESS_TOKEN=your_access_token
DOCUSIGN_CLICKWRAP_ID=your_clickwrap_id
DOCUSIGN_ENV=demo

# Mighty Networks
MIGHTY_NETWORKS_API_KEY=your_api_key
MIGHTY_NETWORKS_NETWORK_ID=your_network_id

# Gmail
GMAIL_EMAIL=your_email@gmail.com
GMAIL_PASSWORD=your_app_password
```

## What Gets Sent

### Direct Message (Mighty Networks)
```
The VLV has updated its training guidelines please accept the updates
in the following link.

[personalized DocuSign link]

If you are under 18, do not tap I agree. Forward this message to your
parent or legal guardian and have them tap I agree for you.

After you finish, please reply DONE to this message.
```

### Email
- **Subject:** VLV Action Required
- **Body:** Personalized email with HTML formatting and DocuSign link

## Tracking & Audit Trail

The system tracks:
- Who was sent a DM and when
- Who was sent an email and when
- Who has accepted the agreement
- Timestamp of acceptance

DocuSign Click provides legal audit trail including:
- IP address of signer
- Timestamp
- Document version accepted
- User identification

Run `npm run check-responses` to generate reports.

## Project Structure

```
├── src/
│   ├── send-agreements.js    # Main send script
│   ├── check-responses.js    # Response checker
│   ├── member-reader.js      # Excel file parser
│   ├── mighty-networks-client.js  # Mighty Networks API
│   ├── email-sender.js       # Gmail sender
│   ├── link-generator.js     # Personalized links
│   ├── response-tracker.js   # Tracking system
│   ├── create-clickwrap.js   # DocuSign setup
│   └── docusign-click-client.js   # DocuSign API
├── data/
│   ├── *.xlsx               # Member export files
│   ├── tracking.json        # Tracking database
│   └── tracking-report.csv  # Export reports
├── agreements/
│   └── *.pdf               # Agreement PDFs
└── .env                    # Your credentials
```

## Gmail Setup

If using Gmail with 2-Factor Authentication:
1. Go to https://myaccount.google.com/apppasswords
2. Generate an App Password for "Mail"
3. Use that password in your `.env` file

## Security Notes

- Never commit `.env` to git
- Access tokens expire after ~8 hours
- Use App Passwords for Gmail
- Member data files are gitignored

## The VLV Agreement

**Dermadventures LLC dba Veldheer Lineman Vault Participation Agreement**
- Version: 2026 01
- Covers: Training, nutrition, supplements, liability waiver
- Minor provisions included

## License

MIT
