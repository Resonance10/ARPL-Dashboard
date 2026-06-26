import concurrently from 'concurrently';
import os from 'os';

// 1. Capture arguments passed to this runner (e.g., --host)
const extraArgs = process.argv.slice(2).join(' ');

// 2. Find the local IPv4 address
const networkInterfaces = os.networkInterfaces();
let localIp = 'localhost';

for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const details of networkInterface) {
        // Filter for IPv4 and non-internal (skip 127.0.0.1)
        if (details.family === 'IPv4' && !details.internal) {
            localIp = details.address;
            break;
        }
    }
}

console.log(`\n🚀 Network Access Enabled!`);
console.log(`🔗 To access from another PC, use: https://${localIp}:5174\n`);

const { result } = concurrently(
    [
        {
            // Restarts backend on changes, but ignores the data folder to avoid loops
            command: 'npx nodemon --ignore local_data server.js',
            name: 'backend',
            prefixColor: 'blue'
        },
        {
            command: `npx vite ${extraArgs}`,
            name: 'frontend',
            prefixColor: 'green'
        },
    ],
    {
        // Kill both if either fails or is stopped
        killOthers: ['failure', 'success'],
    }
);

// Handle exit results silently as concurrently handles logging
result.catch(() => { });