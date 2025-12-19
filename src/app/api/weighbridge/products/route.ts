import type { NextRequest } from 'next/server';

import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _products } from 'src/_mock/_weighbridge';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// GET /api/weighbridge/products
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const productId = searchParams.get('id');
    const category = searchParams.get('category');
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const search = searchParams.get('search')?.toLowerCase();
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);

    let products = _products();

    // Get single product by ID
    if (productId) {
      const product = products.find((p) => p.id === productId);

      if (!product) {
        return response({ message: 'Product not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Products] details', product.id);
      return response({ product }, STATUS.OK);
    }

    // Apply filters
    if (category) {
      products = products.filter((p) => p.category === category);
    }

    if (activeOnly) {
      products = products.filter((p) => p.isActive);
    }

    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.code.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }

    // Get unique categories for filter
    const categories = Array.from(new Set(_products().map((p) => p.category)));

    // Pagination
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedProducts = products.slice(startIndex, startIndex + perPage);

    logger('[Products] list', paginatedProducts.length);
    return response(
      {
        products: paginatedProducts,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          categories,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Products - GET', error);
  }
}
