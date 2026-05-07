'use strict';
// Enhanced YAML parser for workflow files
// Handles: top-level keys, trigger section, stages with nested objects/arrays
// More robust and supports additional features

function trimQuotes(str) {
  return str.trim().replace(/^["']|["']$/g, '');
}

function parseInlineArray(str) {
  const match = str.match(/\[(.+)\]/);
  if (!match) return [];
  return match[1].split(',').map(s => trimQuotes(s)).filter(s => s.length > 0);
}

function parseYaml(content) {
  const result = { name: '', version: '', description: '', trigger: {}, stages: [] };
  const lines = content.split('\n');
  
  let stage = null;
  let inTrigger = false;
  let inStage = false;
  let inGate = false;
  let inFailure = false;
  let inDescription = false;
  let descriptionLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    const indent = line.search(/\S/);

    if (!t || t.startsWith('#')) continue;

    if (line.startsWith('name:')) { 
      result.name = trimQuotes(line.slice(5)); 
      inDescription = false;
      continue; 
    }
    if (line.startsWith('version:')) { 
      result.version = trimQuotes(line.slice(8)); 
      inDescription = false;
      continue; 
    }
    if (line.startsWith('description:')) { 
      const descPart = line.slice(12).trim();
      if (descPart) {
        result.description = trimQuotes(descPart);
      } else {
        inDescription = true;
        descriptionLines = [];
      }
      continue;
    }

    if (inDescription && indent > 0) {
      descriptionLines.push(t);
      continue;
    } else if (inDescription && indent === 0) {
      result.description = descriptionLines.join('\n');
      inDescription = false;
    }

    if (line.startsWith('trigger:')) { 
      inTrigger = true; 
      inStage = false; 
      inDescription = false;
      continue; 
    }
    if (inTrigger && indent >= 2) {
      const parts = t.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        result.trigger[key] = trimQuotes(value);
      }
      continue;
    }
    if (inTrigger && indent === 0) { 
      inTrigger = false; 
    }
    if (inTrigger) continue;

    if (t.startsWith('- name:')) {
      if (stage) result.stages.push(stage);
      stage = { 
        name: trimQuotes(t.slice(7)), 
        agent: '', 
        model: 'sonnet', 
        skills: [], 
        input: '', 
        output: '', 
        auto_continue: false, 
        human_gate: null, 
        on_failure: null 
      };
      inStage = true; 
      inTrigger = false; 
      inGate = false; 
      inFailure = false; 
      continue;
    }

    if (inStage && stage && indent >= 2) {
      if (t.startsWith('skills: [')) {
        stage.skills = parseInlineArray(t);
      } else if (t.startsWith('skills:')) {
        const listStart = i + 1;
        let j = listStart;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('- ')) {
            stage.skills.push(trimQuotes(nextLine.slice(2)));
            j++;
          } else {
            break;
          }
        }
        i = j - 1;
      } else if (t.startsWith('agent:')) {
        stage.agent = trimQuotes(t.slice(6));
      } else if (t.startsWith('model:')) {
        stage.model = trimQuotes(t.slice(6));
      } else if (t.startsWith('input:')) {
        stage.input = trimQuotes(t.slice(6));
      } else if (t.startsWith('output:')) {
        stage.output = trimQuotes(t.slice(7));
      } else if (t.startsWith('auto_continue:')) {
        stage.auto_continue = t.slice(13).trim() === 'true';
      } else if (t.startsWith('human_gate:')) {
        stage.human_gate = { title: '', notify: '', actions: [] };
        inGate = true;
        inFailure = false;
      } else if (t.startsWith('on_failure:')) {
        stage.on_failure = { route_to: '', max_retries: 3 };
        inFailure = true;
        inGate = false;
      } else if (inGate) {
        if (t.startsWith('title:')) {
          stage.human_gate.title = trimQuotes(t.slice(6));
        } else if (t.startsWith('notify:')) {
          stage.human_gate.notify = trimQuotes(t.slice(7));
        } else if (t.startsWith('actions: [')) {
          stage.human_gate.actions = parseInlineArray(t);
        } else if (t.startsWith('actions:')) {
          const listStart = i + 1;
          let j = listStart;
          while (j < lines.length) {
            const nextLine = lines[j].trim();
            if (nextLine.startsWith('- ')) {
              stage.human_gate.actions.push(trimQuotes(nextLine.slice(2)));
              j++;
            } else {
              break;
            }
          }
          i = j - 1;
        }
      } else if (inFailure) {
        if (t.startsWith('route_to:')) {
          stage.on_failure.route_to = trimQuotes(t.slice(9));
        } else if (t.startsWith('max_retries:')) {
          const num = parseInt(t.slice(12).trim(), 10);
          stage.on_failure.max_retries = isNaN(num) ? 3 : num;
        }
      }
    }
  }
  
  if (inDescription && descriptionLines.length > 0) {
    result.description = descriptionLines.join('\n');
  }
  
  if (stage) result.stages.push(stage);
  return result;
}

function validateWorkflow(workflow) {
  const errors = [];
  
  if (!workflow.name) errors.push('Workflow name is required');
  if (!workflow.version) errors.push('Workflow version is required');
  if (!workflow.stages || workflow.stages.length === 0) {
    errors.push('Workflow must have at least one stage');
  }
  
  workflow.stages.forEach((stage, idx) => {
    if (!stage.name) errors.push(`Stage ${idx + 1} is missing a name`);
    if (!stage.agent) errors.push(`Stage ${idx + 1} (${stage.name}) is missing an agent`);
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { parseYaml, validateWorkflow, trimQuotes };
