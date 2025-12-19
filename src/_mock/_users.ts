import { fSub } from 'src/utils/set-date';

import { _mock } from './_mock';
import { _organizations, _sites } from './_weighbridge';

// ----------------------------------------------------------------------
// USERS MOCK DATA
// Role-based access control for the weighbridge system
// ----------------------------------------------------------------------

export const USER_ROLES = [
  'system_admin',
  'site_manager',
  'weighbridge_operator',
  'stock_controller',
  'client_user',
  'haulier_user',
  'viewer',
] as const;

export const USER_STATUSES = ['active', 'inactive', 'suspended', 'pending'] as const;

// Role permissions mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  system_admin: ['*'],
  site_manager: [
    'orders:*',
    'tickets:*',
    'stock:*',
    'vehicles:read',
    'drivers:read',
    'reports:*',
    'users:read',
    'users:create',
  ],
  weighbridge_operator: [
    'orders:read',
    'orders:update',
    'tickets:*',
    'vehicles:read',
    'drivers:read',
  ],
  stock_controller: [
    'stock:*',
    'orders:read',
    'tickets:read',
    'reports:stock',
  ],
  client_user: [
    'orders:read',
    'orders:create',
    'tickets:read',
    'reports:client',
  ],
  haulier_user: [
    'orders:read',
    'tickets:read',
    'vehicles:read',
    'vehicles:update',
    'drivers:read',
    'drivers:update',
  ],
  viewer: [
    'orders:read',
    'tickets:read',
    'stock:read',
    'reports:read',
  ],
};

// ----------------------------------------------------------------------
// USERS
// ----------------------------------------------------------------------

export const _users = () => {
  const organizations = _organizations();
  const sites = _sites();

  return Array.from({ length: 25 }, (_, index) => {
    const organization = organizations[index % organizations.length];
    const site = sites[index % sites.length];
    const role = USER_ROLES[index % USER_ROLES.length];
    const createdAt = fSub({ days: 365 - index * 10 });

    // Demo user for testing (first user)
    const isDemo = index === 0;

    return {
      id: `user_${_mock.id(index)}`,

      // Authentication
      email: isDemo ? 'demo@weighbridge.io' : _mock.email(index),
      password: 'Demo@123', // Only for demo/mock purposes

      // Profile
      firstName: isDemo ? 'Demo' : _mock.firstName(index),
      lastName: isDemo ? 'User' : _mock.lastName(index),
      displayName: isDemo ? 'Demo User' : _mock.fullName(index),
      avatarUrl: _mock.image.avatar(index % 24),
      phone: _mock.phoneNumber(index),

      // Role and permissions
      role,
      permissions: ROLE_PERMISSIONS[role],

      // Organization scope
      organizationId: organization.id,
      organizationName: organization.name,

      // Site scope (null for org-level users)
      siteId: ['site_manager', 'weighbridge_operator', 'stock_controller'].includes(role)
        ? site.id
        : null,
      siteName: ['site_manager', 'weighbridge_operator', 'stock_controller'].includes(role)
        ? site.name
        : null,

      // Client/Haulier scope
      clientId: role === 'client_user' ? `client_${_mock.id(index)}` : null,
      haulierId: role === 'haulier_user' ? `haulier_${_mock.id(index % 8)}` : null,

      // Status
      status: USER_STATUSES[index % USER_STATUSES.length === 3 ? 0 : index % USER_STATUSES.length],
      isActive: index % USER_STATUSES.length !== 1 && index % USER_STATUSES.length !== 2,

      // Security
      emailVerified: index % 10 !== 8,
      emailVerifiedAt: index % 10 !== 8 ? fSub({ days: 360 - index * 10 }) : null,
      lastLoginAt: fSub({ hours: index * 3 }),
      lastLoginIp: `192.168.1.${100 + index}`,
      failedLoginAttempts: 0,

      // Two-factor auth
      twoFactorEnabled: index % 5 === 0,
      twoFactorMethod: index % 5 === 0 ? 'authenticator' : null,

      // Preferences
      preferences: {
        theme: index % 3 === 0 ? 'dark' : 'light',
        language: 'en',
        timezone: 'Africa/Johannesburg',
        dateFormat: 'DD/MM/YYYY',
        notifications: {
          email: true,
          push: index % 2 === 0,
          sms: false,
        },
      },

      // Timestamps
      createdAt,
      updatedAt: fSub({ days: index }),
      passwordChangedAt: fSub({ days: 90 + index * 5 }),
    };
  });
};

// Get users by organization
export const _usersByOrganization = (organizationId: string) => {
  return _users().filter((u) => u.organizationId === organizationId);
};

// Get users by site
export const _usersBySite = (siteId: string) => {
  return _users().filter((u) => u.siteId === siteId);
};

// Get users by role
export const _usersByRole = (role: string) => {
  return _users().filter((u) => u.role === role);
};

// Get active users
export const _activeUsers = () => {
  return _users().filter((u) => u.isActive);
};

// Find user by email (for auth)
export const _findUserByEmail = (email: string) => {
  return _users().find((u) => u.email.toLowerCase() === email.toLowerCase());
};

// Find user by ID
export const _findUserById = (id: string) => {
  return _users().find((u) => u.id === id);
};
