import { expect, it } from 'vitest';
import { generateVoronoiSites, voronoiData } from './voronoi';
it('creates deterministic normalized sites and bounded displacement vectors', () => {
  const sites = generateVoronoiSites(32, 72);
  expect(sites).toEqual(generateVoronoiSites(32, 72)); expect(sites).not.toEqual(generateVoronoiSites(32, 73));
  for (let index = 0; index < sites.length; index += 4) {
    expect(sites[index]).toBeGreaterThanOrEqual(0); expect(sites[index]).toBeLessThanOrEqual(1);
    expect(sites[index + 1]).toBeGreaterThanOrEqual(0); expect(sites[index + 1]).toBeLessThanOrEqual(1);
    expect(Math.abs(sites[index + 2])).toBeLessThanOrEqual(1); expect(Math.abs(sites[index + 3])).toBeLessThanOrEqual(1);
  }
});
it('refreshes site uniforms after changing seed or cell count', () => {
  const data = voronoiData.create(); data.update({ cells: 32, seed: 72 });
  expect(data.uniforms.uSites.value).toEqual(generateVoronoiSites(32, 72));
  data.update({ cells: 1, seed: 73 });
  const sites = data.uniforms.uSites.value as Float32Array;
  expect(sites.slice(0, 4)).toEqual(generateVoronoiSites(1, 73)); expect(sites.slice(4).every(value => value === 0)).toBe(true);
});
