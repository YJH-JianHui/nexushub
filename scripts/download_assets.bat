@echo off
setlocal

echo Creating vendor directories...
if not exist "public\vendor" mkdir "public\vendor"
if not exist "public\vendor\fonts" mkdir "public\vendor\fonts"

echo Downloading TailwindCSS...
curl -L -o "public\vendor\tailwindcss.js" "https://cdn.tailwindcss.com"

echo Downloading React...
curl -L -o "public\vendor\react.js" "https://aistudiocdn.com/react@19.2.0/es2022/react.bundle.mjs"

echo Downloading ReactDOM...
curl -L -o "public\vendor\react-dom.js" "https://aistudiocdn.com/react-dom@19.2.0/es2022/react-dom.bundle.mjs"

echo Downloading Lucide React...
curl -L -o "public\vendor\lucide-react.js" "https://aistudiocdn.com/lucide-react@0.554.0/es2022/lucide-react.bundle.mjs"

echo Downloading Inter Fonts...
curl -L -o "public\vendor\fonts\Inter-Regular.ttf" "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf"
curl -L -o "public\vendor\fonts\Inter-Medium.ttf" "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fMZg.ttf"
curl -L -o "public\vendor\fonts\Inter-SemiBold.ttf" "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf"

echo Done!
pause
