import {
  streamRunnableUI,
  exposeEndpoints,
  EventHandlerFields,
} from "@/utils/server";
import { Filter, Order } from "./schema";
import { Client } from "@langchain/langgraph-sdk";
import { RunnableLambda } from "@langchain/core/runnables";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import {
  ChartType,
  DISPLAY_FORMATS,
  DataDisplayTypeAndDescription,
} from "./filters";
import { FilterButton } from "@/components/prebuilt/filter";
import { format } from "date-fns";
import { createStreamableUI } from "ai/rsc";
import {
  LoadingBarChart,
  LoadingPieChart,
  LoadingLineChart,
} from "@/components/prebuilt/loading-charts";
import {
  BarChart,
  BarChartProps,
  LineChart,
  LineChartProps,
  PieChart,
  PieChartProps,
} from "@/lib/mui";
import { LAMBDA_STREAM_WRAPPER_NAME } from "@/utils/server";

type FilterGraphInput = {
  input: string;
  orders: Order[];
  display_formats: Omit<DataDisplayTypeAndDescription, "propsFn">[];
};
type FilterGraphRunnableInput = Omit<FilterGraphInput, "input"> & {
  input: { content: string };
};
type CreateStreamableUIReturnType = ReturnType<typeof createStreamableUI>;

function handleSelectedFilters(
  selectedFilters: Partial<Filter>,
  ui: CreateStreamableUIReturnType,
) {
  const filtersWithValues: Partial<Filter> = Object.fromEntries(
    Object.entries(selectedFilters).filter(([key, value]) => {
      return value !== undefined && value !== null && key in selectedFilters;
    }),
  );
  const filterButtons = Object.entries(filtersWithValues).flatMap(
    ([key, value]) => {
      if (["string", "number"].includes(typeof value)) {
        return (
          <FilterButton
            key={key}
            filterKey={key}
            filterValue={value as string | number}
          />
        );
      } else if (Array.isArray(value)) {
        const values = value.join(", ");
        return <FilterButton key={key} filterKey={key} filterValue={values} />;
      } else if (typeof value === "object") {
        const formattedDate = format(new Date(value), "yyyy-MM-dd");
        return (
          <FilterButton key={key} filterKey={key} filterValue={formattedDate} />
        );
      } else if (typeof value === "boolean") {
        return (
          <FilterButton
            key={key}
            filterKey={key}
            filterValue={value ? "true" : "false"}
          />
        );
      }
      return [];
    },
  );
  const buttonsDiv = (
    <div className="flex flex-wrap gap-2 px-6">{filterButtons}</div>
  );
  ui.update(buttonsDiv);
}

function handleChartType(
  chartType: ChartType,
  ui: CreateStreamableUIReturnType,
) {
  if (chartType === "bar") {
    ui.append(<LoadingBarChart />);
  } else if (chartType === "pie") {
    ui.append(<LoadingPieChart />);
  } else if (chartType === "line") {
    ui.append(<LoadingLineChart />);
  }
}

function handleConstructingCharts(
  input: {
    orders: Order[];
    chartType: ChartType;
    displayFormat: string;
  },
  ui: CreateStreamableUIReturnType,
) {
  const displayDataObj = DISPLAY_FORMATS.find(
    (d) => d.key === input.displayFormat,
  );
  if (!displayDataObj) {
    throw new Error(
      `Display format ${input.displayFormat} not found in DISPLAY_FORMATS`,
    );
  }

  const props = displayDataObj.propsFn(input.orders);
  if (input.chartType === "bar") {
    ui.update(<BarChart {...(props as BarChartProps)} />);
  } else if (input.chartType === "pie") {
    ui.update(<PieChart {...(props as PieChartProps)} />);
  } else if (input.chartType === "line") {
    ui.update(<LineChart {...(props as LineChartProps)} />);
  }
}

async function filterGraph(inputs: FilterGraphInput) {
  "use server";

  const client = new Client({
    apiUrl: process.env.LANGGRAPH_CLOUD_API_URL,
    defaultHeaders: {
      "X-API-KEY": process.env.LANGGRAPH_CLOUD_API_KEY,
    },
  });
  const assistants = await client.assistants.search({
    metadata: null,
    offset: 0,
    limit: 1,
  });
  // We don't do any persisting, so we can just grab the first assistant
  const agent = assistants[0];

  const streamEventsRunnable = RunnableLambda.from(async function* (
    input: FilterGraphRunnableInput,
  ) {
    const streamResponse = client.runs.stream(null, agent.assistant_id, {
      streamMode: "events",
      input,
    });
    for await (const event of streamResponse) {
      yield event.data;
    }
  }).withConfig({ runName: LAMBDA_STREAM_WRAPPER_NAME });

  let displayFormat = "";
  let chartType: ChartType;
  const eventHandlerOne = (
    streamEvent: StreamEvent,
    fields: EventHandlerFields,
  ) => {
    const langGraphEvent: StreamEvent = streamEvent.data.chunk;
    if (!langGraphEvent) {
      return;
    }
    const { event, name, data } = langGraphEvent;
    if (event !== "on_chain_end") {
      return;
    }
    if (name === "generate_filters") {
      const { selected_filters }: { selected_filters: Partial<Filter> } =
        data.output;
      return handleSelectedFilters(selected_filters, fields.ui);
    } else if (name === "generate_chart_type") {
      chartType = data.output.chart_type;
      return handleChartType(chartType, fields.ui);
    } else if (name === "generate_data_display_format") {
      displayFormat = data.output.display_format;
    } else if (name === "filter_data") {
      const { orders } = data.output;
      if (!chartType || !displayFormat) {
        throw new Error(
          "Chart type and display format must be set before filtering data",
        );
      }
      return handleConstructingCharts(
        {
          orders,
          chartType,
          displayFormat,
        },
        fields.ui,
      );
    }
  };

  const processedInputs = {
    ...inputs,
    input: {
      content: inputs.input,
    },
  };

  return streamRunnableUI(streamEventsRunnable, processedInputs, {
    eventHandlers: [eventHandlerOne],
  });
}

export const EndpointsContext = exposeEndpoints({ filterGraph });
