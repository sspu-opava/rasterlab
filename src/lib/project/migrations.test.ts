import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ProjectDeserializer } from './ProjectDeserializer';
import { ProjectSerializer } from './ProjectSerializer';
for (const version of [1, 2, 3]) it(`migrates checked-in v${version} fixture and resaves as a readable v3`, () => {
  const project = ProjectDeserializer.parse(readFileSync(new URL(`../../../fixtures/projects/v${version}.json`, import.meta.url), 'utf8'));
  expect(project.version).toBe(3);
  expect(project.document.layers[0].id).toBe('layer-a');
  expect(ProjectDeserializer.parse(ProjectSerializer.stringify(project))).toEqual(project);
  if (version === 3) expect(project.document.layers[0].mask?.sourceId).toBe('layer-b');
});
