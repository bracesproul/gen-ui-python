import {
  PieChartProps,
  BarChartProps,
  BarSeriesType,
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
    propsFunction: (orders: Order[]) => {
      throw new Error("Not implemented.");
    },
  },
  totalDiscount: {
    name: "totalDiscount",
    description:
      "Show the percentage of total order amount that was discounted, and the remaining percentage that was not discounted. Group by product name.",
    chartType: "bar",
    propsFunction: (orders: Order[]) => {
      throw new Error("Not implemented.");
    },
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
