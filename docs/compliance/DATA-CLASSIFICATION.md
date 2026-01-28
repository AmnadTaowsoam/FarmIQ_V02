# Data Classification Schema

| Data Type | Classification | Examples | Handling Requirements |
|-----------|----------------|----------|-----------------------|
| **User Profile** | Confidential (PII) | Email, Phone, First Name, Last Name | Encrypted in transit, Access Control, Consent Required |
| **Farm Location** | Confidential (PII) | GPS Coordinates, Address | Encrypted in transit, Restricted Access |
| **Device ID** | Internal | MAC Address, Serial Number | Authenticated Access Only |
| **Telemetry** | Internal | Temperature, Humidity, Weight | Retention Policy Applied |
| **Device Logs** | Internal | System Logs, Error Messages | Mask PII before logging |
| **Public Reports** | Public | Aggregated National Stats | No restrictions |

## Handling Rules
1. **Confidential**: NEVER log these values in plain text. Use UUID references instead.
2. **Internal**: Accessible by authenticated users within the tenant.
3. **Public**: Open to public API if enabled.
