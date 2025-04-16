const { spawn } = require('child_process');
const os = require('os');
const chalk = require('chalk');

// Get local IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback (127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }

  return addresses;
}

// Get the frontend port from env or default to 3000
const PORT = process.env.PORT || 3000;

// Start Next.js on all interfaces
const nextProcess = spawn('next', ['dev', '-H', '0.0.0.0'], { 
  stdio: 'inherit',
  shell: true
});

// Listen for process exit
nextProcess.on('exit', (code) => {
  if (code !== 0) {
    console.log(chalk.red(`Next.js process exited with code ${code}`));
  }
  process.exit(code);
});

// Display network information after a short delay to let Next.js start
setTimeout(() => {
  const ipAddresses = getLocalIpAddresses();
  
  console.log(chalk.cyan('\n--------------------------------------'));
  console.log(chalk.cyan('🌐 MedConnect Frontend is running at:'));
  console.log(chalk.bold.green(`- Local:   http://localhost:${PORT}`));
  
  ipAddresses.forEach(({ name, address }) => {
    console.log(chalk.bold.green(`- Network: http://${address}:${PORT}  (${name})`));
  });
  
  console.log(chalk.cyan('\n🔗 For testing on mobile devices, use one of the Network URLs'));
  console.log(chalk.cyan('--------------------------------------'));
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nStopping Next.js server...'));
  nextProcess.kill('SIGINT');
  process.exit(0);
}); 