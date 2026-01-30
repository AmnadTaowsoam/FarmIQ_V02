# External Secrets Operator Deployment

This directory contains Kubernetes manifests for deploying the External Secrets Operator (ESO) to manage secrets from Google Cloud Secret Manager (GCP Secret Manager).

## Prerequisites

1. GKE cluster with Workload Identity configured
2. GCP Secret Manager enabled
3. kubectl CLI installed and configured
4. Appropriate IAM permissions

## Installation

```bash
# Install ESO using Helm
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace farmiq-cloud-prod \
  --create-namespace \
  --version 1.13.5

# Wait for CRDs to be established
kubectl wait --for condition=established crd/externalsecrets.io \
  --namespace farmiq-cloud-prod \
  --timeout 300s
```

## ClusterSecretStore

The `ClusterSecretStore` allows ESO to sync secrets from GCP Secret Manager to Kubernetes secrets.

## SecretStore

The `SecretStore` is configured to sync secrets from GCP Secret Manager.

## ExternalSecret

`ExternalSecret` resources define how secrets are synced from external sources (GCP Secret Manager, AWS Secrets Manager, Azure Key Vault, etc.).

## Deployment Files

- `secret-store.yaml` - ClusterSecretStore configuration
- `external-secret.yaml` - Example ExternalSecret for cloud-api-gateway-bff
- `external-secret-billing.yaml` - Example ExternalSecret for cloud-billing-service
- `external-secret-identity.yaml` - Example ExternalSecret for cloud-identity-access

## Usage

1. Create a `ClusterSecretStore`:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: farmiq-gcp-secret-store
spec:
  serviceAccountRef:
    name: farmiq-prod-wip
    namespace: farmiq-cloud-prod
```

2. Create `ExternalSecret` for a service:
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cloud-api-gateway-bff-jwt-secret
  namespace: farmiq-cloud-prod
spec:
  secretStoreRef:
    name: farmiq-gcp-secret-store
  refreshInterval: 1h
  secretKey: farmiq-prod-jwt-secret
  target:
    name: jwt-secret
    creationPolicy: Owner
  deletionPolicy: Retain
  data:
    - remoteRef:
        secretKey: farmiq-prod-jwt-secret
        version: latest
```

## Secret Keys Required

The following secret keys must be created in GCP Secret Manager before deploying:

- `farmiq-prod-jwt-secret` - JWT secret for cloud-api-gateway-bff
- `farmiq-prod-db-password` - Database password for cloud-api-gateway-bff
- `farmiq-prod-stripe-key` - Stripe API key for cloud-billing-service
- `farmiq-prod-llm-api-key` - LLM API key for cloud-llm-insights-service
- `farmiq-prod-media-store-key` - Media store access key

## Environment Variables

Set the following environment variables before applying the manifests:

```bash
export PROJECT_ID=farmiq-prod
export CLUSTER_LOCATION=asia-southeast1
export CLUSTER_NAME=farmiq-prod
export REGION=asia-southeast1
```

## Apply Manifests

```bash
kubectl apply -f k8s/external-secrets-operator/secret-store.yaml
kubectl apply -f k8s/external-secrets-operator/external-secret-bff.yaml
kubectl apply -f k8s/external-secrets-operator/external-secret-billing.yaml
kubectl apply -f k8s/external-secrets-operator/external-secret-identity.yaml
```

## Verification

Verify secrets are being synced:
```bash
kubectl get externalsecrets -n farmiq-cloud-prod
kubectl get externalsecrets -n farmiq-cloud-prod cloud-api-gateway-bff-jwt-secret
```

## Security Notes

- Use Workload Identity for authentication
- Apply least privilege principle
- Enable secret rotation
- Monitor secret access logs
