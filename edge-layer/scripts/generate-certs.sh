#!/bin/bash

# Directory to store certificates
CERT_DIR="../edge-mqtt-broker/certs"
mkdir -p $CERT_DIR

# Clean up old certs
rm -f $CERT_DIR/*.crt $CERT_DIR/*.key $CERT_DIR/*.srl $CERT_DIR/*.csr

echo "Generating Root CA..."
# Generate Root CA Key
openssl genrsa -out $CERT_DIR/ca.key 2048

# Generate Root CA Certificate
openssl req -x509 -new -nodes -key $CERT_DIR/ca.key -sha256 -days 3650 -out $CERT_DIR/ca.crt -subj "/CN=FarmIQ Root CA/O=FarmIQ/C=TH"

echo "Generating Server Certificate..."
# Generate Server Key
openssl genrsa -out $CERT_DIR/server.key 2048

# Generate Server CSR
openssl req -new -key $CERT_DIR/server.key -out $CERT_DIR/server.csr -subj "/CN=edge-mqtt-broker/O=FarmIQ/C=TH"

# Generate Server Certificate signed by CA
openssl x509 -req -in $CERT_DIR/server.csr -CA $CERT_DIR/ca.crt -CAkey $CERT_DIR/ca.key -CAcreateserial -out $CERT_DIR/server.crt -days 365 -sha256

echo "Generating Client Certificate (Test Device)..."
# Generate Client Key
openssl genrsa -out $CERT_DIR/client.key 2048

# Generate Client CSR
openssl req -new -key $CERT_DIR/client.key -out $CERT_DIR/client.csr -subj "/CN=test-device-01/O=FarmIQ/C=TH"

# Generate Client Certificate signed by CA
openssl x509 -req -in $CERT_DIR/client.csr -CA $CERT_DIR/ca.crt -CAkey $CERT_DIR/ca.key -CAcreateserial -out $CERT_DIR/client.crt -days 365 -sha256

# Set permissions
chmod 644 $CERT_DIR/*.crt
chmod 600 $CERT_DIR/*.key

echo "Certificates generated in $CERT_DIR"
ls -l $CERT_DIR
