'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { log, resolveToolPath, copyDir, fileExists, readJson, writeJson, writeText, appendText, getPkgRoot } = require('../src/utils');

describe('utils.js', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-utils-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('resolveToolPath', () => {
    it('returns correct path for claude-code', () => {
      const result = resolveToolPath(tmpDir, 'claude-code');
      assert.strictEqual(result, path.join(tmpDir, '.claude'));
    });

    it('returns correct path for opencode', () => {
      const result = resolveToolPath(tmpDir, 'opencode');
      assert.strictEqual(result, path.join(tmpDir, '.opencode'));
    });

    it('returns correct path for cursor', () => {
      const result = resolveToolPath(tmpDir, 'cursor');
      assert.strictEqual(result, path.join(tmpDir, '.cursor'));
    });

    it('returns correct path for hermes', () => {
      const result = resolveToolPath(tmpDir, 'hermes');
      assert.strictEqual(result, path.join(tmpDir, '.hermes'));
    });

    it('returns correct path for trae', () => {
      const result = resolveToolPath(tmpDir, 'trae');
      assert.strictEqual(result, path.join(tmpDir, '.trae'));
    });

    it('defaults to .claude for unknown tools', () => {
      const result = resolveToolPath(tmpDir, 'unknown');
      assert.strictEqual(result, path.join(tmpDir, '.claude'));
    });
  });

  describe('fileExists', () => {
    it('returns true for existing files', () => {
      const testFile = path.join(tmpDir, 'test.txt');
      fs.writeFileSync(testFile, 'content');
      assert.strictEqual(fileExists(testFile), true);
    });

    it('returns false for non-existing files', () => {
      const testFile = path.join(tmpDir, 'nonexistent.txt');
      assert.strictEqual(fileExists(testFile), false);
    });
  });

  describe('readJson / writeJson', () => {
    it('writes and reads JSON file', () => {
      const testFile = path.join(tmpDir, 'test.json');
      const data = { foo: 'bar', num: 42 };
      writeJson(testFile, data);
      const readData = readJson(testFile);
      assert.deepStrictEqual(readData, data);
    });

    it('creates parent directories when writing JSON', () => {
      const testFile = path.join(tmpDir, 'sub', 'dir', 'test.json');
      const data = { foo: 'bar' };
      writeJson(testFile, data);
      assert.ok(fs.existsSync(testFile));
    });

    it('returns null for non-existing JSON file', () => {
      const testFile = path.join(tmpDir, 'nonexistent.json');
      assert.strictEqual(readJson(testFile), null);
    });
  });

  describe('writeText / appendText', () => {
    it('writes text to file', () => {
      const testFile = path.join(tmpDir, 'test.txt');
      writeText(testFile, 'hello world');
      assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'hello world');
    });

    it('creates parent directories when writing text', () => {
      const testFile = path.join(tmpDir, 'sub', 'dir', 'test.txt');
      writeText(testFile, 'hello');
      assert.ok(fs.existsSync(testFile));
    });

    it('appends text to existing file', () => {
      const testFile = path.join(tmpDir, 'test.txt');
      writeText(testFile, 'hello');
      appendText(testFile, ' world');
      assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'hello world');
    });

    it('appends text to non-existing file', () => {
      const testFile = path.join(tmpDir, 'sub', 'dir', 'test.txt');
      appendText(testFile, 'hello world');
      assert.strictEqual(fs.readFileSync(testFile, 'utf8'), 'hello world');
    });
  });

  describe('copyDir', () => {
    it('copies directory with files', () => {
      const srcDir = path.join(tmpDir, 'src');
      const destDir = path.join(tmpDir, 'dest');
      fs.mkdirSync(srcDir);
      fs.writeFileSync(path.join(srcDir, 'file1.txt'), 'content1');
      fs.mkdirSync(path.join(srcDir, 'subdir'));
      fs.writeFileSync(path.join(srcDir, 'subdir', 'file2.txt'), 'content2');

      copyDir(srcDir, destDir);

      assert.ok(fs.existsSync(path.join(destDir, 'file1.txt')));
      assert.strictEqual(fs.readFileSync(path.join(destDir, 'file1.txt'), 'utf8'), 'content1');
      assert.ok(fs.existsSync(path.join(destDir, 'subdir', 'file2.txt')));
      assert.strictEqual(fs.readFileSync(path.join(destDir, 'subdir', 'file2.txt'), 'utf8'), 'content2');
    });

    it('does nothing when source directory does not exist', () => {
      const srcDir = path.join(tmpDir, 'nonexistent');
      const destDir = path.join(tmpDir, 'dest');
      copyDir(srcDir, destDir);
      assert.ok(!fs.existsSync(destDir));
    });
  });

  describe('getPkgRoot', () => {
    it('returns valid package root directory', () => {
      const root = getPkgRoot();
      assert.ok(fs.existsSync(path.join(root, 'package.json')));
      assert.ok(fs.existsSync(path.join(root, 'src')));
    });
  });
});
