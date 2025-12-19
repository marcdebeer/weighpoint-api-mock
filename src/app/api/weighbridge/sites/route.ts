import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _sites } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/sites
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const siteId = searchParams.get('id');
    const organizationId = searchParams.get('organizationId');

    let sites = _sites();

    // Filter by organization
    if (organizationId) {
      sites = sites.filter((site) => site.organizationId === organizationId);
    }

    // Get single site by ID
    if (siteId) {
      const site = sites.find((s) => s.id === siteId);

      if (!site) {
        return response({ message: 'Site not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Sites] details', site.id);
      return response({ site }, STATUS.OK);
    }

    // Get all sites
    logger('[Sites] list', sites.length);
    return response({ sites }, STATUS.OK);
  } catch (error) {
    return handleError('Sites - GET', error);
  }
}
