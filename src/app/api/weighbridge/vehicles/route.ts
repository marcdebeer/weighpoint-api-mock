import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _vehicles } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/vehicles
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const vehicleId = searchParams.get('id');
    const haulierId = searchParams.get('haulierId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

    let vehicles = _vehicles();

    // Get single vehicle by ID
    if (vehicleId) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);

      if (!vehicle) {
        return response({ message: 'Vehicle not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Vehicles] details', vehicle.id);
      return response({ vehicle }, STATUS.OK);
    }

    // Apply filters
    if (haulierId) {
      vehicles = vehicles.filter((v) => v.haulierId === haulierId);
    }

    if (status) {
      vehicles = vehicles.filter((v) => v.status === status);
    }

    if (type) {
      vehicles = vehicles.filter((v) => v.type === type);
    }

    if (search) {
      vehicles = vehicles.filter(
        (v) =>
          v.registrationNumber.toLowerCase().includes(search) ||
          v.make.toLowerCase().includes(search) ||
          v.model.toLowerCase().includes(search) ||
          v.type.toLowerCase().includes(search)
      );
    }

    // Pagination
    const totalItems = vehicles.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedVehicles = vehicles.slice(startIndex, startIndex + perPage);

    logger('[Vehicles] list', paginatedVehicles.length);
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
          statuses: ['active', 'maintenance', 'inactive'],
          types: ['Side Tipper', 'End Tipper', 'Flatbed', 'Walking Floor', 'Tanker', 'Interlink'],
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Vehicles - GET', error);
  }
}
