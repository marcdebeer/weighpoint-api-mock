import { _mock } from 'src/_mock';

// ----------------------------------------------------------------------

export const JWT_SECRET = 'minimal-secret-key';

export const JWT_EXPIRES_IN = '3 days';

// User roles
export type UserRole = 'admin' | 'client' | 'haulier';

export const _users = [
  // Admin users - access to main dashboard
  {
    id: '8864c717-587d-472a-929a-8e5f298024da-0',
    displayName: 'Jaydon Frankie',
    photoURL: _mock.image.avatar(24),
    phoneNumber: _mock.phoneNumber(1),
    country: _mock.countryNames(1),
    address: '90210 Broadway Blvd',
    state: 'California',
    city: 'San Francisco',
    zipCode: '94116',
    about: 'Praesent turpis. Phasellus viverra nulla ut metus varius laoreet. Phasellus tempus.',
    role: 'admin' as UserRole,
    isPublic: true,
    email: 'demo@weighpoint.debeer.io',
    password: '123qwe',
  },
  {
    id: '8864c717-587d-472a-929a-8e5f298024da-1',
    displayName: 'Marc de Beer',
    photoURL: _mock.image.avatar(24),
    phoneNumber: _mock.phoneNumber(1),
    country: _mock.countryNames(1),
    address: 'Vungu Street, Hillside Estate, Moreletapark',
    state: 'Gauteng',
    city: 'Pretoria',
    zipCode: '0044',
    about: 'The quick brown fox jumps over the lazy dog.',
    role: 'admin' as UserRole,
    isPublic: true,
    email: 'marc@debeer.io',
    password: '123qwe',
  },
  // Client users - access to client portal
  {
    id: 'client-001',
    displayName: 'Sarah Mitchell',
    photoURL: _mock.image.avatar(5),
    phoneNumber: '+1 555-0101',
    country: 'United States',
    address: '123 Construction Ave',
    state: 'Texas',
    city: 'Houston',
    zipCode: '77001',
    about: 'Construction project manager at Acme Construction Ltd.',
    role: 'client' as UserRole,
    isPublic: true,
    clientId: 'client_001', // Links to weighbridge client
    companyName: 'Acme Construction Ltd',
    email: 'client@demo.com',
    password: 'client123',
  },
  {
    id: 'client-002',
    displayName: 'James Anderson',
    photoURL: _mock.image.avatar(8),
    phoneNumber: '+1 555-0102',
    country: 'United States',
    address: '456 Builder Blvd',
    state: 'California',
    city: 'Los Angeles',
    zipCode: '90001',
    about: 'Procurement manager at BuildRight Inc.',
    role: 'client' as UserRole,
    isPublic: true,
    clientId: 'client_002',
    companyName: 'BuildRight Inc',
    email: 'james@buildright.com',
    password: 'client123',
  },
  // Haulier users - access to haulier portal
  {
    id: 'haulier-001',
    displayName: 'Mike Thompson',
    photoURL: _mock.image.avatar(12),
    phoneNumber: '+1 555-0201',
    country: 'United States',
    address: '789 Transport Road',
    state: 'Arizona',
    city: 'Phoenix',
    zipCode: '85001',
    about: 'Fleet manager at FastHaul Logistics.',
    role: 'haulier' as UserRole,
    isPublic: true,
    haulierId: 'haulier_001', // Links to weighbridge haulier
    companyName: 'FastHaul Logistics',
    email: 'haulier@demo.com',
    password: 'haulier123',
  },
  {
    id: 'haulier-002',
    displayName: 'Lisa Chen',
    photoURL: _mock.image.avatar(15),
    phoneNumber: '+1 555-0202',
    country: 'United States',
    address: '321 Trucking Lane',
    state: 'Nevada',
    city: 'Las Vegas',
    zipCode: '89101',
    about: 'Operations director at Premier Transport Co.',
    role: 'haulier' as UserRole,
    isPublic: true,
    haulierId: 'haulier_002',
    companyName: 'Premier Transport Co',
    email: 'lisa@premiertransport.com',
    password: 'haulier123',
  },
];
