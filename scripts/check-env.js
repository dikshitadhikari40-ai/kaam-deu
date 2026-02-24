#!/usr/bin/env node

/**
 * Environment Variables Checker
 * 
 * Verifies that all required environment variables are set.
 * Run this before starting the app to catch missing config early.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function checkEnvFile(filePath, requiredVars, optionalVars = []) {
  const exists = fs.existsSync(filePath);
  
  if (!exists) {
    console.log(`${colors.red}✗${colors.reset} ${filePath} - NOT FOUND`);
    return { exists: false, missing: requiredVars, set: [] };
  }

  // Read .env file
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const setVars = new Set();
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([A-Z_]+)=/);
      if (match) {
        setVars.add(match[1]);
      }
    }
  });

  const missing = requiredVars.filter(v => !setVars.has(v));
  const set = requiredVars.filter(v => setVars.has(v));
  const optionalSet = optionalVars.filter(v => setVars.has(v));

  if (missing.length === 0) {
    console.log(`${colors.green}✓${colors.reset} ${filePath}`);
    console.log(`  ${colors.green}All required variables set${colors.reset} (${set.length}/${requiredVars.length})`);
    if (optionalSet.length > 0) {
      console.log(`  ${colors.cyan}Optional variables set: ${optionalSet.length}${colors.reset}`);
    }
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} ${filePath}`);
    console.log(`  ${colors.red}Missing: ${missing.join(', ')}${colors.reset}`);
    console.log(`  ${colors.green}Set: ${set.length}/${requiredVars.length}${colors.reset}`);
  }

  return { exists: true, missing, set, optionalSet };
}

function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Kaam Deu - Environment Variables Checker${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

  const rootDir = path.resolve(__dirname, '..');
  
  // Frontend environment check
  console.log(`${colors.cyan}Frontend Environment${colors.reset}`);
  console.log('─'.repeat(55));
  
  const frontendEnv = path.join(rootDir, 'frontend', '.env');
  const frontendRequired = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_API_URL',
  ];
  const frontendOptional = [
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
    'EXPO_PUBLIC_LINKEDIN_CLIENT_ID',
    'EXPO_PUBLIC_AGORA_APP_ID',
    'EXPO_PUBLIC_SENTRY_DSN',
  ];
  
  const frontendResult = checkEnvFile(frontendEnv, frontendRequired, frontendOptional);
  
  console.log('');
  
  // Backend environment check
  console.log(`${colors.cyan}Backend Environment${colors.reset}`);
  console.log('─'.repeat(55));
  
  const backendEnv = path.join(rootDir, 'backend', '.env');
  const backendRequired = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
  ];
  const backendOptional = [
    'JWT_SECRET',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'ESEWA_MERCHANT_ID',
    'AGORA_APP_ID',
    'AGORA_APP_CERTIFICATE',
  ];
  
  const backendResult = checkEnvFile(backendEnv, backendRequired, backendOptional);
  
  console.log('');
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  
  // Summary
  const allMissing = [...frontendResult.missing, ...backendResult.missing];
  const frontendOk = frontendResult.exists && frontendResult.missing.length === 0;
  const backendOk = backendResult.exists && backendResult.missing.length === 0;
  
  if (allMissing.length === 0 && frontendResult.exists && backendResult.exists) {
    console.log(`${colors.green}✓ All environment files configured correctly!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠ Some environment variables are missing${colors.reset}\n`);
    
    if (!frontendResult.exists) {
      console.log(`${colors.yellow}Action:${colors.reset} Copy frontend/.env.example to frontend/.env`);
    }
    if (!backendResult.exists) {
      console.log(`${colors.yellow}Action:${colors.reset} Copy backend/.env.example to backend/.env`);
    }
    if (allMissing.length > 0) {
      console.log(`${colors.yellow}Action:${colors.reset} Fill in missing variables in .env files`);
    }
    
    console.log('');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkEnvFile };
