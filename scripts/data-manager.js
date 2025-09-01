#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const BACKEND_DIR = path.resolve(process.cwd(), 'backend');
const API_BASE = 'http://localhost:3000/api/data';

/**
 * Make HTTP request to API
 */
async function apiRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : null,
    });
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check if backend server is running
 */
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Start backend server if not running
 */
async function ensureServerRunning() {
  const isRunning = await checkServer();
  
  if (!isRunning) {
    console.log('Starting backend server...');
    try {
      // Start server in background
      execSync('npm run dev:backend', { 
        cwd: BACKEND_DIR, 
        stdio: 'inherit',
        detached: true 
      });
      
      // Wait for server to start
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (await checkServer()) {
          console.log('Backend server started successfully');
          return true;
        }
        attempts++;
      }
      
      console.error('Failed to start backend server');
      return false;
    } catch (error) {
      console.error('Failed to start backend server:', error.message);
      return false;
    }
  }
  
  return true;
}

/**
 * Initialize data management system
 */
async function initializeData() {
  console.log('Initializing data management system...');
  
  const response = await apiRequest('/initialize', 'POST');
  
  if (response.success) {
    console.log('✅ Data management system initialized');
    console.log(`📊 Stats: ${JSON.stringify(response.data, null, 2)}`);
  } else {
    console.error('❌ Failed to initialize:', response.error);
  }
}

/**
 * Initialize Git repository
 */
async function initializeGit() {
  console.log('Initializing Git repository for data management...');
  
  const response = await apiRequest('/git/init', 'POST');
  
  if (response.success) {
    console.log('✅ Git repository initialized');
  } else {
    console.error('❌ Failed to initialize Git repository:', response.error);
  }
}

/**
 * Export data to Git
 */
async function exportToGit(userId = null, commitMessage = null) {
  console.log('Exporting data to Git repository...');
  
  const response = await apiRequest('/git/export', 'POST', {
    userId,
    commitMessage
  });
  
  if (response.success) {
    console.log('✅ Data exported to Git repository');
    console.log(`📁 Location: ${response.data.gitPath}`);
  } else {
    console.error('❌ Failed to export to Git:', response.error);
  }
}

/**
 * Create Tangled export
 */
async function exportForTangled(userId) {
  if (!userId) {
    console.error('❌ User ID is required for Tangled export');
    return;
  }
  
  console.log(`Creating Tangled export for user: ${userId}...`);
  
  const response = await apiRequest(`/export/tangled/${userId}`, 'POST');
  
  if (response.success) {
    console.log('✅ Tangled export created');
    console.log(`📁 Location: ${response.data.exportPath}`);
  } else {
    console.error('❌ Failed to create Tangled export:', response.error);
  }
}

/**
 * Create CSV export
 */
async function exportToCSV(userId = null) {
  console.log('Creating CSV export...');
  
  const endpoint = userId ? `/export/csv?userId=${userId}` : '/export/csv';
  const response = await apiRequest(endpoint, 'POST');
  
  if (response.success) {
    console.log('✅ CSV export created');
    console.log(`📁 Location: ${response.data.exportPath}`);
  } else {
    console.error('❌ Failed to create CSV export:', response.error);
  }
}

/**
 * Show Git status
 */
async function showGitStatus() {
  console.log('Checking Git repository status...');
  
  const response = await apiRequest('/git/status');
  
  if (response.success) {
    const status = response.data;
    console.log('📊 Git Repository Status:');
    console.log(`   Initialized: ${status.initialized ? '✅' : '❌'}`);
    console.log(`   Total commits: ${status.totalCommits}`);
    console.log(`   Uncommitted changes: ${status.uncommittedChanges ? '⚠️  Yes' : '✅ No'}`);
    if (status.lastCommit) {
      console.log(`   Last commit: ${status.lastCommit}`);
    }
  } else {
    console.error('❌ Failed to get Git status:', response.error);
  }
}

/**
 * List exports
 */
async function listExports() {
  console.log('Listing available exports...');
  
  const response = await apiRequest('/exports');
  
  if (response.success) {
    const exports = response.data;
    if (exports.length === 0) {
      console.log('📁 No exports found');
      return;
    }
    
    console.log('📁 Available exports:');
    exports.forEach(exp => {
      const size = (exp.size / 1024).toFixed(2);
      console.log(`   ${exp.fileName} (${exp.type}, ${size} KB, ${exp.createdAt})`);
    });
  } else {
    console.error('❌ Failed to list exports:', response.error);
  }
}

/**
 * Show data statistics
 */
async function showStats() {
  console.log('Getting data statistics...');
  
  const response = await apiRequest('/stats');
  
  if (response.success) {
    const stats = response.data;
    console.log('📊 Data Statistics:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   Words: ${stats.words}`);
    console.log(`   Backups: ${stats.backups}`);
  } else {
    console.error('❌ Failed to get statistics:', response.error);
  }
}

/**
 * Create backup
 */
async function createBackup() {
  console.log('Creating data backup...');
  
  const response = await apiRequest('/backup', 'POST');
  
  if (response.success) {
    console.log('✅ Backup created successfully');
    console.log(`📁 Location: ${response.data.backupPath}`);
  } else {
    console.error('❌ Failed to create backup:', response.error);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
Bluesky LangApp Data Manager

Usage: node scripts/data-manager.js <command> [options]

Commands:
  init                    Initialize data management system
  git-init               Initialize Git repository
  git-export [userId]    Export data to Git repository
  git-status             Show Git repository status
  tangled-export <userId> Create Tangled-compatible export
  csv-export [userId]    Create CSV export
  list-exports           List available exports
  stats                  Show data statistics
  backup                 Create data backup

Examples:
  node scripts/data-manager.js init
  node scripts/data-manager.js git-export user123 "Update learning progress"
  node scripts/data-manager.js tangled-export user123
  node scripts/data-manager.js csv-export
`);
    return;
  }
  
  // Ensure server is running for API commands
  if (!await ensureServerRunning()) {
    console.error('❌ Cannot proceed without backend server');
    process.exit(1);
  }
  
  switch (command) {
    case 'init':
      await initializeData();
      break;
      
    case 'git-init':
      await initializeGit();
      break;
      
    case 'git-export':
      await exportToGit(args[1], args[2]);
      break;
      
    case 'git-status':
      await showGitStatus();
      break;
      
    case 'tangled-export':
      await exportForTangled(args[1]);
      break;
      
    case 'csv-export':
      await exportToCSV(args[1]);
      break;
      
    case 'list-exports':
      await listExports();
      break;
      
    case 'stats':
      await showStats();
      break;
      
    case 'backup':
      await createBackup();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run CLI
main().catch(error => {
  console.error('❌ CLI error:', error);
  process.exit(1);
});