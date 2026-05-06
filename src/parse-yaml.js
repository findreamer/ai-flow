'use strict';
// Minimal YAML parser for workflow files
// Handles: top-level keys, trigger section, stages with nested objects/arrays

function parseYaml(content) {
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
      else if (inGate && t.startsWith('title:')) stage.human_gate.title = t.slice(6).trim().replace(/"/g, '');
      else if (inGate && t.startsWith('notify:')) stage.human_gate.notify = t.slice(7).trim();
      else if (inGate && t.startsWith('actions:')) {
        const m = t.match(/\[(.+)\]/);
        stage.human_gate.actions = m ? m[1].split(',').map(s => s.trim().replace(/["']/g, '')) : [];
      }
      else if (inFailure && t.startsWith('route_to:')) stage.on_failure.route_to = t.slice(9).trim();
      else if (inFailure && t.startsWith('max_retries:')) stage.on_failure.max_retries = parseInt(t.slice(12).trim(), 10);
    }
  }
  if (stage) result.stages.push(stage);
  return result;
}

module.exports = { parseYaml };
