<#
.SYNOPSIS
    Sync the internal FDE-kit repo to the public aws-samples GitHub repo.

.DESCRIPTION
    Copies all source files (excluding internal-only directories) from the
    GitLab source-of-truth to the aws-samples/sample-fdep-mcp-server repo,
    commits as a single update, and pushes.

    Run this when you have a releasable state on your internal main branch.

.PARAMETER GithubRepo
    Path to the local clone of aws-samples/sample-fdep-mcp-server.
    Default: sibling directory ../sample-fdep-mcp-server

.PARAMETER Message
    Commit message for the sync. Default: "Sync from internal repo"

.PARAMETER DryRun
    If set, shows what would be copied but doesn't commit or push.

.EXAMPLE
    .\scripts\sync-to-github.ps1 -Message "v0.4.0: add resilience program"
    .\scripts\sync-to-github.ps1 -DryRun
#>

param(
    [string]$GithubRepo = (Join-Path $PSScriptRoot "..\..\sample-fdep-mcp-server"),
    [string]$Message = "Sync from internal repo",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$SourceRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$GithubRepo = Resolve-Path $GithubRepo -ErrorAction SilentlyContinue

if (-not $GithubRepo) {
    Write-Error "GitHub repo not found. Clone it first:`n  git clone https://github.com/aws-samples/sample-fdep-mcp-server.git $($PSScriptRoot)\..\..\sample-fdep-mcp-server"
    exit 1
}

if (-not (Test-Path (Join-Path $GithubRepo ".git"))) {
    Write-Error "$GithubRepo is not a git repository"
    exit 1
}

Write-Host "Source:      $SourceRoot" -ForegroundColor Cyan
Write-Host "Destination: $GithubRepo" -ForegroundColor Cyan
Write-Host ""

# Directories/files to EXCLUDE from the public repo
$Exclude = @(
    ".git",
    ".kiro",
    ".vscode",
    "node_modules",
    "core\dist",
    "core\node_modules",
    "engagements",
    "documentation\fdep-complements-aidlc.html",
    "documentation\qa.md"
)

# Step 1: Clean the target (preserve .git and any GitHub-only files)
$PreserveInTarget = @(".git", "LICENSE", "CODE_OF_CONDUCT.md", "CONTRIBUTING.md")

Write-Host "Cleaning target directory..." -ForegroundColor Yellow
Get-ChildItem $GithubRepo -Force | Where-Object {
    $PreserveInTarget -notcontains $_.Name
} | ForEach-Object {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would remove: $($_.Name)" -ForegroundColor DarkGray
    } else {
        Remove-Item $_.FullName -Recurse -Force
    }
}

# Step 2: Copy files from source
Write-Host "Copying files..." -ForegroundColor Yellow

function Copy-Filtered {
    param([string]$Source, [string]$Dest, [string]$RelativePath = "")

    Get-ChildItem $Source -Force | ForEach-Object {
        $itemRelPath = if ($RelativePath) { "$RelativePath\$($_.Name)" } else { $_.Name }

        # Check exclusion
        foreach ($exc in $Exclude) {
            if ($itemRelPath -eq $exc -or $itemRelPath.StartsWith("$exc\")) {
                return
            }
        }

        $destPath = Join-Path $Dest $_.Name

        if ($_.PSIsContainer) {
            if ($DryRun) {
                Write-Host "  [DRY RUN] Would copy dir: $itemRelPath" -ForegroundColor DarkGray
            } else {
                New-Item $destPath -ItemType Directory -Force | Out-Null
            }
            Copy-Filtered -Source $_.FullName -Dest $destPath -RelativePath $itemRelPath
        } else {
            if ($DryRun) {
                # Only show first 20
                if ($script:fileCount -lt 20) {
                    Write-Host "  [DRY RUN] Would copy: $itemRelPath" -ForegroundColor DarkGray
                } elseif ($script:fileCount -eq 20) {
                    Write-Host "  [DRY RUN] ... and more" -ForegroundColor DarkGray
                }
                $script:fileCount++
            } else {
                Copy-Item $_.FullName $destPath -Force
            }
        }
    }
}

$script:fileCount = 0
Copy-Filtered -Source $SourceRoot -Dest $GithubRepo

# Step 3: Commit and push
if ($DryRun) {
    Write-Host ""
    Write-Host "[DRY RUN] Would commit with message: '$Message'" -ForegroundColor DarkGray
    Write-Host "[DRY RUN] Would push to origin/main" -ForegroundColor DarkGray
} else {
    Write-Host "Staging changes..." -ForegroundColor Yellow
    Push-Location $GithubRepo
    git add -A
    $changes = git status --porcelain
    if (-not $changes) {
        Write-Host "No changes to sync." -ForegroundColor Green
        Pop-Location
        exit 0
    }

    $changeCount = ($changes | Measure-Object -Line).Lines
    Write-Host "  $changeCount file(s) changed" -ForegroundColor Cyan

    git commit -m $Message
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    Pop-Location

    Write-Host ""
    Write-Host "Sync complete." -ForegroundColor Green
    Write-Host "  https://github.com/aws-samples/sample-fdep-mcp-server" -ForegroundColor Cyan
}
