const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const os = require('os');

// Get local IP addresses
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip loopback (127.0.0.1) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  return addresses;
}

// Certificates directory
const certsDir = path.join(__dirname, '..', 'certs');

// Ensure certs directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

// Certificate files
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');
const configPath = path.join(certsDir, 'openssl.cnf');

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log(chalk.green('✅ SSL certificates already exist'));
  console.log(chalk.gray(`   Key: ${keyPath}`));
  console.log(chalk.gray(`   Cert: ${certPath}`));
  process.exit(0);
}

console.log(chalk.cyan('🔐 Generating self-signed SSL certificate for local development...'));

try {
  // Get local IP addresses for Subject Alternative Names
  const ipAddresses = getLocalIpAddresses();
  
  // Create OpenSSL config file with SAN entries
  const opensslConfig = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
${ipAddresses.map((ip, index) => `IP.${index + 1} = ${ip}`).join('\n')}
DNS.1 = localhost
DNS.2 = *.localhost
`;

  // Write config to file
  fs.writeFileSync(configPath, opensslConfig);
  console.log(chalk.gray(`Created OpenSSL config at: ${configPath}`));
  
  // Command to generate certificate
  const command = `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365 -config "${configPath}"`;
  
  // Execute the command
  console.log(chalk.gray(`Running: ${command}`));
  execSync(command, { stdio: 'inherit' });
  
  console.log(chalk.green('✅ SSL certificates generated successfully'));
  console.log(chalk.gray(`   Key: ${keyPath}`));
  console.log(chalk.gray(`   Cert: ${certPath}`));
  
  console.log(chalk.yellow('\n⚠️ Important: You will need to add this certificate to your trusted roots'));
  console.log(chalk.yellow('   on each device that will access the application.'));
  
} catch (error) {
  console.error(chalk.red('Error generating SSL certificates:'), error.message);
  console.log(chalk.yellow('\nAlternative method: Create certificates manually using OpenSSL:'));
  console.log(chalk.gray('1. Install OpenSSL if not already installed'));
  console.log(chalk.gray(`2. Run: openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 365`));
  
  process.exit(1);
} 