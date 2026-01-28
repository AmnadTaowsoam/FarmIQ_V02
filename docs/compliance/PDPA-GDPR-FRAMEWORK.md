# FarmIQ Compliance Framework (PDPA/GDPR)

## 1. Overview
This framework outlines how FarmIQ adheres to the Personal Data Protection Act (PDPA) of Thailand and the General Data Protection Regulation (GDPR) of the EU.

## 2. Data Classification
All data in FarmIQ is classified into three levels:
- **Public**: Non-sensitive data (e.g., generic weather data).
- **Internal**: Business operations data (e.g., device logs, aggregate stats).
- **Confidential/PII**: Personally Identifiable Information (e.g., User emails, phone numbers, farm locations potentially identifiable).

## 3. PII Detection & Governance
- **Automated Detection**: CI/CD pipelines will scan for PII patterns (credit cards, national IDs) in logs and code.
- **Masking**: All logs must mask PII. Database fields containing PII must be encrypted at rest if highly sensitive.

## 4. Consent Management
- **Collection**: Users must explicitly consent to data collection during onboarding.
- **Storage**: Consents are stored in the `UserConsent` table with versioning.
- **Revocation**: Users can revoke consent via the settings menu.

## 5. Data Subject Rights
- **Right to Access**: Users can request a copy of their data via the "Download My Data" feature.
- **Right to Erasure (Right to be Forgotten)**:
    - Users can delete their account.
    - Software triggers a "Soft Delete" initially (30 days retention).
    - Hard delete runs after 30 days via `edge-retention-janitor` and cloud equivalents.
- **Right to Rectification**: Users can edit profile data at any time.

## 6. Data Retention Policy
- **Telemetry Data**: 90 days hot storage, 1 year cold storage, then deleted.
- **User Accounts**: Indefinite until deletion request.
- **Logs**: 30 days.

## 7. Breach Notification
In case of a data breach, FarmIQ will notify affected users within 72 hours of discovery.
