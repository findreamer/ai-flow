'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { run } = require('../src/commands/status');

describe('commands/status.js', () => {
  let tmpDir;
  let originalCwd;
  let consoleOutput = '';

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-status-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    
    consoleOutput = '';
    console.log = (msg) => {
      consoleOutput += msg + '\n';
    };
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('outputs status header', async () => {
    await run();
    assert.ok(consoleOutput.includes('=== AI-Flow Status ==='));
  });

  it('shows project directory', async () => {
    await run();
    assert.ok(consoleOutput.includes(tmpDir));
  });

  it('detects and shows AI tools', async () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    await run();
    assert.ok(consoleOutput.includes('claude-code'));
  });

  it('shows installation status for each tool', async () => {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir);
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
      'ai-flow': { version: '1.0.0' }
    }));
    await run();
    assert.ok(consoleOutput.includes('installed'));
    assert.ok(consoleOutput.includes('1.0.0'));
  });

  it('shows directory contents', async () => {
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(path.join(claudeDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'skills', 'test-skill.md'), 'test');
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
      'ai-flow': { version: '1.0.0' }
    }));
    await run();
    assert.ok(consoleOutput.includes('skills:'));
  });
});
