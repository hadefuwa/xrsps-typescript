# Connecting to a Server

## Same network (LAN)

If you and the server host are on the same WiFi:

1. Host finds their local IP — open PowerShell and run `ipconfig`, look for the IPv4 address under your WiFi adapter (usually `192.168.x.x`)
2. Host opens firewall ports (run as Administrator):
   ```powershell
   netsh advfirewall firewall add rule name="XRSPS Game Server" dir=in action=allow protocol=TCP localport=43594
   netsh advfirewall firewall add rule name="XRSPS Client" dir=in action=allow protocol=TCP localport=3000
   ```
3. Players go to `http://192.168.x.x:3000` in their browser

## Over the internet (Tailscale) — Recommended

[Tailscale](https://tailscale.com) creates a private VPN between devices. It's free for up to 3 users and takes 2 minutes to set up.

1. Host and all players install Tailscale from [tailscale.com](https://tailscale.com/download)
2. Everyone signs in with the same account (or host shares an invite link)
3. Host finds their Tailscale IP — it starts with `100.x.x.x`, shown in the Tailscale app
4. Players go to `http://100.x.x.x:3000`

No port forwarding, no firewall rules needed beyond the one for port 43594.

## Server list

When you open the game, a server list appears automatically. It shows the server name and current player count. Click the row to select it, then enter your credentials and click Login.

::: tip
The server address shown in the list auto-detects based on the URL you used to load the game. If you loaded from `192.168.0.95:3000`, the server address will automatically be `192.168.0.95:43594`.
:::
