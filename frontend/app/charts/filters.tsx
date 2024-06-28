import {
  PieChartProps,
  BarChartProps,
  LineChartProps,
  LineSeriesType,
} from "@/lib/mui";
import { Filter, Order } from "./schema";

export type ChartType = "bar" | "line" | "pie";

export type DataDisplayTypeAndDescription = {
  /**
   * The name of the data display type.
   */
  name: string;
  /**
   * The type of chart which this format can be displayed on.
   */
  chartType: ChartType;
  /**
   * The description of the data display type.
   */
  description: string;
  /**
   * The function to use to construct the props for the chart.
   */
  propsFunction: (
    orders: Order[],
  ) => BarChartProps | PieChartProps | LineChartProps;
};

export const DATA_DISPLAY_TYPES_AND_DESCRIPTIONS_MAP: {
  [name: string]: DataDisplayTypeAndDescription;
} = {
  totalAmount: {
    name: "totalAmount",
    description:
      "Sort by total dollar amount of orders, grouping by product name.",
    chartType: "bar",
    propsFunction: constructTotalAmountBarChartProps,
  },
  state: {
    name: "state",
    description:
      "Sort by total dollar amount of orders, grouping by the state the order was shipped to.",
    chartType: "bar",
    propsFunction: constructStateBarChartProps,
  },
  totalDiscount: {
    name: "totalDiscount",
    description:
      "Show the percentage of total order amount that was discounted, and the remaining percentage that was not discounted. Group by product name.",
    chartType: "bar",
    propsFunction: constructTotalDiscountBarChartProps,
  },
  status: {
    name: "status",
    description:
      "Show the percentage of orders in each status, grouping by order status.",
    chartType: "pie",
    propsFunction: constructStatusPieChartProps,
  },
  ordersByMonth: {
    name: "ordersByMonth",
    description:
      "Line chart where each line represents a product, and each point on the line represents the number of orders for that product in a given week. This should be used when displaying multiple products over time.",
    chartType: "line",
    propsFunction: constructByDateLineChartProps,
  },
};

export function constructTotalAmountBarChartProps(
  orders: Order[],
): BarChartProps {
  const sortedByNames = orders.reduce(
    (acc, order) => {
      if (!acc[order.productName]) {
        acc[order.productName] = [];
      }
      acc[order.productName].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );
  const ordersByProduct = Object.entries(sortedByNames)
    .map(([name, orders]) => {
      const totalOrderAmount = orders.reduce(
        (acc, order) => acc + order.amount,
        0,
      );
      return { name, totalAmount: totalOrderAmount };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
  return {
    yAxis: [{ scaleType: "band", dataKey: "name" }],
    series: [
      {
        dataKey: "totalAmount",
        label: "Total orders",
      },
    ],
    layout: "horizontal",
    dataset: ordersByProduct,
  };
}

export function constructStateBarChartProps(orders: Order[]): BarChartProps {
  const sortedByState = orders.reduce(
    (acc, order) => {
      if (!acc[order.address.state]) {
        acc[order.address.state] = [];
      }
      acc[order.address.state].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );
  const ordersByState = Object.entries(sortedByState)
    .map(([state, orders]) => {
      const totalOrderAmount = orders.reduce(
        (acc, order) => acc + order.amount,
        0,
      );
      return { state, totalAmount: totalOrderAmount };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);
  return {
    yAxis: [{ scaleType: "band", dataKey: "state" }],
    series: [
      {
        dataKey: "totalAmount",
        label: "Total orders",
      },
    ],
    layout: "horizontal",
    dataset: ordersByState,
  };
}

export function constructTotalDiscountBarChartProps(
  orders: Order[],
): BarChartProps {
  const sortedByNamesTotalDiscount = orders.reduce(
    (acc, order) => {
      if (!acc[order.productName]) {
        acc[order.productName] = [];
      }
      acc[order.productName].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );
  const seriesTotalDiscount = Object.entries(sortedByNamesTotalDiscount)
    .map(([name, ordersByProduct]) => {
      const totalDiscount = ordersByProduct.reduce((acc, o) => {
        if (!o.discount) {
          return acc;
        }
        const discountValue = o.amount * (o.discount / 100);
        return acc + discountValue;
      }, 0);
      const totalOrderAmount = ordersByProduct.reduce(
        (acc, o) => acc + o.amount,
        0,
      );
      const discountAsPercentage = (totalDiscount / totalOrderAmount) * 100;
      return [
        {
          data: [discountAsPercentage],
          stack: name,
          label: `${name} (discount)`,
        },
        {
          data: [100 - discountAsPercentage],
          stack: name,
          label: `${name} (rest)`,
        },
      ];
    })
    .flat();

  return {
    series: seriesTotalDiscount,
  };
}

export function constructStatusPieChartProps(orders: Order[]): PieChartProps {
  const totalOrdersForEachStatus = orders.reduce(
    (acc, o) => {
      if (!acc[o.status]) {
        acc[o.status] = 1;
      }
      acc[o.status] += 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const seriesStatus = Object.entries(totalOrdersForEachStatus).map(
    ([status, count], idx) => ({
      id: idx,
      value: count,
      label: status,
    }),
  );

  return {
    series: [
      {
        data: seriesStatus,
      },
    ],
  };
}

export function constructByDateLineChartProps(orders: Order[]): LineChartProps {
  if (orders.length === 0) {
    return { series: [], xAxis: [] };
  }

  const preProcessOrders = orders.map((order) => ({
    ...order,
    orderedAt: new Date(order.orderedAt),
  }));

  // Sort orders by date once
  preProcessOrders.sort(
    (a, b) => a.orderedAt.getTime() - b.orderedAt.getTime(),
  );

  const startDate = new Date(
    preProcessOrders[0].orderedAt.getFullYear(),
    preProcessOrders[0].orderedAt.getMonth(),
    1,
  );
  const endDate = new Date(
    preProcessOrders[preProcessOrders.length - 1].orderedAt.getFullYear(),
    preProcessOrders[preProcessOrders.length - 1].orderedAt.getMonth(),
    1,
  );

  // Pre-calculate month start dates
  const monthStartDates: Date[] = [];
  let currentDate = startDate;
  while (currentDate <= endDate) {
    monthStartDates.push(currentDate);
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
  }

  // Create a map of product names to their order counts per month
  const productOrderCounts: Record<string, number[]> = {};
  const monthCount = monthStartDates.length;

  preProcessOrders.forEach((order) => {
    const { productName, orderedAt } = order;
    const monthIndex =
      (orderedAt.getFullYear() - startDate.getFullYear()) * 12 +
      (orderedAt.getMonth() - startDate.getMonth());

    if (!productOrderCounts[productName]) {
      productOrderCounts[productName] = new Array(monthCount).fill(0);
    }
    productOrderCounts[productName][monthIndex]++;
  });

  const series: LineSeriesType[] = Object.keys(productOrderCounts).map(
    (productName) => ({
      dataKey: productName,
      label: productName,
      type: "line",
    }),
  );

  const dataset = monthStartDates.map((date, index) => {
    const dataPoint: { [key: string]: any } = { month: date };
    Object.entries(productOrderCounts).forEach(([productName, orderCounts]) => {
      dataPoint[productName] = orderCounts[index];
    });
    return dataPoint;
  });

  // Create the x-axis data for the line chart
  const xAxis = [
    {
      dataKey: "month",
    },
  ];

  return {
    series,
    xAxis,
    dataset,
  };
}

export function filterOrders(state: {
  selectedFilters: Partial<Filter>;
  orders: Order[];
}): { orders: Order[] } {
  const {
    productNames,
    beforeDate,
    afterDate,
    minAmount,
    maxAmount,
    state: orderState,
    city,
    discount,
    minDiscountPercentage,
    status,
  } = state.selectedFilters;

  if (minDiscountPercentage !== undefined && discount === false) {
    throw new Error(
      "Can not filter by minDiscountPercentage when discount is false.",
    );
  }

  let filteredOrders = state.orders.filter((order) => {
    let isMatch = true;

    if (
      productNames &&
      !productNames.includes(order.productName.toLowerCase())
    ) {
      isMatch = false;
    }

    if (beforeDate && order.orderedAt > beforeDate) {
      isMatch = false;
    }
    if (afterDate && order.orderedAt < afterDate) {
      isMatch = false;
    }
    if (minAmount && order.amount < minAmount) {
      isMatch = false;
    }
    if (maxAmount && order.amount > maxAmount) {
      isMatch = false;
    }
    if (
      orderState &&
      order.address.state.toLowerCase() !== orderState.toLowerCase()
    ) {
      isMatch = false;
    }
    if (city && order.address.city.toLowerCase() !== city.toLowerCase()) {
      isMatch = false;
    }
    if (discount !== undefined && (order.discount === undefined) !== discount) {
      isMatch = false;
    }
    if (
      minDiscountPercentage !== undefined &&
      (order.discount === undefined || order.discount < minDiscountPercentage)
    ) {
      isMatch = false;
    }
    if (status && order.status.toLowerCase() !== status) {
      isMatch = false;
    }

    return isMatch;
  });

  return {
    orders: filteredOrders,
  };
}

/**
 * Order Amount by Product Name
X-axis: Product Name (productName)
Y-axis: Order Amount (amount)
This chart would show the total sales for each product.
 */
export function constructProductSalesBarChartProps(
  orders: Order[],
): BarChartProps {
  const salesByProduct = orders.reduce(
    (acc, order) => {
      if (!acc[order.productName]) {
        acc[order.productName] = 0;
      }
      acc[order.productName] += order.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dataset = Object.entries(salesByProduct)
    .map(([productName, totalSales]) => ({ productName, totalSales }))
    .sort((a, b) => b.totalSales - a.totalSales);

  return {
    xAxis: [{ scaleType: "band", dataKey: "productName" }],
    series: [
      {
        dataKey: "totalSales",
        label: "Total Sales",
      },
    ],
    dataset,
  };
}

/**
 * Order Count by Status
X-axis: Order Status (status)
Y-axis: Number of Orders
This chart would display the distribution of orders across different statuses.
 */
export function constructOrderCountByStatusBarChartProps(
  orders: Order[],
): BarChartProps {
  const orderCountByStatus = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dataset = Object.entries(orderCountByStatus)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    xAxis: [{ scaleType: "band", dataKey: "status" }],
    yAxis: [
      {
        scaleType: "linear",
      },
    ],
    series: [
      {
        dataKey: "count",
        label: "Number of Orders",
      },
    ],
    dataset,
  };
}

/**
 * Average Discount by Product Name
X-axis: Product Name (productName)
Y-axis: Average Discount Percentage (discount)
This chart would show which products have the highest average discounts.
 */
export function constructAverageDiscountByProductBarChartProps(
  orders: Order[],
): BarChartProps {
  const discountsByProduct = orders.reduce(
    (acc, order) => {
      if (!acc[order.productName]) {
        acc[order.productName] = { totalDiscount: 0, count: 0 };
      }
      if (order.discount !== undefined) {
        acc[order.productName].totalDiscount += order.discount;
        acc[order.productName].count++;
      }
      return acc;
    },
    {} as Record<string, { totalDiscount: number; count: number }>,
  );

  const dataset = Object.entries(discountsByProduct)
    .map(([productName, { totalDiscount, count }]) => ({
      productName,
      averageDiscount: count > 0 ? totalDiscount / count : 0,
    }))
    .sort((a, b) => b.averageDiscount - a.averageDiscount);

  return {
    xAxis: [{ scaleType: "band", dataKey: "productName" }],
    yAxis: [
      {
        scaleType: "linear",
        max: 100,
      },
    ],
    series: [
      {
        dataKey: "averageDiscount",
        label: "Average Discount",
      },
    ],
    dataset,
  };
}

/**
 * Order Count by State
X-axis: State (address.state)
Y-axis: Number of Orders
This chart would visualize the geographic distribution of orders by state.
 */
export function constructOrderCountByStateBarChartProps(
  orders: Order[],
): BarChartProps {
  const orderCountByState = orders.reduce(
    (acc, order) => {
      const state = order.address.state;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dataset = Object.entries(orderCountByState)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  return {
    xAxis: [{ scaleType: "band", dataKey: "state" }],
    yAxis: [
      {
        scaleType: "linear",
      },
    ],
    series: [
      {
        dataKey: "count",
        label: "Number of Orders",
      },
    ],
    dataset,
  };
}

/**
 * Weekly Order Volume
X-axis: Date (orderedAt, grouped by week)
Y-axis: Number of Orders
This chart would show the trend of order volume over time, allowing you to identify peak ordering weeks.
 */
export function constructWeeklyOrderVolumeBarChartProps(
  orders: Order[],
): BarChartProps {
  // Helper function to get the start of the week (Sunday) for a given date
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Set to Sunday
    d.setHours(0, 0, 0, 0); // Set to midnight
    return d;
  };

  // Group orders by week
  const ordersByWeek = orders.reduce(
    (acc, order) => {
      const weekStart = getWeekStart(order.orderedAt);
      const weekKey = weekStart.toISOString().split("T")[0]; // Get YYYY-MM-DD of week start
      if (!acc[weekKey]) {
        acc[weekKey] = 0;
      }
      acc[weekKey]++;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Convert to array and sort by week
  const dataset = Object.entries(ordersByWeek)
    .map(([weekStart, count]) => ({ weekStart, count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return {
    xAxis: [
      {
        scaleType: "band",
        dataKey: "weekStart",
        tickLabelStyle: {
          angle: 45,
          textAnchor: "start",
          dominantBaseline: "hanging",
        },
      },
    ],
    yAxis: [
      {
        scaleType: "linear",
        label: "Number of Orders",
        valueFormatter: (value) => value.toString(),
      },
    ],
    series: [
      {
        dataKey: "count",
        label: "Order Count",
      },
    ],
    dataset,
  };
}

/**
 *Order Amount Over Time
X-axis: orderedAt (Date)
Y-axis: amount (Number)
This chart would show the trend of order amounts over time.
 */
export function constructOrderAmountOverTimeLineChartProps(
  orders: Order[],
): LineChartProps {
  if (orders.length === 0) {
    return { series: [], xAxis: [] };
  }

  // Sort orders by date
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(a.orderedAt).getTime() - new Date(b.orderedAt).getTime(),
  );

  // Create dataset
  const dataset = sortedOrders.map((order) => ({
    date: new Date(order.orderedAt),
    amount: order.amount,
  }));

  return {
    series: [
      {
        dataKey: "amount",
        label: "Order Amount",
        type: "line",
      },
    ],
    xAxis: [
      {
        dataKey: "date",
        scaleType: "time",
      },
    ],
    yAxis: [
      {
        label: "Amount ($)",
      },
    ],
    dataset,
  };
}

/**
 * Discount Percentage Distribution
X-axis: discount (Number, 0-100)
Y-axis: Count of orders with that discount (Number)
This chart would show the distribution of discounts across orders.
Filters out orders which do not have a discount.
 */
export function constructDiscountDistributionLineChartProps(
  orders: Order[],
): LineChartProps {
  // Filter orders with discounts
  const ordersWithDiscount = orders.filter(
    (order) => order.discount !== undefined,
  );
  const discountCounts: Record<number, number> = {};

  // Count orders for each discount percentage
  ordersWithDiscount.forEach((order) => {
    const roundedDiscount = Math.round(order.discount!);
    discountCounts[roundedDiscount] =
      (discountCounts[roundedDiscount] || 0) + 1;
  });

  // Create dataset with only the discount percentages that appear in the data
  const dataset = Object.entries(discountCounts)
    .map(([discountPercentage, count]) => ({
      discountPercentage: parseInt(discountPercentage),
      count,
    }))
    .sort((a, b) => a.discountPercentage - b.discountPercentage);

  return {
    series: [
      {
        dataKey: "count",
        label: "Number of Orders",
        type: "line",
        curve: "linear",
      },
    ],
    xAxis: [
      {
        dataKey: "discountPercentage",
        label: "Discount Percentage",
        scaleType: "linear",
      },
    ],
    yAxis: [
      {
        label: "Number of Orders",
        scaleType: "linear",
      },
    ],
    dataset,
  };
}

/**
 * Average Order Amount by Month
X-axis: Month (derived from orderedAt)
Y-axis: Average amount (Number)
This chart would show how the average order amount changes month by month.
 */
export function constructAverageOrderAmountByMonthLineChartProps(
  orders: Order[],
): LineChartProps {
  if (orders.length === 0) {
    return { series: [], xAxis: [] };
  }

  // Preprocess orders and sort by date
  const processedOrders = orders
    .map((order) => ({
      ...order,
      orderedAt: new Date(order.orderedAt),
    }))
    .sort((a, b) => a.orderedAt.getTime() - b.orderedAt.getTime());

  // Group orders by month and calculate average amount
  const monthlyAverages: { [key: string]: { total: number; count: number } } =
    {};

  processedOrders.forEach((order) => {
    const monthKey = `${order.orderedAt.getFullYear()}-${String(order.orderedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyAverages[monthKey]) {
      monthlyAverages[monthKey] = { total: 0, count: 0 };
    }
    monthlyAverages[monthKey].total += order.amount;
    monthlyAverages[monthKey].count += 1;
  });

  // Create dataset
  const dataset = Object.entries(monthlyAverages)
    .map(([month, { total, count }]) => ({
      month: new Date(`${month}-01`),
      averageAmount: total / count,
    }))
    .sort((a, b) => a.month.getTime() - b.month.getTime());

  return {
    series: [
      {
        dataKey: "averageAmount",
        label: "Average Order Amount",
        type: "line",
        curve: "linear",
      },
    ],
    xAxis: [
      {
        dataKey: "month",
        scaleType: "time",
      },
    ],

    width: 800,
    height: 400,
    dataset,
  };
}

/**
 * Order Status Distribution:
Display each status (pending, processing, shipped, delivered, cancelled, returned) as a slice of the pie, with the size of each slice representing the number of orders in that status. This provides a quick overview of the current state of all orders.
 */
export function constructOrderStatusDistributionPieChartProps(
  orders: Order[],
): PieChartProps {
  const statusCounts = orders.reduce(
    (acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = Object.entries(statusCounts).map(([status, count], index) => ({
    id: index,
    value: count,
    label: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize first letter
  }));

  return {
    series: [
      {
        data,
        highlightScope: { faded: "global", highlighted: "item" },
        faded: { innerRadius: 30, additionalRadius: -30 },
      },
    ],
    margin: { top: 10, bottom: 10, left: 10, right: 10 },
    legend: { hidden: false },
  };
}

/**
 * Product Name Popularity:
Show each unique productName as a slice, with the size representing the number of orders for that product. This helps identify the most popular products in your store.
 */
export function constructProductPopularityPieChartProps(
  orders: Order[],
): PieChartProps {
  const productCounts = orders.reduce(
    (acc, order) => {
      acc[order.productName] = (acc[order.productName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = Object.entries(productCounts)
    .map(([productName, count], index) => ({
      id: index,
      value: count,
      label: productName,
    }))
    .sort((a, b) => b.value - a.value); // Sort by count in descending order

  return {
    series: [
      {
        data,
        highlightScope: { faded: "global", highlighted: "item" },
        faded: { innerRadius: 30, additionalRadius: -30 },
      },
    ],
    margin: { top: 10, bottom: 10, left: 10, right: 10 },
    legend: { hidden: false },
    slotProps: {
      legend: {
        direction: "column",
        position: { vertical: "middle", horizontal: "right" },
        padding: 0,
      },
    },
  };
}

/**
 * State-wise Order Distribution:
Use the address.state field to create slices for each state, with slice sizes representing the number of orders from that state. This visualizes which cities generate the most orders.
 */
export function constructDiscountDistributionPieChartProps(
  orders: Order[],
): PieChartProps {
  const discountCounts = orders.reduce(
    (acc, order) => {
      if (order.discount !== undefined) {
        acc.discounted++;
      } else {
        acc.nonDiscounted++;
      }
      return acc;
    },
    { discounted: 0, nonDiscounted: 0 },
  );

  const data = [
    { id: 0, value: discountCounts.discounted, label: "Discounted" },
    { id: 1, value: discountCounts.nonDiscounted, label: "Non-discounted" },
  ];

  return {
    series: [
      {
        data,
        highlightScope: { faded: "global", highlighted: "item" },
        faded: { innerRadius: 30, additionalRadius: -30 },
      },
    ],
    margin: { top: 10, bottom: 10, left: 10, right: 10 },
    legend: { hidden: false },
  };
}

/**
 * Quarterly Order Distribution:
 * Groups orders by quarter using the orderedAt field, with each slice representing
 * a quarter and its size showing the number of orders in that quarter. This
 * visualizes seasonal trends in order volume on a quarterly basis.
 */
export function constructQuarterlyOrderDistributionPieChartProps(
  orders: Order[],
): PieChartProps {
  const quarterlyOrderCounts = orders.reduce(
    (acc, order) => {
      const date = new Date(order.orderedAt);
      const year = date.getFullYear();
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const quarterKey = `Q${quarter} ${year}`;
      acc[quarterKey] = (acc[quarterKey] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const data = Object.entries(quarterlyOrderCounts)
    .map(([quarterYear, count], index) => ({
      id: index,
      value: count,
      label: quarterYear,
    }))
    .sort((a, b) => {
      const [aQuarter, aYear] = a.label.split(" ");
      const [bQuarter, bYear] = b.label.split(" ");
      return (
        parseInt(aYear) - parseInt(bYear) ||
        parseInt(aQuarter.slice(1)) - parseInt(bQuarter.slice(1))
      );
    });

  return {
    series: [
      {
        data,
        highlightScope: { faded: "global", highlighted: "item" },
        faded: { innerRadius: 30, additionalRadius: -30 },
      },
    ],
    margin: { top: 10, bottom: 10, left: 10, right: 10 },
    legend: { hidden: false },
    slotProps: {
      legend: {
        direction: "column",
        position: { vertical: "middle", horizontal: "right" },
        padding: 0,
      },
    },
  };
}
