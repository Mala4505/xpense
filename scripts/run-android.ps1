# Connects a phone over adb (via a quick USB handshake) and switches it to
# wireless mode, then builds and installs the dev client onto it.
#
# Usage:
#   1. Plug the phone in via USB once (USB debugging must be enabled and authorized).
#   2. Run this script from the repo root:  .\scripts\run-android.ps1
#   3. Unplug the cable once it says "connected wirelessly" - the build/install
#      keeps going over Wi-Fi.
#
# Re-run it any time the wireless adb session has dropped (e.g. after the phone
# slept or left Wi-Fi range) - just plug USB back in first.

$ErrorActionPreference = "Stop"

if (-not $env:JAVA_HOME)    { $env:JAVA_HOME    = "C:\Program Files\Microsoft\jdk-17.0.20.8-hotspot" }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "C:\Users\alias\AndroidSdk" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

& (Join-Path $PSScriptRoot "adb-wireless-connect.ps1")

Write-Output ""
Write-Output "Building and installing the app..."
Set-Location (Join-Path $PSScriptRoot "..")
npm run android
