# 用 Windows 內建中文語音（Microsoft Hanhan）把每句旁白存成 wav
param([string]$InputJson, [string]$OutDir, [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$items = Get-Content -Raw -Encoding UTF8 $InputJson | ConvertFrom-Json
New-Item -ItemType Directory -Force $OutDir | Out-Null
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Hanhan Desktop')
$synth.Rate = $Rate
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(24000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($it in $items) {
  $path = Join-Path $OutDir ($it.id + '.wav')
  $synth.SetOutputToWaveFile($path, $fmt)
  $synth.Speak($it.text)
  $synth.SetOutputToNull()
}
$synth.Dispose()
Write-Output "tts done: $($items.Count)"
