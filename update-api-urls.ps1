# PowerShell script to replace localhost URLs with relative paths
$files = Get-ChildItem -Path "frontend\public\js" -Filter "*.js" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $updated = $content -replace 'http://localhost:3010/api/', '/api/'
    Set-Content -Path $file.FullName -Value $updated
    Write-Host "Updated: $($file.Name)"
}

Write-Host "`nAll JavaScript files have been updated!"