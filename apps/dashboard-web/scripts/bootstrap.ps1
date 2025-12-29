$minNodeMajor = 18
$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt $minNodeMajor) {
  Write-Error "Node.js $minNodeMajor+ is required. Found v$(node -v)."
  exit 1
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  Write-Error "corepack not found; please install Node.js with Corepack support."
  exit 1
}

corepack enable | Out-Null

Write-Host "Installing dependencies with retry-safe settings..."
pnpm install

Write-Host ""
Write-Host "Next steps:"
Write-Host "  pnpm dev"
Write-Host "  open http://localhost:5142"
