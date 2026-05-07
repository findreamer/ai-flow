'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { run } = require('../src/commands/uninstall');

describe('commands/uninstall.js', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-uninstall-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
    
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(path.join(claudeDir, 'skills'), { recursive: true });
    fs.mkdirSync(path.join(claudeDir, 'agents'));
    fs.mkdirSync(path.join(claudeDir, 'commands'));
    fs.mkdirSync(path.join(claudeDir, 'workflows'));
    fs.mkdirSync(path.join(claudeDir, 'references'));
    fs.mkdirSync(path.join(claudeDir, 'rules'));
    fs.writeFileSync(path.join(claudeDir, 'skills', 'test-skill.md'), 'test');
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({
      'ai-flow': { version: '1.0.0' },
      other: 'config'
    }));
    fs.writeFileSync(path.join(claudeDir, 'CLAUDE.md'), 'Existing content\n# AI-Flow Bootstrap\nGenerated content');
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removes skills directory', async () => {
    await run();
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    assert.ok(!fs.existsSync(skillsDir));
  });

  it('removes agents directory', async () => {
    await run();
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    assert.ok(!fs.existsSync(agentsDir));
  });

  it('removes commands directory', async () => {
    await run();
    const commandsDir = path.join(tmpDir, '.claude', 'commands');
    assert.ok(!fs.existsSync(commandsDir));
  });

  it('removes workflows directory', async () => {
    await run();
    const workflowsDir = path.join(tmpDir, '.claude', 'workflows');
    assert.ok(!fs.existsSync(workflowsDir));
  });

  it('removes references directory', async () => {
    await run();
    const referencesDir = path.join(tmpDir, '.claude', 'references');
    assert.ok(!fs.existsSync(referencesDir));
  });

  it('removes rules directory', async () => {
    await run();
    const rulesDir = path.join(tmpDir, '.claude', 'rules');
    assert.ok(!fs.existsSync(rulesDir));
  });

  it('removes ai-flow section from settings.json', async () => {
    await run();
    const settingsPath = path.join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    assert.ok(!settings['ai-flow']);
    assert.strictEqual(settings.other, 'config');
  });

  it('removes AI-Flow bootstrap from CLAUDE.md', async () => {
    await run();
    const claudePath = path.join(tmpDir, '.claude', 'CLAUDE.md');
    const content = fs.readFileSync(claudePath, 'utf8');
    assert.ok(!content.includes('# AI-Flow Bootstrap'));
    assert.ok(content.includes('Existing content'));
  });
});