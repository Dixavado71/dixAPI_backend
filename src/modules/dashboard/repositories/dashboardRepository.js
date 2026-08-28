import prisma from '../../../infrastructure/database/prismaClient.js';

const dateRange = (from, to) => {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = from ? new Date(from) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  return { start, end };
};

export async function getOverview(companyId, { from, to } = {}) {
  const { start, end } = dateRange(from, to);

  const [revenueAgg, totalOrders, totalCustomers, totalConversations, monthly, topProducts, segments, channels] = await Promise.all([
    prisma.order.aggregate({
      where: { company_id: companyId, status: 'completed', order_date: { gte: start, lte: end } },
      _sum: { total: true },
    }),
    prisma.order.count({ where: { company_id: companyId, order_date: { gte: start, lte: end } } }),
    prisma.customer.count({ where: { company_id: companyId, status: 'active' } }),
    prisma.conversation.count({ where: { company_id: companyId } }),
    prisma.$queryRaw`
      SELECT date_trunc('month', order_date) AS month,
             SUM(total) AS revenue,
             COUNT(*)::int AS orders
      FROM orders
      WHERE company_id = ${companyId}::uuid
        AND status = 'completed'
        AND order_date >= ${start} AND order_date <= ${end}
      GROUP BY date_trunc('month', order_date)
      ORDER BY month ASC
    `,
    prisma.$queryRaw`
      SELECT p.id, p.name, SUM(oi.quantity)::int AS total_sales, SUM(oi.subtotal) AS revenue
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.company_id = ${companyId}::uuid AND o.status = 'completed'
        AND o.order_date >= ${start} AND o.order_date <= ${end}
      GROUP BY p.id, p.name
      ORDER BY total_sales DESC
      LIMIT 5
    `,
    prisma.customer.groupBy({
      by: ['segment'],
      where: { company_id: companyId },
      _count: { _all: true },
    }),
    prisma.conversation.groupBy({
      by: ['channel'],
      where: { company_id: companyId },
      _count: { _all: true },
    }),
  ]);

  const customerTotal = segments.reduce((acc, s) => acc + s._count._all, 0) || 1;

  return {
    revenue: Number(revenueAgg._sum.total ?? 0),
    totalOrders,
    totalCustomers,
    totalConversations,
    monthlyRevenue: monthly.map((m) => ({
      date: String(m.month).slice(0, 10),
      revenue: Number(m.revenue ?? 0),
      orders: Number(m.orders ?? 0),
    })),
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      totalSales: Number(p.total_sales),
      revenue: Number(p.revenue),
    })),
    customerSegments: segments.map((s) => ({
      segment: s.segment,
      count: s._count._all,
      percentage: Math.round((s._count._all / customerTotal) * 1000) / 10,
    })),
    conversationsByChannel: channels.map((c) => ({
      channel: c.channel,
      count: c._count._all,
    })),
  };
}

export default { getOverview };
