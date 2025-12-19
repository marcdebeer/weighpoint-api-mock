import type { NextRequest } from 'next/server';

import { sign } from 'src/utils/jwt';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _users, _findUserByEmail, _findUserById, USER_ROLES, ROLE_PERMISSIONS } from 'src/_mock/_users';

// ----------------------------------------------------------------------

export const runtime = 'edge';

const JWT_SECRET = process.env.JWT_SECRET || 'weighbridge-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// Endpoint actions
const ENDPOINTS = {
  LIST: 'list',
  DETAILS: 'details',
  ME: 'me',
  SIGN_IN: 'sign-in',
  SIGN_UP: 'sign-up',
  ROLES: 'roles',
};

// GET /api/weighbridge/users
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint') || ENDPOINTS.LIST;

    switch (endpoint) {
      case ENDPOINTS.LIST:
        return getUsers(req);
      case ENDPOINTS.DETAILS:
        return getUserDetails(req);
      case ENDPOINTS.ME:
        return getCurrentUser(req);
      case ENDPOINTS.ROLES:
        return getRoles();
      default:
        return getUsers(req);
    }
  } catch (error) {
    return handleError('Users - GET', error);
  }
}

// POST /api/weighbridge/users
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const endpoint = searchParams.get('endpoint');

    switch (endpoint) {
      case ENDPOINTS.SIGN_IN:
        return signIn(req);
      case ENDPOINTS.SIGN_UP:
        return signUp(req);
      default:
        return response({ message: 'Invalid endpoint!' }, STATUS.BAD_REQUEST);
    }
  } catch (error) {
    return handleError('Users - POST', error);
  }
}

// Get users list
async function getUsers(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const organizationId = searchParams.get('organizationId');
  const siteId = searchParams.get('siteId');
  const role = searchParams.get('role');
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.toLowerCase();
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

  let users = _users();

  // Apply filters
  if (organizationId) {
    users = users.filter((u) => u.organizationId === organizationId);
  }

  if (siteId) {
    users = users.filter((u) => u.siteId === siteId);
  }

  if (role) {
    users = users.filter((u) => u.role === role);
  }

  if (status) {
    users = users.filter((u) => u.status === status);
  }

  if (search) {
    users = users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.role.toLowerCase().includes(search)
    );
  }

  // Remove sensitive data
  const sanitizedUsers = users.map(({ password, ...user }) => user);

  // Pagination
  const totalItems = sanitizedUsers.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedUsers = sanitizedUsers.slice(startIndex, startIndex + perPage);

  logger('[Users] list', paginatedUsers.length);
  return response(
    {
      users: paginatedUsers,
      pagination: {
        page,
        perPage,
        totalItems,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        roles: USER_ROLES,
        statuses: ['active', 'inactive', 'suspended', 'pending'],
      },
    },
    STATUS.OK
  );
}

// Get user details
async function getUserDetails(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('id');

  if (!userId) {
    return response({ message: 'User ID is required!' }, STATUS.BAD_REQUEST);
  }

  const user = _findUserById(userId);

  if (!user) {
    return response({ message: 'User not found!' }, STATUS.NOT_FOUND);
  }

  // Remove sensitive data
  const { password, ...sanitizedUser } = user;

  logger('[Users] details', userId);
  return response({ user: sanitizedUser }, STATUS.OK);
}

// Get current user (from token)
async function getCurrentUser(req: NextRequest) {
  // In a real app, we'd verify the JWT token from Authorization header
  // For mock, we return the demo user
  const user = _findUserByEmail('demo@weighbridge.io');

  if (!user) {
    return response({ message: 'User not found!' }, STATUS.NOT_FOUND);
  }

  const { password, ...sanitizedUser } = user;

  logger('[Users] me', sanitizedUser.id);
  return response({ user: sanitizedUser }, STATUS.OK);
}

// Get available roles and permissions
async function getRoles() {
  const roles = USER_ROLES.map((role) => ({
    role,
    permissions: ROLE_PERMISSIONS[role],
    description: getRoleDescription(role),
  }));

  logger('[Users] roles', roles.length);
  return response({ roles }, STATUS.OK);
}

// Sign in
async function signIn(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return response({ message: 'Email and password are required!' }, STATUS.BAD_REQUEST);
  }

  const user = _findUserByEmail(email);

  if (!user) {
    return response(
      { message: 'No user found with this email address.' },
      STATUS.UNAUTHORIZED
    );
  }

  if (user.password !== password) {
    return response({ message: 'Invalid password.' }, STATUS.UNAUTHORIZED);
  }

  if (!user.isActive) {
    return response(
      { message: 'Your account is not active. Please contact support.' },
      STATUS.UNAUTHORIZED
    );
  }

  // Generate JWT token
  const accessToken = await sign(
    {
      userId: user.id,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Remove sensitive data
  const { password: _, ...sanitizedUser } = user;

  logger('[Users] sign-in', user.id);
  return response(
    {
      user: sanitizedUser,
      accessToken,
    },
    STATUS.OK
  );
}

// Sign up (mock - just returns success)
async function signUp(req: NextRequest) {
  const { email, password, firstName, lastName, organizationId } = await req.json();

  if (!email || !password || !firstName || !lastName) {
    return response(
      { message: 'Email, password, first name, and last name are required!' },
      STATUS.BAD_REQUEST
    );
  }

  // Check if user already exists
  const existingUser = _findUserByEmail(email);
  if (existingUser) {
    return response(
      { message: 'A user with this email already exists.' },
      STATUS.CONFLICT
    );
  }

  // In a real app, we'd create the user in the database
  // For mock, we return a success response with mock data
  const newUser = {
    id: `user_new_${Date.now()}`,
    email,
    firstName,
    lastName,
    displayName: `${firstName} ${lastName}`,
    role: 'viewer' as const,
    organizationId: organizationId || 'org_default',
    status: 'pending' as const,
    isActive: false, // Requires admin approval
    createdAt: new Date().toISOString(),
  };

  logger('[Users] sign-up', newUser.id);
  return response(
    {
      user: newUser,
      message: 'Registration successful. Your account is pending approval.',
    },
    STATUS.OK
  );
}

// Helper: Get role description
function getRoleDescription(role: string): string {
  const descriptions: Record<string, string> = {
    system_admin: 'Full access to all system features and settings',
    site_manager: 'Manage operations, reporting, and site-level users',
    weighbridge_operator: 'Process orders and tickets, capture weights',
    stock_controller: 'Manage stock levels, adjustments, and stocktakes',
    client_user: 'Place orders and view transaction history',
    haulier_user: 'Manage fleet and view ticket information',
    viewer: 'Read-only access to specified modules',
  };
  return descriptions[role] || 'Unknown role';
}
