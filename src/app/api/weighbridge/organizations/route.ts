import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _organizations } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/organizations
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const organizationId = searchParams.get('id');

    const organizations = _organizations();

    // Get single organization by ID
    if (organizationId) {
      const organization = organizations.find((org) => org.id === organizationId);

      if (!organization) {
        return response({ message: 'Organization not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Organizations] details', organization.id);
      return response({ organization }, STATUS.OK);
    }

    // Get all organizations
    logger('[Organizations] list', organizations.length);
    return response({ organizations }, STATUS.OK);
  } catch (error) {
    return handleError('Organizations - GET', error);
  }
}
