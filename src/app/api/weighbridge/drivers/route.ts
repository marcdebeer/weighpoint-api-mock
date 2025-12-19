import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _drivers } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/drivers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const driverId = searchParams.get('id');
    const haulierId = searchParams.get('haulierId');
    const status = searchParams.get('status');
    const inductionStatus = searchParams.get('inductionStatus');
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

    let drivers = _drivers();

    // Get single driver by ID
    if (driverId) {
      const driver = drivers.find((d) => d.id === driverId);

      if (!driver) {
        return response({ message: 'Driver not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Drivers] details', driver.id);
      return response({ driver }, STATUS.OK);
    }

    // Apply filters
    if (haulierId) {
      drivers = drivers.filter((d) => d.haulierId === haulierId);
    }

    if (status) {
      drivers = drivers.filter((d) => d.status === status);
    }

    if (inductionStatus) {
      drivers = drivers.filter((d) => d.inductionStatus === inductionStatus);
    }

    if (search) {
      drivers = drivers.filter(
        (d) =>
          d.fullName.toLowerCase().includes(search) ||
          d.email.toLowerCase().includes(search) ||
          d.idNumber.toLowerCase().includes(search) ||
          d.licenseNumber.toLowerCase().includes(search)
      );
    }

    // Pagination
    const totalItems = drivers.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedDrivers = drivers.slice(startIndex, startIndex + perPage);

    logger('[Drivers] list', paginatedDrivers.length);
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
          statuses: ['active', 'suspended', 'inactive'],
          inductionStatuses: ['completed', 'pending', 'expired'],
          licenseTypes: ['C', 'C1', 'EC', 'EC1'],
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Drivers - GET', error);
  }
}
