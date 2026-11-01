$chunks = Get-ChildItem "c:\Users\user\Downloads\canal\cloudflare-calling-app\sql_chunks\chunk_*.sql" | Sort-Object Name

# Skip chunk_01 since it already uploaded
$chunksToUpload = $chunks | Where-Object { $_.Name -ne "chunk_01.sql" }

Write-Host "Starting upload of $($chunksToUpload.Count) chunks to Cloudflare D1..."

$total = $chunksToUpload.Count
$current = 0

foreach ($file in $chunksToUpload) {
    $current++
    $percent = [math]::Round(($current / $total) * 100)
    Write-Host "[$current / $total - $percent%] Uploading $($file.Name) ($([math]::Round($file.Length/1KB)) KB)..." -NoNewline
    
    $output = npx wrangler d1 execute canal-calling-db --remote "--file=$($file.FullName)" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host $output
        break
    }
}

Write-Host "Done! Fetching final count from database..."
npx wrangler d1 execute canal-calling-db --remote --command="SELECT count(*) as total_subscribers FROM contacts;"

