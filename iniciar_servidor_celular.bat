@echo off
title FinancePro - Servidor Local para Celular / iPhone
cls
echo ================================================================
echo      FinancePro - Compartilhar Acesso com Celular (iPhone 12)
echo ================================================================
echo.
echo 1. Certifique-se de que o seu iPhone 12 esta conectado na MESMA REDE WI-FI deste computador.
echo.
echo 2. Descobrindo o IP do seu computador na rede local:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    echo    -> Seu IP Local: %%a
)
echo.
echo 3. No Safari do seu iPhone 12, digite o endereco exibido acima seguido de :8080
echo    Exemplo: http://192.168.1.15:8080
echo.
echo 4. Iniciando servidor local na porta 8080...
echo.
echo (Pressione Ctrl+C para encerrar o servidor quando terminar)
echo ================================================================
echo.
python -m http.server 8080 || npx -y serve -l 8080 .
pause
