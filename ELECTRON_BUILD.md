# Electron Build Guide

## Prerequisites

### 1. Install pnpm 10

```powershell
npm install -g pnpm@10
```

### 2. Install project dependencies

```powershell
cd <project-root>
pnpm install
```

### 3. Download Electron binary cache (required for first build)

The `.npmrc` already configures npmmirror for faster downloads. Electron-builder needs a local zip during packaging; without it, the build silently produces a broken package missing `Forge.exe` and `icudtl.dat`.

```powershell
# Download
$url = "https://npmmirror.com/mirrors/electron/v41.4.0/electron-v41.4.0-win32-x64.zip"
$out = "<project-root>\electron-cache\electron-v41.4.0-win32-x64.zip"
New-Item -ItemType Directory -Force -Path "<project-root>\electron-cache" | Out-Null
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing

# Extract
Expand-Archive -Path $out -DestinationPath "<project-root>\electron-cache\electron-41.4.0-win32-x64" -Force
```

Replace `<project-root>` with the actual path (e.g. `D:\aiproject\forge`). Keep the `electron-cache/` directory around; future builds reuse it.

### 4. Install SVN command line tools (required for publish flow)

TortoiseSVN does NOT include `svn.exe` by default. The publish flow needs it for `svn info --show-item url`. Re-run the TortoiseSVN installer and check "Command line client tools".

## Build Steps

### Step 1: Delete old release directory

Must delete before each build. Old `app.asar.unpacked` may have file locks that break the build (Access is denied). Run in an elevated (admin) PowerShell:

```powershell
Remove-Item -Recurse -Force "<project-root>\release"
```

If PowerShell fails, use admin CMD:

```cmd
rd /s /q "<project-root>\release"
```

### Step 2: Run build

```powershell
$env:ELECTRON_CACHE = "<project-root>\electron-cache"; pnpm electron:build
```

Or use the one-click script from an admin PowerShell:

```powershell
.\build-electron.ps1
```

### Step 3: Verify build output

**`release/` directory should contain:**

- `Forge Setup 0.0.0.exe` - NSIS installer
- `win-unpacked/Forge.exe` - unpacked version for testing

**`win-unpacked/` should contain these core files:**

```
Forge.exe
icudtl.dat
ffmpeg.dll
d3dcompiler_47.dll
dxcompiler.dll
dxil.dll
libEGL.dll
libGLESv2.dll
vk_swiftshader.dll
vk_swiftshader_icd.json
vulkan-1.dll
resources.pak
chrome_100_percent.pak
chrome_200_percent.pak
snapshot_blob.bin
v8_context_snapshot.bin
locales/
resources/
```

**`resources/app.asar` should only contain:**

```
/electron/main.cjs
/electron/preload.cjs
/electron/serverInputPreload.cjs
/package.json
```

No `node_modules` inside asar. Verify:

```powershell
npx asar list "<project-root>\release\win-unpacked\resources\app.asar"
```

If `Forge.exe` or `icudtl.dat` is missing, the electron cache was not used correctly. Delete `release/` and rebuild.

## Running the Packaged App

The packaged app does NOT load local files. It connects to an external server:

- On launch, a dialog asks for a server address (e.g. `http://10.x.x.x:6688`)
- Or pass the URL as a command line argument: `Forge.exe http://10.x.x.x:6688`
- Do NOT use `--server=http://...` prefix. Chromium rejects unknown `--` switches and exits with code 9.
- The server address is saved to `server_config.json` in Electron's user data directory for next launch.
- If the server is unreachable, an error dialog appears and the app exits.

Before using the packaged app, ensure the vite dev server (`pnpm dev`) is running on the target machine or LAN.

## Development Mode

In a normal terminal (no `ELECTRON_RUN_AS_NODE` variable):

```powershell
pnpm dev          # Start vite dev server (port 6688)
pnpm electron:dev # Start Electron, loads http://localhost:6688
```

In VSCode / Claude Code terminal (these inject `ELECTRON_RUN_AS_NODE=1`):

```powershell
.\start-electron.ps1                # Default: http://localhost:6688
.\start-electron.ps1 http://IP:6688 # Custom server address
```

**Important:** Setting `ELECTRON_RUN_AS_NODE=0` does NOT fix the issue. Electron checks whether the variable EXISTS, not its value. Even `0` triggers Node.js mode, causing `TypeError: Cannot read properties of undefined (reading 'commandLine')`. The variable must be completely removed.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App opens with no response / nothing happens | `win-unpacked/` missing `icudtl.dat`, `Forge.exe` etc. | Delete `release/` (admin), ensure electron cache exists, rebuild |
| App crashes immediately: `TypeError: Cannot read properties of undefined` | `ELECTRON_RUN_AS_NODE` env var exists (any value) | Use `start-electron.ps1` or `Remove-Item Env:ELECTRON_RUN_AS_NODE` |
| App crashes with exit code 9 after passing `--server=` | Chromium rejects unknown `--` switches | Pass URL directly: `Forge.exe http://10.x.x.x:6688` |
| Build fails: Access is denied | Old `release/win-unpacked` has file locks | Delete `release/` from admin CMD: `rd /s /q "<project-root>\release"` |
| Publish flow: "SVN path not found" | `svn.exe` not installed / not in PATH | Install TortoiseSVN with "Command line client tools" option |
| Publish flow: "Failed to fetch" | Network request to packaging server failed | Check target server is reachable, IP/port correct, no firewall block |

## Key Architecture Notes

- `package.json` `main` field points to `electron/main.cjs`
- `electron/main.cjs` uses only Node built-in modules (path, fs, net, crypto, child_process) and Electron APIs. No npm dependencies.
- The renderer loads the SPA from a remote server; all frontend deps are bundled by vite.
- `electron/afterPack.cjs` currently has no cleanup logic; all files are kept in the package.
- The app enables GPU acceleration for WebGL (`ignore-gpu-blacklist`, `enable-gpu-rasterization`) because Laya depends on WebGL rendering.