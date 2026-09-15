import os from "os"

/**
 * Discovers the host machine's primary non-internal IPv4 address
 * for generating local Wi-Fi QR code join URLs.
 */
export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    const addresses = interfaces[name]
    if (!addresses) continue

    for (const net of addresses) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        // Prefer typical LAN subnets (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (
          net.address.startsWith("192.168.") ||
          net.address.startsWith("10.") ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(net.address)
        ) {
          return net.address
        }
      }
    }
  }

  // Fallback to localhost if no LAN network interface was discovered
  return "localhost"
}
