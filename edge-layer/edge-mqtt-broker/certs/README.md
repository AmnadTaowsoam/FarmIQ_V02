# MQTT TLS Certificates

## Generate Development Certificates

```bash
# Create CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=FarmIQ MQTT CA"

# Create Server Certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=edge-mqtt-broker"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256
```

## Production Certificates

Use cert-manager or your CA to generate production certificates.
Mount certificates at: `/mosquitto/config/certs/`

## Certificate Files

- `ca.crt` - Certificate Authority certificate
- `server.crt` - Server certificate
- `server.key` - Server private key (keep secure!)

## Mosquitto Configuration

The certificates are referenced in `mosquitto.prod.conf`:

```conf
listener 1883
protocol mqtt
cafile /mosquitto/config/certs/ca.crt
certfile /mosquitto/config/certs/server.crt
keyfile /mosquitto/config/certs/server.key
```

## Security Notes

- Never commit certificates to version control
- Use strong key lengths (2048+ bits)
- Set appropriate expiration (1 year for dev, shorter for production rotation)
- Rotate certificates regularly
