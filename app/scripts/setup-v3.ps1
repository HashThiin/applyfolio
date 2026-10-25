#Requires -Version 5.1
<#
.SYNOPSIS
  ApplyFolio v3.0 上线三件事：执行 006 迁移、部署 analyze-job、配置 DEEPSEEK_API_KEY。

.DESCRIPTION
  只依赖两样外部条件：
    - 一个 Supabase Personal Access Token（Dashboard → Account → Access Tokens，形如 sbp_xxx）
    - 联网（通过 npx 拉取 supabase CLI，装过就直接用缓存）

  为什么这样分工：
    - 006 迁移走 Management API 直接执行 SQL 文件，不需要 psql、不需要数据库密码，
      也不会像 `supabase db push` 那样因为本地没建迁移历史表而重跑 001~005 报「表已存在」。
      006 本身是幂等的（IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS），可放心重复执行。
    - analyze-job 与 secrets 走官方 CLI，`--use-api` 由服务端打包，免 Docker。

.PARAMETER Step
  all（默认）| sql | function | secret | verify

.PARAMETER ProjectRef
  项目 ref；省略时从 .env.local 的 VITE_SUPABASE_URL 里解析。

.PARAMETER AccessToken
  PAT；省略时读环境变量 SUPABASE_ACCESS_TOKEN，仍为空则安全提示输入（不回显）。

.PARAMETER DeepSeekKey
  DeepSeek API Key；step 需要写 secret 且未提供时会安全提示输入。

.PARAMETER Proxy
  给 Management API 用的代理，如 http://127.0.0.1:7897。CLI 走它自己的 https_proxy / http_proxy。

.PARAMETER DryRun
  只打印将要执行的动作，不调用任何接口与 CLI。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File app\scripts\setup-v3.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File app\scripts\setup-v3.ps1 -Step verify

.EXAMPLE
  $env:SUPABASE_ACCESS_TOKEN='sbp_xxx'; powershell -ExecutionPolicy Bypass -File app\scripts\setup-v3.ps1
#>
[CmdletBinding()]
param(
    [ValidateSet('all', 'sql', 'function', 'secret', 'verify')]
    [string]$Step = 'all',
    [string]$ProjectRef,
    [string]$AccessToken,
    [string]$DeepSeekKey,
    [string]$Proxy,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch { }

$script:AppRoot = Split-Path -Parent $PSScriptRoot
$script:Token = $null
$script:DryRun = [bool]$DryRun
$script:Proxy = $Proxy
$script:Failed = 0

# ------------------------------------------------------------------
# 输出
# ------------------------------------------------------------------
function Write-Head([string]$Text) {
    Write-Host ''
    Write-Host "== $Text" -ForegroundColor Cyan
}
function Write-Ok([string]$Text) { Write-Host "   [OK]   $Text" -ForegroundColor Green }
function Write-Info([string]$Text) { Write-Host "   [..]   $Text" -ForegroundColor Gray }
function Write-Note([string]$Text) { Write-Host "   [!!]   $Text" -ForegroundColor Yellow }
function Write-Fail([string]$Text) {
    Write-Host "   [FAIL] $Text" -ForegroundColor Red
    $script:Failed++
}

function Read-Secret([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# ------------------------------------------------------------------
# 解析 ref 与 token
# ------------------------------------------------------------------
function Resolve-ProjectRef {
    if ($ProjectRef) { return $ProjectRef.Trim() }

    $envFile = Join-Path $script:AppRoot '.env.local'
    if (Test-Path $envFile) {
        $hit = Select-String -Path $envFile -Pattern '^\s*VITE_SUPABASE_URL\s*=\s*https://([a-z0-9]+)\.supabase\.co' | Select-Object -First 1
        if ($hit) { return $hit.Matches[0].Groups[1].Value }
    }
    throw "找不到项目 ref：请用 -ProjectRef 指定，或在 $envFile 里配好 VITE_SUPABASE_URL。"
}

function Resolve-AccessToken {
    if ($AccessToken) { return $AccessToken.Trim() }
    if ($env:SUPABASE_ACCESS_TOKEN) { return $env:SUPABASE_ACCESS_TOKEN.Trim() }
    if ($script:DryRun) { return 'sbp_dry_run' }

    Write-Host ''
    Write-Host '需要 Supabase Personal Access Token（只存在本进程环境变量里，不落盘）：' -ForegroundColor Yellow
    Write-Host '  Dashboard → 右上头像 → Account → Access Tokens → Generate new token' -ForegroundColor DarkGray
    $token = Read-Secret '  粘贴 token（输入不回显）'
    if (-not $token) { throw '未输入 token。' }
    return $token.Trim()
}

# ------------------------------------------------------------------
# Management API（直接跑 SQL）
# ------------------------------------------------------------------
function Invoke-Api {
    param(
        [ValidateSet('GET', 'POST')][string]$Method,
        [string]$Path,
        [object]$Body
    )

    if ($script:DryRun) {
        Write-Info "[dry-run] $Method https://api.supabase.com$Path"
        return $null
    }

    $headers = @{ Authorization = "Bearer $script:Token" }
    $req = @{
        Uri         = "https://api.supabase.com$Path"
        Method      = $Method
        Headers     = $headers
        ErrorAction = 'Stop'
        TimeoutSec  = 60
    }
    if ($Body) {
        # 必须自己转 UTF-8 字节，否则中文（COMMENT 文本）会被 Invoke-RestMethod 按 ASCII 打坏
        $json = ConvertTo-Json $Body -Depth 6 -Compress
        $req.ContentType = 'application/json; charset=utf-8'
        $req.Body = [Text.Encoding]::UTF8.GetBytes($json)
    }
    if ($script:Proxy) { $req.Proxy = $script:Proxy }

    try {
        return Invoke-RestMethod @req
    }
    catch {
        $detail = ''
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $detail = $_.ErrorDetails.Message }
        throw "$Method https://api.supabase.com$Path 失败：$($_.Exception.Message) $detail"
    }
}

function Invoke-Sql([string]$Query, [switch]$ReadOnly) {
    $body = @{ query = $Query; read_only = [bool]$ReadOnly }
    return Invoke-Api -Method POST -Path "/v1/projects/$script:Ref/database/query" -Body $body
}

function Invoke-Cli {
    param([string[]]$CliArgs)

    $display = ($CliArgs | ForEach-Object { if ($_ -match '^(DEEPSEEK|SUPABASE)') { '<redacted>' } else { $_ } }) -join ' '
    if ($script:DryRun) {
        Write-Info "[dry-run] npx supabase $display"
        return
    }

    Push-Location $script:AppRoot
    try {
        & npx --yes supabase@latest @CliArgs
        if ($LASTEXITCODE -ne 0) { throw "supabase $($CliArgs[0..1] -join ' ') 退出码 $LASTEXITCODE" }
    }
    finally { Pop-Location }
}

# ------------------------------------------------------------------
# 步骤 1：006 迁移
# ------------------------------------------------------------------
function Invoke-StepSql {
    Write-Head '1/3 执行 006_resume_and_advice.sql'

    $sqlFile = Join-Path $script:AppRoot 'supabase\migrations\006_resume_and_advice.sql'
    if (-not (Test-Path $sqlFile)) { throw "找不到迁移文件：$sqlFile" }

    $sql = Get-Content -Raw -Encoding UTF8 $sqlFile
    Write-Info "文件 $sqlFile（$([Text.Encoding]::UTF8.GetByteCount($sql)) 字节，幂等可重复执行）"

    Invoke-Sql -Query $sql | Out-Null
    Write-Ok 'SQL 已提交执行'
    if ($script:DryRun) { return }

    $cols = Invoke-Sql -Query @"
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'applications'
  and column_name in ('jd_text', 'advice', 'advice_at')
order by column_name
"@ -ReadOnly
    $names = @($cols | ForEach-Object { $_.column_name })
    if ($names.Count -eq 3) { Write-Ok "applications 新增列：$($names -join ', ')" }
    else { Write-Fail "applications 列不完整，实际拿到：$($names -join ',' )" }
}

# ------------------------------------------------------------------
# 步骤 2：部署 analyze-job
# ------------------------------------------------------------------
function Invoke-StepFunction {
    Write-Head '2/3 部署 Edge Function analyze-job'

    $fnDir = Join-Path $script:AppRoot 'supabase\functions\analyze-job'
    if (-not (Test-Path (Join-Path $fnDir 'index.ts'))) { throw "找不到函数源码：$fnDir\index.ts" }

    Invoke-Cli @('functions', 'deploy', 'analyze-job', '--project-ref', $script:Ref, '--use-api')
    Write-Ok '已提交部署（--use-api，服务端打包，不走 Docker）'
}

# ------------------------------------------------------------------
# 步骤 3：写入 DEEPSEEK_API_KEY
# ------------------------------------------------------------------
function Invoke-StepSecret {
    Write-Head '3/3 写 secret DEEPSEEK_API_KEY'

    $key = $DeepSeekKey
    if (-not $key -and -not $script:DryRun) {
        Write-Host '  需要 DeepSeek API Key（platform.deepseek.com → API keys）：' -ForegroundColor Yellow
        $key = Read-Secret '  粘贴 sk-... （输入不回显）'
    }
    if (-not $key) {
        if ($script:DryRun) { Write-Info '[dry-run] 跳过实际写入'; return }
        throw '未提供 DeepSeek API Key。'
    }
    if ($key -notmatch '^sk-') { Write-Note '这个值看起来不像 sk- 开头，仍然是照着写进去了' }

    # 用临时 env 文件而不是命令行参数：避免 key 出现在进程列表里
    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("applyfolio-secret-{0}.env" -f ([guid]::NewGuid().ToString('N')))
    try {
        [IO.File]::WriteAllText($tmp, "DEEPSEEK_API_KEY=$key`n", (New-Object Text.UTF8Encoding($false)))
        Invoke-Cli @('secrets', 'set', '--env-file', $tmp, '--project-ref', $script:Ref)
        Write-Ok 'secret 已写入（临时文件已删除）'
    }
    finally {
        if (Test-Path $tmp) { Remove-Item $tmp -Force }
    }
}

# ------------------------------------------------------------------
# 步骤 4：校验
# ------------------------------------------------------------------
function Invoke-StepVerify {
    Write-Head '校验线上状态'

    if ($script:DryRun) {
        Write-Info '[dry-run] 将校验：迁移字段(7) / resumes 私有桶 / 桶策略(4) / analyze-job / DEEPSEEK_API_KEY'
        return
    }

    # 迁移
    $cols = Invoke-Sql -Query @"
select table_name, column_name from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'applications'   and column_name in ('jd_text','advice','advice_at'))
    or (table_name = 'user_profiles'  and column_name like 'resume_%'))
order by table_name, column_name
"@ -ReadOnly
    $colList = @($cols | ForEach-Object { "$($_.table_name).$($_.column_name)" })
    if ($colList.Count -ge 7) { Write-Ok "字段 $($colList.Count) 个：$($colList -join ', ')" }
    else { Write-Fail "字段只有 $($colList.Count) 个（应为 7）：$($colList -join ', ')" }

    # 简历桶
    $buckets = Invoke-Sql -Query "select id, public from storage.buckets where id = 'resumes'" -ReadOnly
    if (@($buckets).Count -eq 1) {
        $isPublic = @($buckets)[0].public
        if ($isPublic) { Write-Fail 'resumes 桶是 public，应为私有桶' }
        else { Write-Ok 'resumes 私有桶存在' }
    }
    else { Write-Fail 'resumes 桶不存在' }

    # 桶策略
    $pols = Invoke-Sql -Query @"
select polname from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'storage' and c.relname = 'objects' and polname like 'own_resume%'
order by polname
"@ -ReadOnly
    $polNames = @($pols | ForEach-Object { $_.polname })
    if ($polNames.Count -eq 4) { Write-Ok "策略 4 条：$($polNames -join ', ')" }
    else { Write-Fail "策略应为 4 条（insert/select/update/delete），实际 $($polNames.Count)：$($polNames -join ', ')" }

    # Function
    $fns = Invoke-Api -Method GET -Path "/v1/projects/$script:Ref/functions"
    $fn = @($fns) | Where-Object { $_.slug -eq 'analyze-job' } | Select-Object -First 1
    if ($fn) {
        if ($fn.status -eq 'ACTIVE') { Write-Ok "analyze-job 已部署（status ACTIVE，version $($fn.version)）" }
        else { Write-Note "analyze-job 存在但 status = $($fn.status)" }
        if ($fn.verify_jwt -eq $false) { Write-Note 'verify_jwt = false：函数会自己校验 Bearer，可接受；但不建议再关其它函数的 JWT' }
    }
    else { Write-Fail 'analyze-job 未部署' }

    # Secret
    $secrets = Invoke-Api -Method GET -Path "/v1/projects/$script:Ref/secrets"
    $names = @($secrets | ForEach-Object { $_.name })
    if ($names -contains 'DEEPSEEK_API_KEY') { Write-Ok 'secret DEEPSEEK_API_KEY 已配置' }
    else { Write-Note "未找到 DEEPSEEK_API_KEY（现有：$($names -join ', ')）；此时点「收录并分析」会降级为只收录" }
}

# ------------------------------------------------------------------
# 主流程
# ------------------------------------------------------------------
Write-Host ''
Write-Host 'ApplyFolio v3.0 上线脚本' -ForegroundColor White
Write-Host "  项目根目录 $script:AppRoot"
if ($script:DryRun) { Write-Host '  模式：DRY RUN（不调用任何接口）' -ForegroundColor Yellow }

try {
    $script:Ref = Resolve-ProjectRef
    Write-Host "  项目 ref  $script:Ref"

    $script:Token = Resolve-AccessToken
    if ($script:Token -notmatch '^sbp_') { Write-Note 'token 不像 sbp_ 开头，继续试' }
    $env:SUPABASE_ACCESS_TOKEN = $script:Token

    $steps = switch ($Step) {
        'all' { @('sql', 'function', 'secret', 'verify') }
        default { @($Step) }
    }
    foreach ($s in $steps) {
        switch ($s) {
            'sql' { Invoke-StepSql }
            'function' { Invoke-StepFunction }
            'secret' { Invoke-StepSecret }
            'verify' { Invoke-StepVerify }
        }
    }
}
catch {
    Write-Host ''
    Write-Host "出错了：$($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # 不把 token 留在当前 shell 里
    if (-not $AccessToken) { Remove-Item Env:\SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue }
}

Write-Host ''
if ($script:Failed -gt 0) {
    Write-Host "完成，但有 $($script:Failed) 项校验没过（见上面 [FAIL]）。" -ForegroundColor Yellow
    exit 2
}
Write-Host '全部完成。' -ForegroundColor Green
Write-Host '  接下去：打开 https://applyfolio-silk.vercel.app → 个人中心上传简历 → 点「投递」收录一个岗位试试。' -ForegroundColor Gray
Write-Host '  验收清单见 工作进程.md 第 6.5 节第 17/18 步。' -ForegroundColor Gray
