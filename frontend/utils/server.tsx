import "server-only";

import { ReactNode, isValidElement } from "react";
import { createStreamableUI, createStreamableValue } from "ai/rsc";
import { Runnable, RunnableConfig, RunnableLambda } from "@langchain/core/runnables";
import {
  CallbackManagerForToolRun,
  CallbackManagerForRetrieverRun,
  CallbackManagerForChainRun,
  CallbackManagerForLLMRun,
} from "@langchain/core/callbacks/manager";
import {
  StreamEvent,
} from "@langchain/core/tracers/log_stream";
import { AIProvider } from "./client";
import { AIMessage } from "../ai/message";
import { CompiledStateGraph } from "@langchain/langgraph";
import { Github, GithubLoading } from "@/components/prebuilt/github";
import { Invoice, InvoiceLoading } from "@/components/prebuilt/invoice";
import {
  CurrentWeather,
  CurrentWeatherLoading,
} from "@/components/prebuilt/weather";

type ToolComponent = {
  loading: (props?: any) => JSX.Element;
  final: (props?: any) => JSX.Element;
};

type ToolComponentMap = {
  [tool: string]: ToolComponent;
};

const TOOL_COMPONENT_MAP: ToolComponentMap = {
  "github-repo": {
    loading: (props?: any) => <GithubLoading {...props} />,
    final: (props?: any) => <Github {...props} />,
  },
  "invoice-parser": {
    loading: (props?: any) => <InvoiceLoading {...props} />,
    final: (props?: any) => <Invoice {...props} />,
  },
  "weather-data": {
    loading: (props?: any) => <CurrentWeatherLoading {...props} />,
    final: (props?: any) => <CurrentWeather {...props} />,
  },
};

const TOOL_RUNNABLE_UI_MAP: Record<
  string,
  ReturnType<typeof createStreamableUI> | null
> = {
  "github-repo": null,
  "invoice-parser": null,
  "weather-data": null,
};

/**
 * Executes `streamEvents` method on a runnable
 * and converts the generator to a RSC friendly stream
 *
 * @param runnable
 * @returns React node which can be sent to the client
 */
export function streamRunnableUI<RunInput, RunOutput>(
  runnable:
    | Runnable<RunInput, RunOutput>
    | CompiledStateGraph<RunInput, Partial<RunInput>>,
  inputs: RunInput,
) {
  const ui = createStreamableUI();
  const [lastEvent, resolve] = withResolvers<
    Array<any> | Record<string, any>
  >();

  (async () => {
    let lastEventValue: StreamEvent | null = null;

    const callbacks: Record<
      string,
      ReturnType<typeof createStreamableUI | typeof createStreamableValue>
    > = {};

    let selectedToolComponent: ToolComponent | null = null;
    let selectedToolUI: ReturnType<typeof createStreamableUI> | null = null;

    for await (const streamEvent of (
      runnable as Runnable<RunInput, RunOutput>
    ).streamEvents(inputs, {
      version: "v1",
    })) {
      const { output, chunk } = streamEvent.data;
      const [type] = streamEvent.event.split("_").slice(2);

      if (type === "end" && output && typeof output === "object") {
        if (
          streamEvent.name === "invoke_model" &&
          "tool_calls" in output &&
          output.tool_calls.length > 0
        ) {
          const toolCall = output.tool_calls[0];
          if (!selectedToolComponent && !selectedToolUI) {
            selectedToolComponent = TOOL_COMPONENT_MAP[toolCall.type];
            selectedToolUI = createStreamableUI(
              selectedToolComponent.loading(),
            );
            ui.append(selectedToolUI?.value);
          }
        } else if (streamEvent.name === "invoke_tools") {
          if (selectedToolUI && selectedToolComponent) {
            const toolData = output.tool_result;
            selectedToolUI.done(selectedToolComponent.final(toolData));
          }
        }
      }

      if (
        streamEvent.event === "on_chat_model_stream" &&
        chunk &&
        typeof chunk === "object"
      ) {
        if (!callbacks[streamEvent.run_id]) {
          // the createStreamableValue / useStreamableValue is preferred
          // as the stream events are updated immediately in the UI
          // rather than being batched by React via createStreamableUI
          const textStream = createStreamableValue();
          ui.append(<AIMessage value={textStream.value} />);

          callbacks[streamEvent.run_id] = textStream;
        }

        if (callbacks[streamEvent.run_id]) {
          callbacks[streamEvent.run_id].append(chunk.content);
        }
      }

      lastEventValue = streamEvent;
    }

    // resolve the promise, which will be sent
    // to the client thanks to RSC
    resolve(lastEventValue?.data.output);

    Object.values(callbacks).forEach((cb) => cb.done());
    ui.done();
  })();
  return { ui: ui.value, lastEvent };
}

/**
 * Expose these endpoints outside for the client
 * We wrap the functions in order to properly resolve importing
 * client components.
 *
 * TODO: replace with createAI instead, even though that
 * implicitly handles state management
 *
 * See https://github.com/vercel/next.js/pull/59615
 * @param actions
 */
export function exposeEndpoints<T extends Record<string, unknown>>(
  actions: T,
): {
  (props: { children: ReactNode }): Promise<JSX.Element>;
  $$types?: T;
} {
  return async function AI(props: { children: ReactNode }) {
    return <AIProvider actions={actions}>{props.children}</AIProvider>;
  };
}

/**
 * Polyfill to emulate the upcoming Promise.withResolvers
 */
export function withResolvers<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;

  const innerPromise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  // @ts-expect-error
  return [innerPromise, resolve, reject] as const;
}
