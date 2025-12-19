import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _weighbridges } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/weighbridges
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const weighbridgeId = searchParams.get('id');
    const siteId = searchParams.get('siteId');
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');

    let weighbridges = _weighbridges();

    // Filter by organization
    if (organizationId) {
      weighbridges = weighbridges.filter((wb) => wb.organizationId === organizationId);
    }

    // Filter by site
    if (siteId) {
      weighbridges = weighbridges.filter((wb) => wb.siteId === siteId);
    }

    // Filter by status
    if (status) {
      weighbridges = weighbridges.filter((wb) => wb.status === status);
    }

    // Get single weighbridge by ID
    if (weighbridgeId) {
      const weighbridge = weighbridges.find((wb) => wb.id === weighbridgeId);

      if (!weighbridge) {
        return response({ message: 'Weighbridge not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Weighbridges] details', weighbridge.id);
      return response({ weighbridge }, STATUS.OK);
    }

    // Get all weighbridges
    logger('[Weighbridges] list', weighbridges.length);
    return response({ weighbridges }, STATUS.OK);
  } catch (error) {
    return handleError('Weighbridges - GET', error);
  }
}
