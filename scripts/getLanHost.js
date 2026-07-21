/**
 * Best-effort LAN IPv4 for Metro on physical devices (Wi‑Fi / Ethernet).
 * Skips loopback, WSL, and common virtual adapters.
 */
const os = require('os');

function isVirtualInterface(name) {
  const n = name.toLowerCase();
  return (
    n.includes('wsl') ||
    n.includes('virtualbox') ||
    n.includes('vmware') ||
    n.includes('vethernet') ||
    n.includes('hyper-v')
  );
}

function getLanHost() {
  const candidates = [];

  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (!addrs || isVirtualInterface(name)) {
      continue;
    }
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }

  const prefer = (predicate) => candidates.find(predicate)?.address;

  return (
    prefer((c) => c.address.startsWith('10.')) ||
    prefer((c) => c.name.toLowerCase().includes('wi-fi') || c.name.toLowerCase().includes('wlan')) ||
    prefer((c) => c.address.startsWith('192.168.') && !c.address.startsWith('192.168.56.')) ||
    candidates[0]?.address ||
    'localhost'
  );
}

if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log(getLanHost());
}

module.exports = { getLanHost };
