# Connects a phone over adb (via a quick USB handshake) and switches it to
# wireless mode. Does NOT build/install anything - use run-android.ps1 for that.
#
# Usage:
#   1. Plug the phone in via USB once (USB debugging must be enabled and authorized).
#   2. Run this script from the repo root:  .\scripts\adb-wireless-connect.ps1
#   3. Unplug the cable once it says "connected wirelessly".
#
# Re-run it any time the wireless adb session has dropped (e.g. after the phone
# slept or left Wi-Fi range) - just plug USB back in first.

$ErrorActionPreference = "Stop"

if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "C:\Users\alias\AndroidSdk" }
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

function Get-AdbDevices {
    & $adb devices | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
}

Write-Output "Checking connected devices..."
$devices = Get-AdbDevices

$wireless = $devices | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+:\d+\s+device\s*$' }
$usb = $devices | Where-Object { $_ -match '^(\S+)\s+device\s*$' -and $_ -notmatch '^\d+\.\d+\.\d+\.\d+:' }
$unauthorized = $devices | Where-Object { $_ -match 'unauthorized' }

if ($wireless) {
    Write-Output "Already connected wirelessly: $($wireless.Trim())"
}
elseif ($usb) {
    $serial = ($usb.Trim() -split '\s+')[0]
    Write-Output "Found USB device $serial - switching it to wireless mode..."

    $routeOutput = & $adb -s $serial shell ip route
    $ipLine = $routeOutput | Select-String 'wlan\d+.*src (\d+\.\d+\.\d+\.\d+)'
    if (-not $ipLine) {
        throw "Could not determine the phone's Wi-Fi IP. Make sure Wi-Fi is on and connected, then re-run."
    }
    $phoneIp = $ipLine.Matches[0].Groups[1].Value
    Write-Output "Phone Wi-Fi IP: $phoneIp"

    & $adb -s $serial tcpip 5555 | Out-Null
    Start-Sleep -Seconds 2
    & $adb connect "${phoneIp}:5555"

    $confirm = Get-AdbDevices | Where-Object { $_ -match [regex]::Escape($phoneIp) -and $_ -match 'device\s*$' }
    if (-not $confirm) {
        throw "Wireless connect did not succeed. Check the phone is still on the same Wi-Fi network and try again."
    }
    Write-Output "Connected wirelessly at ${phoneIp}:5555 - you can unplug the USB cable now."
}
elseif ($unauthorized) {
    throw "Device shows as 'unauthorized'. Check your phone screen for the 'Allow USB debugging?' prompt and accept it, then re-run this script."
}
else {
    throw "No device found. Plug the phone in via USB with USB debugging enabled, then re-run this script."
}
