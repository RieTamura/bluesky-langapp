#!/usr/bin/env node

/**
 * Validation script to check if the project foundation is properly set up
 */

const fs = require('fs');
const path = require('path');

const checks = [
  {
    name: 'TypeScript configuration',
    check: () => fs.existsSync('tsconfig.json') && fs.existsSync('backend/tsconfig.json')
  },
  {
    name: 'Package.json files',
    check: () => fs.existsSync('package.json') && fs.existsSync('backend/package.json')
  },
  {
    name: 'Backend source structure',
    check: () => fs.existsSync('backend/src/server.ts') && fs.existsSync('backend/src/types/index.ts')
  },
  {
    name: 'Environment configuration',
    check: () => fs.existsSync('backend/.env') && fs.existsSync('backend/.env.example')
  },
  {
    name: 'Frontend placeholder',
    check: () => fs.existsSync('frontend/index.html')
  },
  {
    name: 'Git configuration',
    check: () => fs.existsSync('.gitignore')
  },
  {
    name: 'Documentation',
    check: () => fs.existsSync('README.md')
  },
  {
    name: 'Backend build output',
    check: () => fs.existsSync('backend/dist/server.js')
  }
];

console.log('🔍 Validating project foundation setup...\n');

let allPassed = true;

checks.forEach(({ name, check }) => {
  const passed = check();
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${name}`);
  if (!passed) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Project foundation is properly set up.');
  console.log('\nNext steps:');
  console.log('- Run "npm run dev:backend" to start the development server');
  console.log('- Continue with the next task in the implementation plan');
} else {
  console.log('❌ Some checks failed. Please review the setup.');
  process.exit(1);
}

console.log('\n📋 Task 1 (プロジェクト基盤の構築) completed successfully!');