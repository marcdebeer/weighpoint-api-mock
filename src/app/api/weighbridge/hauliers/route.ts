import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _hauliers, _vehicles, _drivers } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/hauliers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const haulierId = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase();
    const includeFleet = searchParams.get('includeFleet') === 'true';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

    let hauliers = _hauliers();

    // Get single haulier by ID
    if (haulierId) {
      const haulier = hauliers.find((h) => h.id === haulierId);

      if (!haulier) {
        return response({ message: 'Haulier not found!' }, STATUS.NOT_FOUND);
      }

      // Include fleet details if requested
      if (includeFleet) {
        const vehicles = _vehicles().filter((v) => v.haulierId === haulierId);
        const drivers = _drivers().filter((d) => d.haulierId === haulierId);

        logger('[Hauliers] details-with-fleet', haulier.id);
        return response({
          haulier,
          fleet: {
            vehicles,
            drivers,
            vehicleCount: vehicles.length,
            driverCount: drivers.length,
            activeVehicles: vehicles.filter((v) => v.status === 'active').length,
            activeDrivers: drivers.filter((d) => d.status === 'active').length,
          },
        }, STATUS.OK);
      }

      logger('[Hauliers] details', haulier.id);
      return response({ haulier }, STATUS.OK);
    }

    // Apply filters
    if (status) {
      hauliers = hauliers.filter((h) => h.status === status);
    }

    if (search) {
      hauliers = hauliers.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.code.toLowerCase().includes(search) ||
          h.contactName.toLowerCase().includes(search) ||
          h.contactEmail.toLowerCase().includes(search)
      );
    }

    // Pagination
    const totalItems = hauliers.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedHauliers = hauliers.slice(startIndex, startIndex + perPage);

    logger('[Hauliers] list', paginatedHauliers.length);
    return response(
      {
        hauliers: paginatedHauliers,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: ['active', 'suspended'],
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Hauliers - GET', error);
  }
}
