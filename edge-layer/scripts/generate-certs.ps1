# Directory to store certificates
$CertDir = "../edge-mqtt-broker/certs"
if (!(Test-Path -Path $CertDir)) {
    New-Item -ItemType Directory -Path $CertDir | Out-Null
}

# Clean up old certs
Remove-Item -Path "$CertDir/*.crt", "$CertDir/*.key", "$CertDir/*.srl", "$CertDir/*.csr" -ErrorAction SilentlyContinue

Write-Host "Generating Root CA..."
# Generate Root CA Key
openssl genrsa -out "$CertDir/ca.key" 2048

# Generate Root CA Certificate
openssl req -x509 -new -nodes -key "$CertDir/ca.key" -sha256 -days 3650 -out "$CertDir/ca.crt" -subj "/CN=FarmIQ Root CA/O=FarmIQ/C=TH"

Write-Host "Generating Server Certificate..."
# Generate Server Key
openssl genrsa -out "$CertDir/server.key" 2048

# Generate Server CSR
openssl req -new -key "$CertDir/server.key" -out "$CertDir/server.csr" -subj "/CN=edge-mqtt-broker/O=FarmIQ/C=TH"

# Generate Server Certificate signed by CA
openssl x509 -req -in "$CertDir/server.csr" -CA "$CertDir/ca.crt" -CAkey "$CertDir/ca.key" -CAcreateserial -out "$CertDir/server.crt" -days 365 -sha256

Write-Host "Generating Client Certificate (Test Device)..."
# Generate Client Key
openssl genrsa -out "$CertDir/client.key" 2048

# Generate Client CSR
openssl req -new -key "$CertDir/client.key" -out "$CertDir/client.csr" -subj "/CN=test-device-01/O=FarmIQ/C=TH"

# Generate Client Certificate signed by CA
openssl x509 -req -in "$CertDir/client.csr" -CA "$CertDir/ca.crt" -CAkey "$CertDir/ca.key" -CAcreateserial -out "$CertDir/client.crt" -days 365 -sha256

Write-Host "Certificates generated in $CertDir"
Get-ChildItem -Path $CertDir
