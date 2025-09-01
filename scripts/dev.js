#!/usr/bin/env node

/**
 * Development script for Bluesky LangApp
 * Provides utilities for development workflow
 */

const { spawn } = require('child_process');
const path = require('path');

const commands = {
  'backend': () => {
    console.log('🚀 Starting backend development server...');
    const backend = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'inherit'
    });
    
    backend.on('close', (code) => {
      console.log(`Backend server exited with code ${code}`);
    });
  },
  
  'build': () => {
    console.log('🔨 Building backend...');
    const build = spawn('npm', ['run', 'build'], {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'inherit'
    });
    
    build.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build completed successfully');
      } else {
        console.log(`❌ Build failed with code ${code}`);
      }
    });
  },
  
  'test': () => {
    console.log('🧪 Running tests...');
    console.log('Tests will be implemented in later tasks');
  }
};

const command = process.argv[2];

if (!command || !commands[command]) {
  console.log('Available commands:');
  console.log('  backend  - Start backend development server');
  console.log('  build    - Build the backend');
  console.log('  test     - Run tests (to be implemented)');
  process.exit(1);
}

commands[command]();