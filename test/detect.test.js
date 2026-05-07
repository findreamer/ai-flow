'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { detectAiTools, detectTechStack, detectExistingInstall } = require('../src/detect');

describe('detect.js', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-detect-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('detectAiTools', () => {
    it('returns claude-code by default when no markers found', () => {
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['claude-code']);
    });

    it('detects claude-code', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['claude-code']);
    });

    it('detects opencode', () => {
      fs.mkdirSync(path.join(tmpDir, '.opencode'));
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['opencode']);
    });

    it('detects cursor', () => {
      fs.mkdirSync(path.join(tmpDir, '.cursor'));
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['cursor']);
    });

    it('detects hermes', () => {
      fs.mkdirSync(path.join(tmpDir, '.hermes'));
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['hermes']);
    });

    it('detects trae', () => {
      fs.mkdirSync(path.join(tmpDir, '.trae'));
      const result = detectAiTools(tmpDir);
      assert.deepStrictEqual(result, ['trae']);
    });

    it('detects multiple tools', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      fs.mkdirSync(path.join(tmpDir, '.opencode'));
      fs.mkdirSync(path.join(tmpDir, '.cursor'));
      const result = detectAiTools(tmpDir);
      assert.ok(result.includes('claude-code'));
      assert.ok(result.includes('opencode'));
      assert.ok(result.includes('cursor'));
    });
  });

  describe('detectTechStack', () => {
    it('returns unknown when no markers found', () => {
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'unknown');
    });

    it('detects TypeScript via package.json with typescript dependency', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { typescript: '^5.0.0' }
      }));
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'typescript');
    });

    it('detects TypeScript via package.json with typescript devDependency', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        devDependencies: { typescript: '^5.0.0' }
      }));
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'typescript');
    });

    it('does not detect TypeScript in package.json without typescript', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
        dependencies: { react: '^18.0.0' }
      }));
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'unknown');
    });

    it('detects Python via pyproject.toml', () => {
      fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"');
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'python');
    });

    it('detects Python via requirements.txt', () => {
      fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'requests==2.31.0');
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'python');
    });

    it('detects Java via pom.xml', () => {
      fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project></project>');
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'java');
    });

    it('detects Java via build.gradle', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle'), 'plugins { }');
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'java');
    });

    it('detects Java via build.gradle.kts', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle.kts'), 'plugins { }');
      const result = detectTechStack(tmpDir);
      assert.strictEqual(result, 'java');
    });
  });

  describe('detectExistingInstall', () => {
    it('returns not installed when no settings.json', () => {
      const result = detectExistingInstall(tmpDir);
      assert.deepStrictEqual(result, { installed: false });
    });

    it('returns not installed when settings.json exists but no ai-flow section', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        other: 'config'
      }));
      const result = detectExistingInstall(tmpDir);
      assert.deepStrictEqual(result, { installed: false });
    });

    it('returns installed with version when ai-flow section exists', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        'ai-flow': { version: '1.0.0' }
      }));
      const result = detectExistingInstall(tmpDir);
      assert.ok(result.installed);
      assert.strictEqual(result.version, '1.0.0');
    });

    it('returns installed with unknown version when ai-flow exists but no version', () => {
      fs.mkdirSync(path.join(tmpDir, '.claude'));
      fs.writeFileSync(path.join(tmpDir, '.claude', 'settings.json'), JSON.stringify({
        'ai-flow': {}
      }));
      const result = detectExistingInstall(tmpDir);
      assert.ok(result.installed);
      assert.strictEqual(result.version, 'unknown');
    });
  });
});
