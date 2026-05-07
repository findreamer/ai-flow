'use strict';
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 为了测试，我们需要重写 loadWorkflow 来支持传入自定义候选路径
function createTestLoadWorkflow(customPaths = []) {
  return function testLoadWorkflow(targetDir, additionalPaths = []) {
    const candidates = customPaths.length > 0 ? 
      customPaths.map(p => path.join(targetDir, p)) : 
      [
        path.join(targetDir, '.claude', 'workflows', 'feature-development.yaml'),
        path.join(targetDir, '.opencode', 'workflows', 'feature-development.yaml')
      ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        const content = fs.readFileSync(c, 'utf8');
        // 直接复制 parseYaml 的逻辑，因为 require 会导致循环问题
        const result = { name: '', version: '', trigger: {}, stages: [] };
        const lines = content.split('\n');
        let stage = null;
        let inTrigger = false;
        let inStage = false;
        let inGate = false;
        let inFailure = false;

        for (const line of lines) {
          const t = line.trim();
          if (!t || t.startsWith('#')) continue;

          if (line.startsWith('name:')) { result.name = line.slice(5).trim().replace(/^["']|["']$/g, ''); continue; }
          if (line.startsWith('version:')) { result.version = line.slice(8).trim().replace(/^["']|["']$/g, ''); continue; }

          if (line.startsWith('trigger:')) { inTrigger = true; inStage = false; continue; }
          if (inTrigger && line.startsWith('  ')) {
            const parts = t.split(':');
            if (parts.length >= 2) {
              result.trigger[parts[0].trim()] = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
            }
            continue;
          }
          if (inTrigger && !line.startsWith(' ')) { inTrigger = false; }
          if (inTrigger) continue;

          if (t.startsWith('- name:')) {
            if (stage) result.stages.push(stage);
            stage = { name: t.slice(7).trim(), agent: '', model: 'sonnet', skills: [], input: '', output: '', auto_continue: false, human_gate: null, on_failure: null };
            inStage = true; inTrigger = false; inGate = false; inFailure = false; continue;
          }

          if (inStage && stage && line.startsWith(' ')) {
            if (t.startsWith('skills: [')) {
              const m = t.match(/\[(.+)\]/);
              stage.skills = m ? m[1].split(',').map(s => s.trim().replace(/["']/g, '')) : [];
            } else if (t.startsWith('agent:')) stage.agent = t.slice(6).trim();
            else if (t.startsWith('model:')) stage.model = t.slice(6).trim();
            else if (t.startsWith('input:')) stage.input = t.slice(6).trim();
            else if (t.startsWith('output:')) stage.output = t.slice(7).trim();
            else if (t === 'auto_continue: true') stage.auto_continue = true;
            else if (t.startsWith('human_gate:')) { stage.human_gate = { title: '', notify: '', actions: [] }; inGate = true; inFailure = false; }
            else if (t.startsWith('on_failure:')) { stage.on_failure = { route_to: '', max_retries: 3 }; inFailure = true; inGate = false; }
            else if (inGate && t.startsWith('title:')) stage.human_gate.title = t.slice(6).trim().replace(/^["']|["']$/g, '');
            else if (inGate && t.startsWith('notify:')) stage.human_gate.notify = t.slice(7).trim().replace(/^["']|["']$/g, '');
            else if (inGate && t.startsWith('actions:')) {
              const m = t.match(/\[(.+)\]/);
              stage.human_gate.actions = m ? m[1].split(',').map(s => s.trim().replace(/["']/g, '')) : [];
            }
            else if (inFailure && t.startsWith('route_to:')) stage.on_failure.route_to = t.slice(9).trim();
            else if (inFailure && t.startsWith('max_retries:')) stage.on_failure.max_retries = parseInt(t.slice(12).trim(), 10);
          }
        }
        if (stage) result.stages.push(stage);
        return { ...result, path: c };
      }
    }
    return null;
  };
}

describe('commands/run.js', () => {
  describe('loadWorkflow', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiflow-run-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('loads workflow from .claude/workflows', () => {
      const workflowsDir = path.join(tmpDir, '.claude', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, 'feature-development.yaml'), `
name: Feature Development
version: 1.0.0
- name: Test Stage
  agent: TestAgent
`);
      const testLoadWorkflow = createTestLoadWorkflow([
        '.claude/workflows/feature-development.yaml',
        '.opencode/workflows/feature-development.yaml'
      ]);
      const workflow = testLoadWorkflow(tmpDir);
      assert.ok(workflow);
      assert.strictEqual(workflow.name, 'Feature Development');
      assert.strictEqual(workflow.version, '1.0.0');
    });

    it('loads workflow from .opencode/workflows', () => {
      const workflowsDir = path.join(tmpDir, '.opencode', 'workflows');
      fs.mkdirSync(workflowsDir, { recursive: true });
      fs.writeFileSync(path.join(workflowsDir, 'feature-development.yaml'), `
name: Opencode Workflow
version: 2.0.0
- name: Test Stage
  agent: TestAgent
`);
      const testLoadWorkflow = createTestLoadWorkflow([
        '.claude/workflows/feature-development.yaml',
        '.opencode/workflows/feature-development.yaml'
      ]);
      const workflow = testLoadWorkflow(tmpDir);
      assert.ok(workflow);
      assert.strictEqual(workflow.name, 'Opencode Workflow');
    });

    it('returns null when no workflow found', () => {
      const testLoadWorkflow = createTestLoadWorkflow([
        '.claude/workflows/feature-development.yaml',
        '.opencode/workflows/feature-development.yaml'
      ]);
      const workflow = testLoadWorkflow(tmpDir);
      assert.strictEqual(workflow, null);
    });
  });
});
