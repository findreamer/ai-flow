const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const BIN = path.join(__dirname, '..', 'bin', 'ai-flow.js');

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

function run(args) { return execSync(`node ${BIN} ${args}`).toString(); }
function runFail(args) {
  try { execSync(`node ${BIN} ${args}`, { stdio: ['pipe', 'pipe', 'pipe'] }); return null; }
  catch (e) { return e; }
}

describe('CLI basic', () => {
  it('shows help', () => {
    const o = run('--help');
    assert.ok(o.includes('Usage'));
    assert.ok(o.includes('aiflow'));
    assert.ok(o.includes('init'));
    assert.ok(o.includes('--sync'));
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
    assert.ok(o.includes('AI-Flow Run'));
  });

});

describe('CLI init', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-'));
    fs.mkdirSync(path.join(tmpDir, '.claude'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('creates skills/ agents/ commands/ workflows/ references/ directories', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'skills')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'agents')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'commands')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'workflows')));
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'references')));
  });

  it('writes CLAUDE.md with AI-Flow bootstrap', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    const content = fs.readFileSync(path.join(tmpDir, '.claude', 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('AI-Flow'));
  });

  it('creates settings.json from template', () => {
    execSync(`node ${BIN} init`, { cwd: tmpDir });
    assert.ok(fs.existsSync(path.join(tmpDir, '.claude', 'settings.json')));
    const settings = JSON.parse(fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings['ai-flow']);
    assert.ok(settings['ai-flow'].version);
  });
});
