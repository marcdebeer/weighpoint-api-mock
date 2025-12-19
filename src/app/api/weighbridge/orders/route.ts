import type { NextRequest } from 'next/server';

import { uuidv4 } from 'src/utils/uuidv4';
import { logger } from 'src/utils/logger';
import { STATUS, response, handleError } from 'src/utils/response';
import { _orders, ORDER_STATUSES, ORDER_TYPES, ORDER_PRIORITIES } from 'src/_mock/_orders';

// ----------------------------------------------------------------------

export const runtime = 'edge';

// In-memory store for orders (initialized from mock data)
let ordersData: Map<string, ReturnType<typeof _orders>[number]> | null = null;

function initializeOrders() {
  if (!ordersData) {
    ordersData = new Map(_orders().map((order) => [order.id, order]));
  }
  return ordersData;
}

// GET /api/weighbridge/orders
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('id');
    const siteId = searchParams.get('siteId');
    const clientId = searchParams.get('clientId');
    const haulierId = searchParams.get('haulierId');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const perPage = parseInt(searchParams.get('perPage') ?? '20', 10);
    const search = searchParams.get('search')?.toLowerCase();

    initializeOrders();
    let orders = Array.from(ordersData!.values());

    // Get single order by ID
    if (orderId) {
      const order = ordersData!.get(orderId);

      if (!order) {
        return response({ message: 'Order not found!' }, STATUS.NOT_FOUND);
      }

      logger('[Orders] details', order.id);
      return response({ order }, STATUS.OK);
    }

    // Apply filters
    if (siteId) {
      orders = orders.filter((order) => order.siteId === siteId);
    }

    if (clientId) {
      orders = orders.filter((order) => order.clientId === clientId);
    }

    if (haulierId) {
      orders = orders.filter((order) => order.haulierId === haulierId);
    }

    if (status) {
      orders = orders.filter((order) => order.status === status);
    }

    if (type) {
      orders = orders.filter((order) => order.type === type);
    }

    if (search) {
      orders = orders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(search) ||
          order.clientName.toLowerCase().includes(search) ||
          order.vehicleRegistration.toLowerCase().includes(search) ||
          order.driverName.toLowerCase().includes(search) ||
          order.productName.toLowerCase().includes(search)
      );
    }

    // Sort by created date descending
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const totalItems = orders.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedOrders = orders.slice(startIndex, startIndex + perPage);

    logger('[Orders] list', paginatedOrders.length);
    return response(
      {
        orders: paginatedOrders,
        pagination: {
          page,
          perPage,
          totalItems,
          totalPages,
          hasMore: page < totalPages,
        },
        filters: {
          statuses: ORDER_STATUSES,
          types: ORDER_TYPES,
          priorities: ORDER_PRIORITIES,
        },
      },
      STATUS.OK
    );
  } catch (error) {
    return handleError('Orders - GET', error);
  }
}

// POST /api/weighbridge/orders (Create new order)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    initializeOrders();

    const now = new Date().toISOString();
    const orderCount = ordersData!.size + 1;

    const newOrder = {
      id: `order_${uuidv4()}`,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(orderCount).padStart(5, '0')}`,
      siteId: body.siteId,
      siteName: body.siteName || 'Unknown Site',
      organizationId: body.organizationId,
      type: body.type || 'outbound',
      status: 'pending' as const,
      priority: body.priority || 'normal',
      clientId: body.clientId,
      clientName: body.clientName || 'Unknown Client',
      haulierId: body.haulierId,
      haulierName: body.haulierName || 'Unknown Haulier',
      vehicleId: body.vehicleId,
      vehicleRegistration: body.vehicleRegistration || '',
      driverId: body.driverId,
      driverName: body.driverName || '',
      productId: body.productId,
      productName: body.productName || 'Unknown Product',
      productCode: body.productCode || '',
      orderedQuantityTonnes: body.orderedQuantityTonnes || 0,
      deliveredQuantityTonnes: 0,
      variancePercentage: null,
      pricePerTonne: body.pricePerTonne || 0,
      totalValue: (body.orderedQuantityTonnes || 0) * (body.pricePerTonne || 0),
      purchaseOrderNumber: body.purchaseOrderNumber || null,
      deliveryNoteNumber: null,
      externalReference: body.externalReference || null,
      scheduledDate: body.scheduledDate || now,
      expiryDate: body.expiryDate || null,
      createdAt: now,
      approvedAt: null,
      checkedInAt: null,
      completedAt: null,
      updatedAt: now,
      approvedBy: null,
      approvedByName: null,
      rejectionReason: null,
      cancellationReason: null,
      notes: body.notes || null,
      internalNotes: body.internalNotes || null,
      ticketsCount: 0,
    };

    ordersData!.set(newOrder.id, newOrder);

    logger('[Orders] created', newOrder.id);
    return response({ order: newOrder }, STATUS.OK);
  } catch (error) {
    return handleError('Orders - POST', error);
  }
}

// PUT /api/weighbridge/orders (Update order)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return response({ message: 'Order ID is required!' }, STATUS.BAD_REQUEST);
    }

    initializeOrders();

    const order = ordersData!.get(id);

    if (!order) {
      return response({ message: 'Order not found!' }, STATUS.NOT_FOUND);
    }

    const now = new Date().toISOString();

    // Handle status transitions
    if (updates.status && updates.status !== order.status) {
      if (updates.status === 'approved') {
        updates.approvedAt = now;
        updates.approvedBy = updates.approvedBy || 'user_system';
        updates.approvedByName = updates.approvedByName || 'System';
      } else if (updates.status === 'checked_in') {
        updates.checkedInAt = now;
      } else if (updates.status === 'completed') {
        updates.completedAt = now;
      } else if (updates.status === 'rejected') {
        updates.rejectionReason = updates.rejectionReason || 'Rejected by operator';
      } else if (updates.status === 'cancelled') {
        updates.cancellationReason = updates.cancellationReason || 'Cancelled';
      }
    }

    const updatedOrder = {
      ...order,
      ...updates,
      updatedAt: now,
    };

    ordersData!.set(id, updatedOrder);

    logger('[Orders] updated', id);
    return response({ order: updatedOrder }, STATUS.OK);
  } catch (error) {
    return handleError('Orders - PUT', error);
  }
}

// DELETE /api/weighbridge/orders
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('id');

    if (!orderId) {
      return response({ message: 'Order ID is required!' }, STATUS.BAD_REQUEST);
    }

    initializeOrders();

    const order = ordersData!.get(orderId);

    if (!order) {
      return response({ message: 'Order not found!' }, STATUS.NOT_FOUND);
    }

    // Only allow deletion of pending orders
    if (order.status !== 'pending') {
      return response(
        { message: 'Only pending orders can be deleted!' },
        STATUS.BAD_REQUEST
      );
    }

    ordersData!.delete(orderId);

    logger('[Orders] deleted', orderId);
    return response({ message: 'Order deleted successfully' }, STATUS.OK);
  } catch (error) {
    return handleError('Orders - DELETE', error);
  }
}
