import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceNavigation } from './workspaceNavigation.mjs';

const workspaces = [{ id: 'cafe', name: '카페' }, { id: 'store', name: '편의점' }, { id: 12, name: 'DB 공간' }];

test('global selection, creation, profile and invite pages never show workspace tabs', () => {
  for (const path of ['/workspaces', '/workspaces/new', '/me', '/login', '/invite/CAFE24']) {
    assert.deepEqual(workspaceNavigation(path, workspaces), { workspace: null, items: [] });
  }
});

test('all four tabs stay inside the workspace named in the URL', () => {
  const { workspace, items } = workspaceNavigation('/w/store/calendar', workspaces);
  assert.equal(workspace.id, 'store');
  assert.deepEqual(items.map(item => item.to), ['/w/store/calendar', '/w/store/swaps', '/w/store/payroll', '/w/store/notices']);
  assert.deepEqual(items.filter(item => item.active).map(item => item.key), ['calendar']);
});

test('nested screens keep their parent tab selected', () => {
  for (const [suffix, key] of [['calendar/2026-09-09', 'calendar'], ['schedule/min-staff', 'calendar'], ['swaps/new', 'swaps'], ['payroll/history', 'payroll'], ['notices/n2', 'notices']]) {
    assert.deepEqual(workspaceNavigation(`/w/cafe/${suffix}`, workspaces).items.filter(item => item.active).map(item => item.key), [key]);
  }
});

test('missing, stale or malformed workspace URLs cannot fall back to another workspace', () => {
  for (const path of ['/w/removed/calendar', '/w/%E0%A4/calendar', '/w/cafe']) {
    assert.equal(workspaceNavigation(path, workspaces).workspace, null);
  }
  assert.deepEqual(workspaceNavigation('/w/cafe/calendar', []).items, []);
});

test('numeric database IDs and encoded workspace IDs resolve consistently', () => {
  assert.equal(workspaceNavigation('/w/12/payroll', workspaces).workspace.name, 'DB 공간');
  const result = workspaceNavigation('/w/%ED%8C%80/calendar', [{ id: '팀', name: '팀' }]);
  assert.equal(result.items[0].to, '/w/%ED%8C%80/calendar');
});
