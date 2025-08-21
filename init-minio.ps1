# Initializes MinIO by creating the S3 bucket specified in .env
# Uses a single mc container with a shell entrypoint to execute multiple commands.
# Idempotent: safe to run multiple times.

Write-Host "Reading .env ..."

$envPath = Join-Path (Get-Location) ".env"
if (!(Test-Path $envPath)) {
  Write-Error ".env not found in current directory. Please copy the provided .env here."
  exit 1
}

# Parse .env into a hashtable
$vars = @{}
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#")) {
    $kv = $line -split "=", 2
    if ($kv.Length -eq 2) {
      $key = $kv[0].Trim()
      $val = $kv[1].Trim()
      $vars[$key] = $val
    }
  }
}

# Defaults if not present
$MINIO_PORT = $vars["MINIO_PORT"]; if (-not $MINIO_PORT) { $MINIO_PORT = "19000" }
$MINIO_ROOT_USER = $vars["MINIO_ROOT_USER"]; if (-not $MINIO_ROOT_USER) { $MINIO_ROOT_USER = "minioadmin" }
$MINIO_ROOT_PASSWORD = $vars["MINIO_ROOT_PASSWORD"]; if (-not $MINIO_ROOT_PASSWORD) { $MINIO_ROOT_PASSWORD = "minioadmin" }
$S3_BUCKET = $vars["S3_BUCKET"]; if (-not $S3_BUCKET) { $S3_BUCKET = "xmlsvc" }

$endpoint = "http://host.docker.internal:$MINIO_PORT"
Write-Host "Using MinIO endpoint: $endpoint"
Write-Host "Bucket to create: $S3_BUCKET"

# Wait until MinIO is reachable (optional but helpful)
$healthUrl = "$endpoint/minio/health/ready"
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
  try {
    $resp = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
      Write-Host "MinIO is ready."
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
  $attempt++
}
if ($attempt -ge $maxAttempts) {
  Write-Warning "MinIO health endpoint did not become ready, proceeding anyway..."
}

# Check Docker availability
try {
  docker version | Out-Null
} catch {
  Write-Error "Docker is not available in PATH."
  exit 1
}

$mcImage = "minio/mc:latest"

# Pull image (if not present)
docker pull $mcImage | Out-Null

# Run a single container with a shell to execute multiple mc commands.
# We use --entrypoint /bin/sh so 'sh -c' works. The default entrypoint is 'mc',
# so without overriding, 'sh' would be treated as an mc subcommand.
$cmd = @"
mc alias set local $endpoint $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD && \
mc mb --ignore-existing local/$S3_BUCKET && \
mc ls local/$S3_BUCKET
"@

Write-Host "Configuring alias and creating bucket (idempotent) ..."
docker run --rm `
  --entrypoint /bin/sh `
  $mcImage `
  -c $cmd | Write-Output

Write-Host "MinIO initialization completed."
