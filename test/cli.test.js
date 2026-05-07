'use strict';
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const BIN = path.join(__dirname, '..', 'bin', 'ai-flow.js');

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

function run(args, cwd) {
  return execSync(`node ${BIN} ${args}`, { cwd: cwd || process.cwd() }).toString();
}
function runFail(args, cwd) {
  try {
    execSync(`node ${BIN} ${args}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: cwd || process.cwd()
    });
    return null;
  } catch (e) {
    return e;
  }
}

describe('CLI basic', () => {
  it('shows help with --help', () => {
    const o = run('--help');
    assert.ok(o.includes('Usage'));
    assert.ok(o.includes('aiflow'));
    assert.ok(o.includes('init'));
    assert.ok(o.includes('--sync'));
  });

  it('shows help with -h', () => {
    const o = run('-h');
    assert.ok(o.includes('Usage'));
  });

  it('shows version', () => {
    const o = run('--version');
    assert.ok(/\d+\.\d+\.\d+/.test(o));
  });

  it('errors on unknown option', () => {
    const e = runFail('--foo');
    assert.ok(e !== null);
  });

  it('bare word acts as feature shortcut', () => {
    const o = run('my-feature');
    assert.ok(o.includes('AI-Flow'));
  });
});

describe('CLI init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-cli-init-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates skills/agents/commands/workflows/references/ directories', () => {
    run('init', tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'skills')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'agents')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'commands')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'workflows')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'references')));
  });

  it('writes CLAUDE.md with AI-Flow bootstrap', () => {
    run('init', tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('AI-Flow'));
  });

  it('creates settings.json with ai-flow section', () => {
    run('init', tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'settings.json')));
    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings['ai-flow']);
    assert.ok(settings['ai-flow'].version);
  });

  it('supports --tool flag for specific AI tool', () => {
    run('init --tool cursor', tmpDir);
    assert.ok(fs.existsSync(path.join(tmpDir, '.cursor', 'skills')));
  });
});

describe('CLI status', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-cli-status-'));
    run('init', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows status output', () => {
    const o = run('--status', tmpDir);
    assert.ok(o.includes('AI-Flow Status'));
  });
});

describe('CLI sync', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-cli-sync-'));
    run('init', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs sync command', () => {
    const o = run('--sync', tmpDir);
    assert.ok(o.includes('AI-Flow Sync'));
  });
});

describe('CLI uninstall', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-cli-uninstall-'));
    run('init', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('requires --force flag to uninstall', () => {
    const o = run('--uninstall', tmpDir);
    assert.ok(o.includes('This will remove AI-Flow configurations'));
  });
});

describe('CLI run', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-cli-run-'));
    run('init', tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs with --feature flag', () => {
    const o = run('run --feature "test feature"', tmpDir);
    assert.ok(o.includes('AI-Flow'));
    assert.ok(o.includes('test feature'));
  });
});
