'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { run } = require('../src/commands/init');

describe('commands/init.js', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-init-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates required directories', async () => {
    await run([]);
    const claudeDir = path.join(tmpDir, '.claude');
    assert.ok(fs.existsSync(path.join(claudeDir, 'skills')));
    assert.ok(fs.existsSync(path.join(claudeDir, 'agents')));
    assert.ok(fs.existsSync(path.join(claudeDir, 'commands')));
    assert.ok(fs.existsSync(path.join(claudeDir, 'workflows')));
    assert.ok(fs.existsSync(path.join(claudeDir, 'references')));
  });

  it('creates settings.json with ai-flow section', async () => {
    await run([]);
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    assert.ok(fs.existsSync(settingsPath));
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings['ai-flow']);
    assert.ok(settings['ai-flow'].version);
    assert.ok(settings['ai-flow'].installedAt);
  });

  it('creates CLAUDE.md with bootstrap', async () => {
    await run([]);
    const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
    assert.ok(fs.existsSync(claudePath));
    const content = fs.readFileSync(claudePath, 'utf8');
    assert.ok(content.includes('# AI-Flow Bootstrap'));
  });

  it('updates .gitignore with AI-Flow entries', async () => {
    await run([]);
    const gitignorePath = path.join(tmpDir, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath));
    const content = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(content.includes('# AI-Flow'));
    assert.ok(content.includes('.claude/settings.local.json'));
    assert.ok(content.includes('.claude/CLAUDE.local.md'));
  });

  it('uses specified tool via --tool flag', async () => {
    await run(['--tool', 'cursor']);
    const cursorDir = path.join(tmpDir, '.cursor');
    assert.ok(fs.existsSync(cursorDir));
    assert.ok(fs.existsSync(path.join(cursorDir, 'skills')));
  });

  it('detects existing tools and initializes all', async () => {
    fs.mkdirSync(path.join(tmpDir, '.claude'));
    fs.mkdirSync(path.join(tmpDir, '.opencode'));
    await run([]);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'skills')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.opencode', 'skills')));
  });
});
