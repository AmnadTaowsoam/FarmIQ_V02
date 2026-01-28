# FarmIQ Administrator Guide

**Version**: 1.0.0
**Last Updated**: 2025-01-26
**Audience**: IT Administrators, Tenant Admins

---

## Table of Contents

- [Tenant Administration](#tenant-administration)
- [User Management](#user-management)
- [Device Management](#device-management)
- [System Configuration](#system-configuration)
- [Security & Compliance](#security--compliance)
- [Troubleshooting](#troubleshooting)

---

## Tenant Administration

### Creating a New Tenant

Tenants represent separate organizations or farms within FarmIQ.

1. Navigate to **Admin** > **Tenants**
2. Click **+ Create Tenant**
3. Enter tenant details:
   - **Tenant ID**: Unique identifier
   - **Tenant Name**: Organization name
   - **Contact Email**: Primary contact
   - **Plan**: Subscription plan
   - **Quotas**: Resource limits
4. Click **Create**

### Tenant Settings

Configure tenant-specific settings:

| Setting | Description |
|---------|-------------|
| **General** | Name, contact info, timezone |
| **Branding** | Logo, colors, custom domain |
| **Features** | Enabled modules, add-ons |
| **Quotas** | Users, devices, storage limits |
| **Billing** | Payment method, invoices |

### Billing & Usage

Monitor tenant billing and usage:

1. Go to **Admin** > **Tenants**
2. Select tenant
3. View:
   - Current plan
   - Usage statistics
   - Invoices
   - Payment history

---

## User Management

### Adding Users

1. Navigate to **Admin** > **Users**
2. Click **+ Add User**
3. Enter user information:
   - **Name**: Full name
   - **Email**: Email address (unique)
   - **Role**: Assign role
   - **Tenant**: Assign to tenant
4. Click **Save**
5. User receives invitation email

### Role Assignment

FarmIQ uses role-based access control (RBAC):

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access |
| **Tenant Admin** | Full tenant access |
| **Farm Manager** | Farm operations |
| **Operator** | Daily operations |
| **Viewer** | Read-only access |

### Custom Roles

Create custom roles for specific needs:

1. Go to **Admin** > **Roles**
2. Click **+ Create Role**
3. Define permissions:
   - Modules to access
   - Actions allowed
   - Data scope
4. Click **Save**

### SSO Configuration

Configure Single Sign-On for enterprise authentication:

#### SAML SSO

1. Go to **Admin** > **SSO Configuration**
2. Select **SAML**
3. Enter IdP details:
   - Identity Provider URL
   - SSO URL
   - Certificate
   - Entity ID
4. Map attributes:
   - Email → FarmIQ email
   - Name → FarmIQ name
5. Click **Save**

#### OIDC SSO

1. Go to **Admin** > **SSO Configuration**
2. Select **OIDC**
3. Enter provider details:
   - Discovery URL
   - Client ID
   - Client Secret
   - Scopes
4. Configure claims mapping
5. Click **Save**

### SCIM Setup

Automate user provisioning with SCIM:

1. Go to **Admin** > **SCIM**
2. Generate SCIM token
3. Configure SCIM endpoint in IdP:
   - Base URL: `https://api.farmiq.example.com/scim/v2`
   - Authentication: Bearer token
4. Test connection
5. Enable automatic sync

---

## Device Management

### Device Registration

Register new IoT devices and cameras:

1. Navigate to **Admin** > **Devices**
2. Click **+ Register Device**
3. Enter device details:
   - **Device ID**: Unique identifier
   - **Device Type**: Sensor, Camera, Gateway
   - **Model**: Device model
   - **Serial Number**: Manufacturer serial
   - **Tenant**: Assign to tenant
4. Click **Register**

### Device Configuration

Configure device settings:

#### Sensor Configuration

- **Sampling Rate**: Data collection frequency
- **Thresholds**: Alert triggers
- **Calibration**: Sensor calibration values
- **Firmware**: Current firmware version

#### Camera Configuration

- **Resolution**: Image quality
- **Frame Rate**: Capture frequency
- **Storage**: Local vs cloud storage
- **Detection Settings**: AI model parameters

### OTA Updates

Over-the-air firmware updates:

1. Go to **Admin** > **Device Updates**
2. Select firmware version
3. Choose devices to update:
   - All devices
   - By type
   - Specific devices
4. Schedule update:
   - Immediate
   - Scheduled time
   - Maintenance window
5. Click **Deploy**

### Device Monitoring

Monitor device health:

- **Online Status**: Connection status
- **Battery Level**: For battery-powered devices
- **Signal Strength**: Network quality
- **Data Quality**: Valid readings percentage
- **Last Update**: Time since last data

---

## System Configuration

### System Settings

Configure global system settings:

| Category | Settings |
|----------|----------|
| **General** | System name, timezone, language |
| **Email** | SMTP settings, templates |
| **SMS** | SMS provider, templates |
| **Storage** | S3 configuration, retention |
| **Database** | Connection pools, timeouts |

### Notification Configuration

Configure system-wide notifications:

1. Go to **Admin** > **Notifications**
2. Configure channels:
   - **Email**: SMTP settings, templates
   - **SMS**: Provider settings, templates
   - **Push**: Firebase/APNS configuration
3. Set notification rules:
   - Alert levels
   - Escalation paths
   - Quiet hours

### Backup Configuration

Configure automated backups:

1. Go to **Admin** > **Backups**
2. Configure:
   - **Schedule**: Daily, weekly, monthly
   - **Retention**: Keep for X days
   - **Destination**: S3, Azure, local
   - **Encryption**: Backup encryption
3. Click **Save**

### Logging Configuration

Configure system logging:

1. Go to **Admin** > **Logging**
2. Configure:
   - **Log Level**: DEBUG, INFO, WARN, ERROR
   - **Retention**: Keep logs for X days
   - **Export**: Send to external SIEM
3. Click **Save**

---

## Security & Compliance

### Security Settings

#### Password Policy

Configure password requirements:

- Minimum length
- Complexity requirements
- Expiration period
- History retention

#### Two-Factor Authentication

Enable 2FA for enhanced security:

1. Go to **Admin** > **Security**
2. Enable **Two-Factor Authentication**
3. Configure:
   - Required for: All users, Admins only
   - Methods: TOTP, SMS, Email
4. Click **Save**

#### Session Management

Configure session settings:

- Session timeout
- Concurrent sessions
- Remember me duration

### Audit Logging

Track all administrative actions:

1. Go to **Admin** > **Audit Log**
2. View:
   - User actions
   - System changes
   - Login attempts
   - API calls
3. Filter by:
   - Date range
   - User
   - Action type
   - Resource

### Data Protection

Configure data protection settings:

- **Encryption at Rest**: Enable/disable
- **Encryption in Transit**: TLS configuration
- **Data Masking**: Sensitive data masking
- **Data Retention**: Automatic deletion policies

### Compliance Reports

Generate compliance reports:

1. Go to **Admin** > **Compliance**
2. Select report type:
   - PDPA/GDPR compliance
   - Access logs
   - Data processing records
3. Generate and export

---

## Troubleshooting

### Common Issues

#### Tenant Cannot Access

**Symptoms**: Tenant users cannot log in or access resources

**Solutions**:
1. Check tenant status (active/suspended)
2. Verify user roles and permissions
3. Check SSO configuration
4. Review audit logs for errors

#### Device Not Connecting

**Symptoms**: Device shows offline or not sending data

**Solutions**:
1. Check device power and network
2. Verify device credentials
3. Check firewall rules
4. Review device logs

#### Performance Issues

**Symptoms**: Slow response times, timeouts

**Solutions**:
1. Check system resources
2. Review database performance
3. Check network latency
4. Review application logs

#### Backup Failures

**Symptoms**: Scheduled backups not completing

**Solutions**:
1. Check storage destination
2. Verify credentials
3. Review error logs
4. Test backup manually

### Diagnostic Tools

Use built-in diagnostics:

1. **System Health Check**
   - Go to **Admin** > **Diagnostics**
   - Run health check
   - Review results

2. **Log Analysis**
   - Go to **Admin** > **Logs**
   - Search for errors
   - Analyze patterns

3. **Performance Metrics**
   - Go to **Admin** > **Metrics**
   - View system performance
   - Identify bottlenecks

---

## Best Practices

### Administration

1. **Regular Backups**
   - Test restore procedures
   - Monitor backup success
   - Keep offsite copies

2. **Security**
   - Enable 2FA for admins
   - Regular password changes
   - Review audit logs

3. **Monitoring**
   - Set up alerts
   - Review dashboards
   - Proactive maintenance

4. **Documentation**
   - Document changes
   - Keep runbooks updated
   - Share knowledge

---

## Support

For administrator support:

- **Documentation**: [docs.farmiq.example.com/admin](https://docs.farmiq.example.com/admin)
- **Email**: admin-support@farmiq.example.com
- **Phone**: +66 2-XXX-XXXX (Option 1)
- **Emergency**: emergency@farmiq.example.com

---

**© 2025 FarmIQ. All rights reserved.**
