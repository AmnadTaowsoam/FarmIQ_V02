@echo off
echo Installing dependencies...
call npm install
if %ERRORLEVEL% EQU 0 (
    echo INSTALL SUCCESSFUL
) else (
    echo INSTALL FAILED
)
