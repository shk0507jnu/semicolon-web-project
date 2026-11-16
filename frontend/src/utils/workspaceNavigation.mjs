import { PATHS } from '../routes/paths.js';

// Workspace navigation belongs to the URL being viewed, never a remembered selection.
// This also keeps workspace menus off global pages after returning home.
export function workspaceNavigation(pathname, workspaces) {
  const match = pathname.match(/^\/w\/([^/]+)\/(.*)$/);
  let id;
  try { id = match ? decodeURIComponent(match[1]) : null; } catch { id = null; }
  const workspace = id === null ? null : workspaces.find(ws => String(ws.id) === id) ?? null;
  if (!workspace) return { workspace: null, items: [] };

  const page = match[2].split('/')[0];
  const selected = ['calendar', 'schedule'].includes(page) ? 'calendar' : page;
  const definitions = [
    { key: 'calendar', label: '달력', path: PATHS.calendar },
    { key: 'swaps', label: '대타', path: PATHS.swaps },
    { key: 'payroll', label: '급여', path: PATHS.payroll },
    { key: 'notices', label: '공지', path: PATHS.notices },
  ];
  return {
    workspace,
    items: definitions.map(({ path, ...item }) => ({
      ...item,
      to: path.replace(':workspaceId', encodeURIComponent(String(workspace.id))),
      active: item.key === selected,
    })),
  };
}
