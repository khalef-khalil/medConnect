const { spawn } = require('child_process');
const os = require('os');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

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

// Check if certificates exist
const certsDir = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');
const certsExist = fs.existsSync(keyPath) && fs.existsSync(certPath);

// Start Next.js with custom environment variables
const args = ['dev', '-H', '0.0.0.0', '-p', PORT];

// Add HTTPS flag if certs exist and HTTPS is enabled
if (certsExist) {
  args.push('--experimental-https');
  args.push('--experimental-https-key', keyPath);
  args.push('--experimental-https-cert', certPath);
}

console.log(chalk.cyan(`Starting Next.js with arguments: ${args.join(' ')}`));

const nextProcess = spawn('next', args, { 
  stdio: 'inherit',
  shell: true,
  env: { 
    ...process.env,
    NODE_ENV: 'development'
  }
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
  const protocol = certsExist ? 'https' : 'http';
  
  console.log(chalk.cyan('\n--------------------------------------'));
  console.log(chalk.cyan('🌐 MedConnect Frontend is running at:'));
  console.log(chalk.bold.green(`- Local:   ${protocol}://localhost:${PORT}`));
  
  ipAddresses.forEach(({ name, address }) => {
    console.log(chalk.bold.green(`- Network: ${protocol}://${address}:${PORT}  (${name})`));
  });
  
  console.log(chalk.cyan('\n🔗 For testing on mobile devices, use one of the Network URLs'));
  
  if (certsExist) {
    console.log(chalk.yellow('\n⚠️ Note: You may see security warnings because of the self-signed certificate.'));
    console.log(chalk.yellow('   This is normal for local development with HTTPS.'));
  } else {
    console.log(chalk.yellow('\n⚠️ No SSL certificates found. Running in HTTP mode.'));
    console.log(chalk.yellow('   Chrome will block camera/microphone access in HTTP mode on non-localhost devices.'));
    console.log(chalk.yellow('   Run "npm run generate-cert" to create certificates.'));
  }
  
  console.log(chalk.cyan('--------------------------------------'));
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nStopping Next.js server...'));
  nextProcess.kill('SIGINT');
  process.exit(0);
}); 