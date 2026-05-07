'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { run } = require('../src/commands/sync');
const { getPkgRoot } = require('../src/utils');

describe('commands/sync.js', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-sync-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir);
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
      'ai-flow': { version: '0.0.1' }
    }));
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('updates version in settings.json', async () => {
    await run();
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(settings['ai-flow']);
    assert.ok(settings['ai-flow'].lastSynced);
    assert.notStrictEqual(settings['ai-flow'].version, '0.0.1');
  });

  it('copies skills directory', async () => {
    await run();
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    assert.ok(fs.existsSync(skillsDir));
  });

  it('copies agents directory', async () => {
    await run();
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    assert.ok(fs.existsSync(agentsDir));
  });

  it('copies commands directory', async () => {
    await run();
    const commandsDir = path.join(tmpDir, '.claude', 'commands');
    assert.ok(fs.existsSync(commandsDir));
  });

  it('copies workflows directory', async () => {
    await run();
    const workflowsDir = path.join(tmpDir, '.claude', 'workflows');
    assert.ok(fs.existsSync(workflowsDir));
  });

  it('copies references directory', async () => {
    await run();
    const referencesDir = path.join(tmpDir, '.claude', 'references');
    assert.ok(fs.existsSync(referencesDir));
  });
});
