# WSL2 Port Forwarding Setup for Magic Mirror Development
# Run this script as Administrator

# Add port forwarding rule to forward external connections to WSL2
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3000 connectaddress=127.0.0.1 connectport=3000

# Verify the rule was added
Write-Host "`nPort forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4

Write-Host "`nSetup complete! External devices can now reach the dev server at port 3000." -ForegroundColor Green
