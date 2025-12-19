#!/bin/bash
set -euo pipefail

# Function for cleanup
cleanup() {
  echo "Cleaning up temporary directory..."
  rm -rf /tmp/temp_repo
}

# Set trap to ensure cleanup happens even on failure
trap cleanup EXIT

# Validate input parameters
if [ $# -ne 4 ]; then
  echo "Error: Script requires exactly 4 parameters"
  echo "Usage: $0 <environment> <image-tag> <image-repository> <repo-url>"
  exit 1
fi

ENVIRONMENT="$1"
IMAGE_TAG="$2"
IMAGE_REPOSITORY="$3"
REPO_URL="$4"

echo "Starting K8s manifest update process..."
echo "Environment: $ENVIRONMENT"
echo "Image Tag: $IMAGE_TAG"
echo "Image Repository: $IMAGE_REPOSITORY"
echo "Repository URL: $REPO_URL"

# Clean up any existing temp directory before starting
echo "Cleaning up any existing temporary directory..."
rm -rf /tmp/temp_repo

echo "Cloning repository: $REPO_URL"
# Clone the git repository into the /tmp directory
if ! git clone "$REPO_URL" /tmp/temp_repo; then
  echo "Error: Failed to clone repository"
  exit 1
fi

# Navigate into the cloned repository directory
cd /tmp/temp_repo || {
  echo "Error: Failed to navigate to cloned repository"
  exit 1
}

cd kube || {
  echo "Error: 'kube' directory not found"
  exit 1
}

echo "Contents of kube directory:"
ls -la

# Navigate to environment directory
if [ ! -d "$ENVIRONMENT" ]; then
  echo "Error: Environment directory '$ENVIRONMENT' not found"
  exit 1
fi

cd "$ENVIRONMENT" || {
  echo "Error: Failed to navigate to environment directory '$ENVIRONMENT'"
  exit 1
}

echo "Contents of $ENVIRONMENT directory:"
ls -la

# Check if deployment file exists
DEPLOYMENT_FILE="deployment-$ENVIRONMENT.yaml"
if [ ! -f "$DEPLOYMENT_FILE" ]; then
  echo "Error: Deployment file '$DEPLOYMENT_FILE' not found"
  exit 1
fi

echo "Updating deployment file: $DEPLOYMENT_FILE"
echo "Before update:"
grep -n "$IMAGE_REPOSITORY" "$DEPLOYMENT_FILE" || echo "No matching image repository found"

# Make changes to the Kubernetes manifest file(s)
if ! sed -i "s|$IMAGE_REPOSITORY:.*|$IMAGE_REPOSITORY:$IMAGE_TAG|g" "$DEPLOYMENT_FILE"; then
  echo "Error: Failed to update deployment file"
  exit 1
fi

echo "After update:"
grep -n "$IMAGE_REPOSITORY" "$DEPLOYMENT_FILE" || {
  echo "Error: Image repository not found after update - sed command may have failed"
  exit 1
}

# Configure git user
git config user.email "pharanyuc@betagro.com" || {
  echo "Error: Failed to set git user email"
  exit 1
}
git config user.name "pharanyuc" || {
  echo "Error: Failed to set git user name"
  exit 1
}

# Check if there are any changes to commit
if git diff --quiet && git diff --staged --quiet; then
  echo "No changes detected in manifest files"
  exit 0
fi

echo "Adding modified files to git..."
# Add the modified files
if ! git add .; then
  echo "Error: Failed to add files to git"
  exit 1
fi

echo "Committing changes..."
# Commit the changes
if ! git commit -m "Update Kubernetes manifest - Environment: $ENVIRONMENT, Tag: $IMAGE_TAG"; then
  echo "Error: Failed to commit changes"
  exit 1
fi

echo "Pushing changes to repository..."
# Push the changes back to the repository
if ! git push; then
  echo "Error: Failed to push changes to repository"
  exit 1
fi

echo "Successfully updated K8s manifest and pushed changes!"
