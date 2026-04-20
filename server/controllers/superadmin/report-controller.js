const Order = require("../../models/Order");
const Product = require("../../models/Product");

// Match criteria for sales: only include orders that have been picked up (completed sales)
// Orders must be pickedUp (which automatically sets paymentStatus to "paid") and not archived
const PAYMENT_MATCH = {
  orderStatus: "pickedUp",
  isArchived: false,
};

const DEFAULT_TREND_WINDOWS = {
  daily: 7,
  weekly: 8,
  monthly: 6,
};

const startOfDay = (date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date = new Date()) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const startOfWeek = (date = new Date()) => {
  const copy = startOfDay(date);
  const day = copy.getDay(); // 0 (Sun) -> 6 (Sat)
  const diff = (day + 6) % 7; // shift to Monday as first day
  copy.setDate(copy.getDate() - diff);
  return copy;
};

const startOfMonth = (date = new Date()) => {
  const copy = startOfDay(date);
  copy.setDate(1);
  return copy;
};

const addDays = (date, days) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const addWeeks = (date, weeks) => addDays(date, weeks * 7);

const addMonths = (date, months) => {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const formatCurrencyNumber = (value = 0) =>
  Math.round((Number(value) || 0) * 100) / 100;

const formatLabel = (groupBy, referenceDate) => {
  const date = new Date(referenceDate);

  if (groupBy === "week") {
    const options = { month: "short", day: "numeric" };
    return `Week of ${date.toLocaleDateString("en-US", options)}`;
  }

  if (groupBy === "month") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const buildMatchStage = (startDate, endDate) => {
  // Only count orders that have been picked up (completed sales)
  const matchStage = {
    ...PAYMENT_MATCH, // This already includes orderStatus: "pickedUp" and isArchived: false
  };

  // Use orderUpdateDate (when order was picked up/payment completed) instead of orderDate
  if (startDate || endDate) {
    matchStage.orderUpdateDate = {};
    if (startDate) {
      matchStage.orderUpdateDate.$gte = startDate;
    }
    if (endDate) {
      matchStage.orderUpdateDate.$lte = endDate;
    }
  }

  return matchStage;
};

const buildTrendPipeline = ({ startDate, endDate, groupBy }) => {
  // Use orderUpdateDate (when order was picked up/payment completed) for grouping
  const dateField =
    groupBy === "month"
      ? {
          year: { $year: "$orderUpdateDate" },
          month: { $month: "$orderUpdateDate" },
        }
      : groupBy === "week"
      ? {
          isoYear: { $isoWeekYear: "$orderUpdateDate" },
          isoWeek: { $isoWeek: "$orderUpdateDate" },
        }
      : {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$orderUpdateDate" },
          },
        };

  return [
    { $match: buildMatchStage(startDate, endDate) },
    {
      $addFields: {
        totalItemsOrdered: {
          $sum: {
            $map: {
              input: { $ifNull: ["$cartItems", []] },
              as: "item",
              in: "$$item.quantity",
            },
          },
        },
      },
    },
    {
      $group: {
        _id: dateField,
        totalSales: { $sum: "$totalAmount" },
        orderCount: { $sum: 1 },
        totalItems: { $sum: "$totalItemsOrdered" },
        firstOrderDate: { $min: "$orderUpdateDate" },
      },
    },
    { $sort: { firstOrderDate: 1 } },
  ];
};

const buildSummaryPipeline = ({ startDate, endDate }) => [
  { $match: buildMatchStage(startDate, endDate) },
  {
    $addFields: {
      totalItemsOrdered: {
        $sum: {
          $map: {
            input: { $ifNull: ["$cartItems", []] },
            as: "item",
            in: "$$item.quantity",
          },
        },
      },
    },
  },
  {
    $group: {
      _id: null,
      totalSales: { $sum: "$totalAmount" },
      orderCount: { $sum: 1 },
      totalItems: { $sum: "$totalItemsOrdered" },
    },
  },
];

const toTrendBuckets = (docs = [], groupBy) =>
  docs.map((doc) => {
    const totalSales = formatCurrencyNumber(doc.totalSales);
    const orderCount = doc.orderCount || 0;
    const avgOrderValue =
      orderCount === 0 ? 0 : formatCurrencyNumber(totalSales / orderCount);

    return {
      label: formatLabel(groupBy, doc.firstOrderDate),
      totalSales,
      orderCount,
      totalItems: doc.totalItems || 0,
      avgOrderValue,
      firstOrderDate: doc.firstOrderDate,
    };
  });

const buildItemsPipeline = ({ startDate, endDate, groupBy }) => {
  // Use orderUpdateDate (when order was picked up/payment completed) for grouping
  const labelField =
    groupBy === "month"
      ? {
          $dateToString: { format: "%Y-%m", date: "$orderUpdateDate" },
        }
      : groupBy === "week"
      ? {
          $concat: [
            { $toString: { $isoWeekYear: "$orderUpdateDate" } },
            "-W",
            { $toString: { $isoWeek: "$orderUpdateDate" } },
          ],
        }
      : {
          $dateToString: { format: "%Y-%m-%d", date: "$orderUpdateDate" },
        };

  return [
    { $match: buildMatchStage(startDate, endDate) },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $unwind: "$cartItems" },
    {
      $group: {
        _id: {
          label: labelField,
          productId: "$cartItems.productId",
          title: "$cartItems.title",
          image: "$cartItems.image",
          price: "$cartItems.price",
        },
        quantity: { $sum: "$cartItems.quantity" },
        revenue: {
          $sum: { $multiply: ["$cartItems.price", "$cartItems.quantity"] },
        },
        buyers: {
          $push: {
            userId: "$user._id",
            userName: "$user.userName",
            email: "$user.email",
            orderId: "$_id",
            quantity: "$cartItems.quantity",
            revenue: {
              $multiply: ["$cartItems.price", "$cartItems.quantity"],
            },
          },
        },
        lastUpdated: { $max: "$orderUpdateDate" },
      },
    },
    {
      $group: {
        _id: "$_id.label",
        items: {
          $push: {
            productId: "$_id.productId",
            title: "$_id.title",
            image: "$_id.image",
            price: "$_id.price",
            quantity: "$quantity",
            revenue: "$revenue",
            buyers: "$buyers",
          },
        },
        lastUpdated: { $max: "$lastUpdated" },
      },
    },
    { $sort: { lastUpdated: 1 } },
  ];
};

const aggregateTrend = async ({ startDate, endDate, groupBy }) => {
  let rangeStart = startDate;
  let rangeEnd = endDate;

  if (rangeEnd < rangeStart) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  const pipeline = buildTrendPipeline({
    startDate: rangeStart,
    endDate: rangeEnd,
    groupBy,
  });
  const docs = await Order.aggregate(pipeline);
  const buckets = toTrendBuckets(docs, groupBy);

  const totals = buckets.reduce(
    (acc, bucket) => {
      acc.totalSales += bucket.totalSales;
      acc.orderCount += bucket.orderCount;
      acc.totalItems += bucket.totalItems;
      return acc;
    },
    { totalSales: 0, orderCount: 0, totalItems: 0 }
  );

  const avgOrderValue =
    totals.orderCount === 0
      ? 0
      : formatCurrencyNumber(totals.totalSales / totals.orderCount);

  return {
    buckets,
    totalSales: formatCurrencyNumber(totals.totalSales),
    orderCount: totals.orderCount,
    totalItems: totals.totalItems,
    avgOrderValue,
  };
};

const aggregateSummary = async ({ startDate, endDate, label }) => {
  const pipeline = buildSummaryPipeline({ startDate, endDate });
  const [doc] = await Order.aggregate(pipeline);

  const totalSales = formatCurrencyNumber(doc?.totalSales || 0);
  const orderCount = doc?.orderCount || 0;
  const totalItems = doc?.totalItems || 0;
  const avgOrderValue =
    orderCount === 0
      ? 0
      : formatCurrencyNumber(totalSales / orderCount);

  return {
    label,
    totalSales,
    orderCount,
    totalItems,
    avgOrderValue,
  };
};

const aggregateTopItems = async ({ startDate, endDate, groupBy }) => {
  let rangeStart = startDate;
  let rangeEnd = endDate;

  if (rangeEnd < rangeStart) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  const pipeline = buildItemsPipeline({
    startDate: rangeStart,
    endDate: rangeEnd,
    groupBy,
  });

  const docs = await Order.aggregate(pipeline);

  return docs.map((doc) => ({
    label:
      groupBy === "week"
        ? `Week of ${new Date(doc.lastUpdated).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}`
        : groupBy === "month"
        ? new Date(doc.lastUpdated).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        : new Date(doc.lastUpdated).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
    items: doc.items
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item) => {
        const buyerAggregation = {};

        (item.buyers || []).forEach((buyer) => {
          const key =
            buyer?.email?.toLowerCase()?.trim() ||
            (buyer?.userId ? String(buyer.userId) : buyer?.orderId);

          if (!key) {
            return;
          }

          if (!buyerAggregation[key]) {
            buyerAggregation[key] = {
              userId: buyer.userId,
              userName: buyer.userName || "Guest",
              email: buyer.email,
              orderId: buyer.orderId,
              quantity: 0,
              revenue: 0,
            };
          }

          buyerAggregation[key].quantity += buyer.quantity || 0;
          buyerAggregation[key].revenue += buyer.revenue || 0;
        });

        const uniqueBuyers = Object.values(buyerAggregation).map(
          (buyer) => ({
            ...buyer,
            revenue: formatCurrencyNumber(buyer.revenue || 0),
          })
        );

        return {
        productId: item.productId,
        title: item.title,
        image: item.image,
        price: formatCurrencyNumber(item.price),
        quantity: item.quantity,
        revenue: formatCurrencyNumber(item.revenue),
          buyers: uniqueBuyers,
        };
      }),
  }));
};

const buildSalesReport = async () => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const todayEnd = endOfDay(now);

  const pastDailyStart = addDays(
    todayStart,
    -1 * (DEFAULT_TREND_WINDOWS.daily - 1)
  );
  const pastWeeklyStart = addWeeks(
    weekStart,
    -1 * (DEFAULT_TREND_WINDOWS.weekly - 1)
  );
  const pastMonthlyStart = addMonths(
    monthStart,
    -1 * (DEFAULT_TREND_WINDOWS.monthly - 1)
  );

  const [
    todaySummary,
    weeklySummary,
    monthlySummary,
    dailyTrend,
    weeklyTrend,
    monthlyTrend,
    dailyItems,
  ] = await Promise.all([
    aggregateSummary({
      startDate: todayStart,
      endDate: todayEnd,
      label: "Today",
    }),
    aggregateSummary({
      startDate: weekStart,
      endDate: todayEnd,
      label: "This Week",
    }),
    aggregateSummary({
      startDate: monthStart,
      endDate: todayEnd,
      label: "This Month",
    }),
    aggregateTrend({
      startDate: pastDailyStart,
      endDate: todayEnd,
      groupBy: "day",
    }),
    aggregateTrend({
      startDate: pastWeeklyStart,
      endDate: todayEnd,
      groupBy: "week",
    }),
    aggregateTrend({
      startDate: pastMonthlyStart,
      endDate: todayEnd,
      groupBy: "month",
    }),
    aggregateTopItems({
      startDate: pastDailyStart,
      endDate: todayEnd,
      groupBy: "day",
    }),
  ]);

  return {
    generatedAt: now,
    overview: {
      daily: todaySummary,
      weekly: weeklySummary,
      monthly: monthlySummary,
    },
    series: {
      daily: dailyTrend.buckets,
      weekly: weeklyTrend.buckets,
      monthly: monthlyTrend.buckets,
    },
    itemsByDay: dailyItems,
  };
};

const getSalesReport = async (req, res) => {
  try {
    const data = await buildSalesReport();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to build sales report:", error);
    res.status(500).json({
      success: false,
      message: "Unable to build sales report.",
    });
  }
};

// Monthly Sales Report
const getMonthlySalesReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month parameters are required.",
      });
    }

    const startDate = new Date(year, month - 1, 1); // month is 0-indexed
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

    const monthlyData = await aggregateTrend({
      startDate,
      endDate,
      groupBy: "day",
    });

    const summary = await aggregateSummary({
      startDate,
      endDate,
      label: `${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
    });

    res.status(200).json({
      success: true,
      data: {
        period: summary.label,
        summary,
        dailyBreakdown: monthlyData.buckets,
      },
    });
  } catch (error) {
    console.error("Failed to build monthly sales report:", error);
    res.status(500).json({
      success: false,
      message: "Unable to build monthly sales report.",
    });
  }
};

// Yearly Sales Report
const getYearlySalesReport = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: "Year parameter is required.",
      });
    }

    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st

    const yearlyData = await aggregateTrend({
      startDate,
      endDate,
      groupBy: "month",
    });

    const summary = await aggregateSummary({
      startDate,
      endDate,
      label: `Year ${year}`,
    });

    res.status(200).json({
      success: true,
      data: {
        period: summary.label,
        summary,
        monthlyBreakdown: yearlyData.buckets,
      },
    });
  } catch (error) {
    console.error("Failed to build yearly sales report:", error);
    res.status(500).json({
      success: false,
      message: "Unable to build yearly sales report.",
    });
  }
};

// Inventory Report
const getInventoryReport = async (req, res) => {
  console.log('getInventoryReport called by user:', req.user ? req.user.email : 'No user');
  try {
    const { year, month } = req.query;

    let startDate, endDate, periodLabel;

    if (year && month) {
      // Monthly inventory report
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
      periodLabel = `${new Date(year, month - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
    } else if (year) {
      // Yearly inventory report
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      periodLabel = `Year ${year}`;
    } else {
      // Current inventory report
      startDate = null;
      endDate = null;
      periodLabel = "Current";
    }

    // Get all products
    const products = await Product.find({ isArchived: false }).select(
      "title category totalStock price image"
    );
    console.log('Found', products.length, 'products');

    // Calculate stock movements during the period
    let stockMovements = [];
    if (startDate && endDate) {
      const orders = await Order.find({
        orderStatus: "pickedUp",
        isArchived: false,
        orderUpdateDate: { $gte: startDate, $lte: endDate },
      }).select("cartItems orderUpdateDate");

      // Aggregate stock movements by product
      const movementMap = new Map();

      orders.forEach((order) => {
        order.cartItems.forEach((item) => {
          const productId = item.productId.toString();
          if (!movementMap.has(productId)) {
            movementMap.set(productId, {
              productId,
              title: item.title,
              soldQuantity: 0,
              revenue: 0,
            });
          }
          const movement = movementMap.get(productId);
          movement.soldQuantity += item.quantity;
          movement.revenue += item.price * item.quantity;
        });
      });

      stockMovements = Array.from(movementMap.values());
    }

    // Combine current stock with movements
    const inventoryData = products.map((product) => {
      const movement = stockMovements.find(
        (m) => m.productId === product._id.toString()
      );

      return {
        productId: product._id,
        title: product.title,
        category: product.category,
        currentStock: product.totalStock,
        price: formatCurrencyNumber(product.price),
        image: product.image,
        soldQuantity: movement ? movement.soldQuantity : 0,
        revenue: movement ? formatCurrencyNumber(movement.revenue) : 0,
        remainingStock: product.totalStock - (movement ? movement.soldQuantity : 0),
      };
    });

    // Calculate summary
    const summary = inventoryData.reduce(
      (acc, item) => {
        acc.totalProducts += 1;
        acc.totalStockValue += item.currentStock * parseFloat(item.price);
        acc.totalSoldValue += parseFloat(item.revenue);
        acc.lowStockItems += item.currentStock <= 10 ? 1 : 0;
        acc.outOfStockItems += item.currentStock === 0 ? 1 : 0;
        return acc;
      },
      {
        totalProducts: 0,
        totalStockValue: 0,
        totalSoldValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
      }
    );

    summary.totalStockValue = formatCurrencyNumber(summary.totalStockValue);
    summary.totalSoldValue = formatCurrencyNumber(summary.totalSoldValue);

    res.status(200).json({
      success: true,
      data: {
        period: periodLabel,
        summary,
        inventory: inventoryData.sort((a, b) => b.currentStock - a.currentStock),
      },
    });
  } catch (error) {
    console.error("Failed to build inventory report:", error);
    res.status(500).json({
      success: false,
      message: "Unable to build inventory report.",
    });
  }
};

module.exports = {
  getSalesReport,
  getMonthlySalesReport,
  getYearlySalesReport,
  getInventoryReport,
};


