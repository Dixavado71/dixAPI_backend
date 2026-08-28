# Monitor de logs do bot em tempo real
# Uso: .\monitor-bot-logs.ps1 [segundos]
$duration = if ($args[0]) { [int]$args[0] } else { 120 }
$deploy = "660cb070-647a-441a-855d-18981c4786dd"
$patterns = "bot: resposta enviada|bot: falha|bot: trigger|bot respondeu|bot nao|status de entrega|webhook: MESSAGES|webhook: evento recebido|Error occurred|BadRequest|556195765719"
$seen = @{}
$start = Get-Date
Write-Host "=== Monitorando logs do bot por $duration segundos ===" -ForegroundColor Yellow
while (((Get-Date) - $start).TotalSeconds -lt $duration) {
  $logs = railway logs --deployment $deploy --lines 200 2>&1 | Out-String
  $lines = $logs -split "`n" | Where-Object { $_ -match $patterns }
  foreach ($line in $lines) {
    $key = $line.Substring(0, [Math]::Min(150, $line.Length))
    if (-not $seen.ContainsKey($key)) {
      $seen[$key] = $true
      $clean = $line -replace '"headers":\{.*?\},"res"', '"res"' -replace '"authorization":"Bearer [^"]+"', '"auth":"***"'
      Write-Host ($clean.Substring(0, [Math]::Min(300, $clean.Length))) -ForegroundColor Cyan
    }
  }
  Start-Sleep -Seconds 5
}
Write-Host "=== Monitoramento encerrado ===" -ForegroundColor Yellow
