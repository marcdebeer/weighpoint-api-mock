import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _vehicles, _drivers } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// Mock haulier ID for demonstration
const MOCK_HAULIER_ID = 'haulier_001';

// Status constants
const VEHICLE_STATUSES = ['active', 'inactive', 'maintenance'] as const;
const DRIVER_STATUSES = ['active', 'inactive', 'suspended'] as const;

// Types for vehicles and drivers
type Vehicle = {
  id: string;
  registrationNumber: string;
  haulierId?: string;
  status?: string;
  make?: string;
  model?: string;
  [key: string]: unknown;
};

type Driver = {
  id: string;
  fullName: string;
  haulierId?: string;
  status?: string;
  licenseNumber?: string;
  phone?: string;
  [key: string]: unknown;
};

// GET /api/portal/haulier/fleet - Get haulier's fleet (vehicles and drivers)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') || 'vehicles'; // 'vehicles' or 'drivers'
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();

    if (type === 'drivers') {
      // Get haulier's drivers
      const allDrivers = _drivers() as Driver[];
      let drivers = allDrivers.filter((driver) => driver.haulierId === MOCK_HAULIER_ID);

      // Apply filters
      if (status) {
        drivers = drivers.filter((driver) => driver.status === status);
      }

      if (search) {
        drivers = drivers.filter(
          (driver) =>
            (driver.fullName?.toLowerCase() || '').includes(search) ||
            (driver.licenseNumber?.toLowerCase() || '').includes(search) ||
            (driver.phone?.toLowerCase() || '').includes(search)
        );
      }

      // Pagination
      const totalItems = drivers.length;
      const totalPages = Math.ceil(totalItems / perPage);
      const startIndex = (page - 1) * perPage;
      const paginatedDrivers = drivers.slice(startIndex, startIndex + perPage);

      logger('[Haulier Portal - Fleet] drivers list', paginatedDrivers.length);
      return response(
        {
          drivers: paginatedDrivers,
          pagination: {
            page,
            perPage,
            totalItems,
            totalPages,
            hasMore: page < totalPages,
          },
          filters: {
            statuses: DRIVER_STATUSES,
          },
        },
        STATUS.OK
      );
    }

    // Get haulier's vehicles (default)
    const allVehicles = _vehicles() as Vehicle[];
    let vehicles = allVehicles.filter((vehicle) => vehicle.haulierId === MOCK_HAULIER_ID);

    // Apply filters
    if (status) {
      vehicles = vehicles.filter((vehicle) => vehicle.status === status);
    }

    if (search) {
      vehicles = vehicles.filter(
        (vehicle) =>
          (vehicle.registrationNumber?.toLowerCase() || '').includes(search) ||
          (vehicle.make?.toLowerCase() || '').includes(search) ||
          (vehicle.model?.toLowerCase() || '').includes(search)
      );
    }

    // Pagination
    const totalItems = vehicles.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedVehicles = vehicles.slice(startIndex, startIndex + perPage);

    logger('[Haulier Portal - Fleet] vehicles list', paginatedVehicles.length);
    return response(
      {
        vehicles: paginatedVehicles,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: VEHICLE_STATUSES,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Haulier Portal - Fleet GET', error);
  }
}
