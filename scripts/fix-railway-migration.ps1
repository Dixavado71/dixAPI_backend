# ============================================================
# FASE E — Limpeza da migration FAILED + restaurar db:deploy
# Executar QUANDO o SSH do Railway estiver acessível (porta 22)
# ============================================================
#
# Este script remove o registro FAILED da migration
# `20260828000100_remove_user_companyid` de `_prisma_migrations`,
# desbloqueando o `prisma migrate deploy` (P3009).
#
# A migration em si é um no-op seguro (a coluna companyId nunca
# existiu no banco) — apenas o REGISTRO ficou marcado como FAILED
# por causa do BOM UTF-8 no arquivo original.

$ErrorActionPreference = 'Stop'
$TUNNEL_PORT = 15432
$PG_USER = 'postgres'
# A senha correta é a exibida pelo `railway connect` (rotaciona).
# Preencha abaixo ou use a URL impressa pelo túnel.
$PG_PASS = $env:PG_PASS

if (-not $PG_PASS) {
  Write-Host "Defina a senha: `$env:PG_PASS = 'senha_do_tunel' antes de rodar."
  exit 1
}

Write-Host "1) Abrindo túnel Postgres (railway connect)..."
$dir = "$env:TEMP\opencode"
$nodeExe = (Get-Command node).Source
$railwayJs = "$env:APPDATA\npm\node_modules\@railway\cli\bin\railway.js"
$p = Start-Process -FilePath $nodeExe -ArgumentList $railwayJs, "connect", "Postgres", "--tunnel-only", "--ssh", "--port", "$TUNNEL_PORT" -RedirectStandardOutput "$dir\railway-tunnel.log" -RedirectStandardError "$dir\railway-tunnel.log.err" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 15

$tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $TUNNEL_PORT -WarningAction SilentlyContinue
if (-not $tcp.TcpTestSucceeded) {
  Write-Host "Túnel não abriu. Confira o SSH (ssh.railway.app:22) e tente novamente."
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  exit 1
}

Write-Host "2) Removendo registro FAILED da migration (via Prisma)..."
$env:DATABASE_URL = "postgresql://$PG_USER`:$PG_PASS@127.0.0.1:$TUNNEL_PORT/railway?sslmode=disable"
node --input-type=module -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const r = await p.\$executeRawUnsafe(\"DELETE FROM _prisma_migrations WHERE migration_name='20260828000100_remove_user_companyid'\");
  console.log('Removido:', r, 'registro(s)');
} finally {
  await p.\$disconnect();
}
"

Write-Host "3) Aplicando migrations pendentes via tunnel..."
node node_modules/prisma/build/index.js migrate deploy

Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "4) AGORA restaure o db:deploy no railway.toml:"
Write-Host '   startCommand = "npm run db:deploy && npm start"'
Write-Host "   depois: git add railway.toml && git commit -m 'Restore db:deploy' && git push private main"
Write-Host ""
Write-Host "Concluido."
