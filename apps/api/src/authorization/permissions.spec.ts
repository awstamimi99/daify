import { hasPermission, permissions } from './permissions';

describe('RBAC permission presets', () => {
  it('keeps availability separate from editing and publishing', () => {
    expect(hasPermission('STAFF', [], 'menu.availability')).toBe(true);
    expect(hasPermission('STAFF', [], 'menu.edit')).toBe(false);
    expect(hasPermission('STAFF', [], 'menu.publish')).toBe(false);
  });

  it.each([
    ['OWNER', 'organization.update', true],
    ['OWNER', 'billing.manage', true],
    ['MANAGER', 'menu.edit', true],
    ['MANAGER', 'menu.publish', false],
    ['STAFF', 'location.read', true],
    ['STAFF', 'organization.read', false],
    ['VIEWER', 'menu.read', true],
    ['VIEWER', 'menu.edit', false],
  ] as const)('%s / %s is %s', (role, permission, expected) => {
    expect(hasPermission(role, [], permission)).toBe(expected);
  });

  it('gives the owner every declared permission', () => {
    expect(permissions.every(permission => hasPermission('OWNER', [], permission))).toBe(true);
  });
});
