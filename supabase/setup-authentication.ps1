[CmdletBinding()]
param(
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"
$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDirectory = Split-Path -Parent $scriptDirectory
$envFile = Join-Path $projectDirectory ".env"

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-SupabaseCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
  if (Get-Command supabase -ErrorAction SilentlyContinue) {
    & supabase @Arguments
  } else {
    & npx --yes supabase @Arguments
  }
  if ($LASTEXITCODE -ne 0) {
    throw "O comando Supabase falhou: supabase $($Arguments -join ' ')"
  }
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw "Arquivo .env não encontrado em $projectDirectory"
}

$envContent = Get-Content -LiteralPath $envFile
$supabaseUrlLine = $envContent | Where-Object { $_ -match '^VITE_SUPABASE_URL=' } | Select-Object -First 1
$anonKeyLine = $envContent | Where-Object { $_ -match '^VITE_SUPABASE_ANON_KEY=' } | Select-Object -First 1
$supabaseUrl = ($supabaseUrlLine -replace '^VITE_SUPABASE_URL=', '').Trim().Trim('"').Trim("'")
$anonKey = ($anonKeyLine -replace '^VITE_SUPABASE_ANON_KEY=', '').Trim().Trim('"').Trim("'")

if (-not $supabaseUrl -or -not $anonKey) {
  throw "VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão configurados no .env."
}

if (-not $ProjectRef) {
  $ProjectRef = Read-Host "Informe o Project Ref exibido em Supabase > Project Settings > General"
}
if ($ProjectRef -notmatch '^[a-z0-9]{10,30}$') {
  throw "Project Ref inválido. Informe apenas o código do projeto Supabase."
}

if (-not (Get-Command supabase -ErrorAction SilentlyContinue) -and -not (Get-Command npx -ErrorAction SilentlyContinue)) {
  throw "Supabase CLI e npx não foram encontrados. Instale o Node.js e execute novamente."
}

$randomBytes = New-Object byte[] 32
$randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $randomGenerator.GetBytes($randomBytes)
} finally {
  $randomGenerator.Dispose()
}
$setupSecret = ([System.BitConverter]::ToString($randomBytes) -replace '-', '').ToLowerInvariant()

Push-Location $projectDirectory
try {
  Write-Step "Autenticando na sua conta Supabase"
  Write-Host "O navegador poderá abrir para você autorizar o acesso." -ForegroundColor Yellow
  Invoke-SupabaseCli login

  Write-Step "Vinculando este projeto ao Supabase"
  Invoke-SupabaseCli link --project-ref $ProjectRef

  Write-Step "Configurando segredo temporário de provisionamento"
  Invoke-SupabaseCli secrets set "AUTH_SETUP_SECRET=$setupSecret" --project-ref $ProjectRef

  Write-Step "Publicando a função segura de login"
  Invoke-SupabaseCli functions deploy auth-login --no-verify-jwt --project-ref $ProjectRef

  Write-Step "Publicando a função administrativa de reset de senha"
  Invoke-SupabaseCli functions deploy admin-reset-password --no-verify-jwt --project-ref $ProjectRef

  Write-Step "Publicando a função segura de exclusão de relatórios de despesas"
  Invoke-SupabaseCli functions deploy delete-expense-report --no-verify-jwt --project-ref $ProjectRef

  Write-Step "Publicando temporariamente a função de criação das contas"
  Invoke-SupabaseCli functions deploy provision-users --no-verify-jwt --project-ref $ProjectRef

  Write-Step "Criando as contas com senhas temporárias aleatórias"
  $headers = @{
    apikey = $anonKey
    Authorization = "Bearer $anonKey"
    "x-setup-secret" = $setupSecret
    "Content-Type" = "application/json"
  }
  $provisionUrl = "$($supabaseUrl.TrimEnd('/'))/functions/v1/provision-users"
  $result = Invoke-RestMethod -Method Post -Uri $provisionUrl -Headers $headers -Body "{}"

  $failedAccounts = @($result.results | Where-Object { -not $_.created })
  $result.results | Format-Table name, email, temporaryPassword, created, action, error -AutoSize
  if ($failedAccounts.Count -gt 0) {
    throw "$($failedAccounts.Count) conta(s) não foram criadas. Verifique a tabela acima antes de continuar."
  }

  Write-Step "Removendo o segredo e a função temporária de provisionamento"
  Invoke-SupabaseCli secrets unset AUTH_SETUP_SECRET --project-ref $ProjectRef
  Invoke-SupabaseCli functions delete provision-users --project-ref $ProjectRef --yes

  Write-Host "`nAutenticação configurada com sucesso!" -ForegroundColor Green
  Write-Host "Primeiro acesso do administrador: reinaldo@iracambi.com" -ForegroundColor Green
  Write-Host "Use a senha temporária aleatória exibida na tabela acima e guarde-a em local seguro." -ForegroundColor Green
  Write-Host "`nAinda é necessário cadastrar a URL /reset-password em Authentication > URL Configuration no painel do Supabase." -ForegroundColor Yellow
} catch {
  Write-Host "`nA configuração foi interrompida: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "O segredo temporário pode permanecer configurado se a interrupção ocorreu após sua criação." -ForegroundColor Yellow
  Write-Host "Depois de corrigir o problema, execute este script novamente." -ForegroundColor Yellow
  exit 1
} finally {
  $setupSecret = $null
  Pop-Location
}
