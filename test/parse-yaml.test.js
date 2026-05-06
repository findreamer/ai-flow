'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseYaml } = require('../src/parse-yaml');

describe('parse-yaml.js', () => {
  describe('parseYaml', () => {
    it('parses basic workflow with name and version', () => {
      const content = `
name: Feature Development
version: 1.0.0
`;
      const result = parseYaml(content);
      assert.strictEqual(result.name, 'Feature Development');
      assert.strictEqual(result.version, '1.0.0');
      assert.deepStrictEqual(result.trigger, {});
      assert.deepStrictEqual(result.stages, []);
    });

    it('parses trigger section', () => {
      const content = `
name: Test
version: 1.0.0
trigger:
  type: command
  command: aiflow
`;
      const result = parseYaml(content);
      assert.deepStrictEqual(result.trigger, { type: 'command', command: 'aiflow' });
    });

    it('parses single stage', () => {
      const content = `
name: Test
version: 1.0.0
- name: Analyze Requirements
  agent: Architect
  model: sonnet
  skills: ["planning", "analysis"]
  input: feature-requirements.md
  output: architecture.md
  auto_continue: false
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages.length, 1);
      const stage = result.stages[0];
      assert.strictEqual(stage.name, 'Analyze Requirements');
      assert.strictEqual(stage.agent, 'Architect');
      assert.strictEqual(stage.model, 'sonnet');
      assert.deepStrictEqual(stage.skills, ['planning', 'analysis']);
      assert.strictEqual(stage.input, 'feature-requirements.md');
      assert.strictEqual(stage.output, 'architecture.md');
      assert.strictEqual(stage.auto_continue, false);
    });

    it('parses stage with human gate', () => {
      const content = `
name: Test
version: 1.0.0
- name: Design Approval
  agent: Designer
  human_gate:
    title: "Approve Design?"
    notify: "team@example.com"
    actions: ["approve", "reject", "revise"]
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages.length, 1);
      const stage = result.stages[0];
      assert.ok(stage.human_gate);
      assert.strictEqual(stage.human_gate.title, 'Approve Design?');
      assert.strictEqual(stage.human_gate.notify, 'team@example.com');
      assert.deepStrictEqual(stage.human_gate.actions, ['approve', 'reject', 'revise']);
    });

    it('parses stage with on_failure', () => {
      const content = `
name: Test
version: 1.0.0
- name: Test Execution
  agent: Tester
  on_failure:
    route_to: Coder
    max_retries: 5
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages.length, 1);
      const stage = result.stages[0];
      assert.ok(stage.on_failure);
      assert.strictEqual(stage.on_failure.route_to, 'Coder');
      assert.strictEqual(stage.on_failure.max_retries, 5);
    });

    it('parses multiple stages', () => {
      const content = `
name: Feature Development
version: 1.0.0
- name: Analyze
  agent: Architect
- name: Design
  agent: Designer
- name: Code
  agent: Coder
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages.length, 3);
      assert.strictEqual(result.stages[0].name, 'Analyze');
      assert.strictEqual(result.stages[0].agent, 'Architect');
      assert.strictEqual(result.stages[1].name, 'Design');
      assert.strictEqual(result.stages[1].agent, 'Designer');
      assert.strictEqual(result.stages[2].name, 'Code');
      assert.strictEqual(result.stages[2].agent, 'Coder');
    });

    it('ignores comments and empty lines', () => {
      const content = `
# This is a comment
name: Test
version: 1.0.0

# Another comment
- name: Stage 1
  agent: Agent1
`;
      const result = parseYaml(content);
      assert.strictEqual(result.name, 'Test');
      assert.strictEqual(result.version, '1.0.0');
      assert.strictEqual(result.stages.length, 1);
    });

    it('handles quoted strings in name and version', () => {
      const content = `
name: "Feature Development"
version: '1.0.0'
`;
      const result = parseYaml(content);
      assert.strictEqual(result.name, 'Feature Development');
      assert.strictEqual(result.version, '1.0.0');
    });

    it('defaults model to sonnet if not specified', () => {
      const content = `
name: Test
version: 1.0.0
- name: Stage 1
  agent: Agent1
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages[0].model, 'sonnet');
    });

    it('defaults auto_continue to false if not specified', () => {
      const content = `
name: Test
version: 1.0.0
- name: Stage 1
  agent: Agent1
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages[0].auto_continue, false);
    });

    it('defaults max_retries to 3 if not specified', () => {
      const content = `
name: Test
version: 1.0.0
- name: Stage 1
  agent: Agent1
  on_failure:
    route_to: Coder
`;
      const result = parseYaml(content);
      assert.strictEqual(result.stages[0].on_failure.max_retries, 3);
    });
  });
});
