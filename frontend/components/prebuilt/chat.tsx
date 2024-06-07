"use client";

import { useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { EndpointsContext } from "@/app/agent";
import { useActions } from "@/utils/client";
import { LocalContext } from "@/app/shared";
import { RemoteRunnable } from "@langchain/core/runnables/remote";
import { Github, GithubLoading } from "./github";
import { Invoice, InvoiceLoading } from "./invoice";
import { CurrentWeather, CurrentWeatherLoading } from "./weather";
import { createStreamableUI, createStreamableValue } from "ai/rsc";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import { AIMessage } from "@/ai/message";
import { HumanMessageText } from "./message";

export interface ChatProps {}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(",")[1]); // Remove the data URL prefix
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

function FileUploadMessage({ file }: { file: File }) {
  return (
    <div className="flex w-full max-w-fit ml-auto">
      <p>File uploaded: {file.name}</p>
    </div>
  );
}

// async function callRemoteRunnable(input: string) {
//   const ui = createStreamableUI();
//   const API_URL = "http://localhost:8000/chat";

//   const remoteRunnable = new RemoteRunnable({
//     url: API_URL,
//   });

//   const requestData = {
//     content: input,
//     additional_kwargs: {},
//     response_metadata: {},
//     type: "human",
//     name: "string",
//     id: "string",
//     example: false
//   }
//   let lastEventValue: StreamEvent | null = null;

//   const callbacks: Record<
//     string,
//     ReturnType<typeof createStreamableUI | typeof createStreamableValue>
//   > = {};

//   let selectedTool: ToolComponent | null = null;
//   for await (const chunk of remoteRunnable.streamEvents({
//     input: [requestData]
//   }, { version: "v1" })) {
//     const [type] = chunk.event.split("_").slice(2);
//     if (type === "end" && chunk.metadata.langgraph_node === "invoke_model") {
//       if ("tool_calls" in chunk.data.output && chunk.data.output.tool_calls.length > 0) {
//         const toolCall = chunk.data.output.tool_calls[0];
//         selectedTool = TOOL_COMPONENT_MAP[toolCall.type] ?? null;
//         if (!selectedTool) {
//           throw new Error("Selected tool not found in tool map.")
//         }
//         ui.append(selectedTool.loading());
//       } else if ("result" in chunk.data.output && typeof chunk.data.output.result === "string") {
//         if (!callbacks[chunk.run_id]) {
//           // the createStreamableValue / useStreamableValue is preferred
//           // as the stream events are updated immediately in the UI
//           // rather than being batched by React via createStreamableUI
//           const textStream = createStreamableValue();
//           ui.append(<AIMessage value={textStream.value} />);
//           callbacks[chunk.run_id] = textStream;
//         }

//         callbacks[chunk.run_id].append(chunk.data.output.result);
//       }
//     } else if (type === "end" && chunk.metadata.langgraph_node === "invoke_tools") {
//       const toolData = chunk.data.output.tool_result;
//       ui.append(selectedTool?.final(toolData));
//     }

//     lastEventValue = chunk;
//   }
// }

export default function Chat() {
  const actions = useActions<typeof EndpointsContext>();

  const [elements, setElements] = useState<JSX.Element[]>([]);
  const [history, setHistory] = useState<[role: string, content: string][]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File>();

  async function onSubmit(input: string) {
    const newElements = [...elements];
    let base64File: string | undefined = undefined;
    let fileExtension = selectedFile?.type.split("/")[1];
    if (selectedFile) {
      base64File = await convertFileToBase64(selectedFile);
    }
    const element = await actions.agent({
      input,
      chat_history: history,
      file:
        base64File && fileExtension
          ? {
              base64: base64File,
              extension: fileExtension,
            }
          : undefined,
    });

    newElements.push(
      <div className="flex flex-col w-full gap-1 mt-auto" key={history.length}>
        {selectedFile && <FileUploadMessage file={selectedFile} />}
        <HumanMessageText content={input} />
        <div className="flex flex-col gap-1 w-full max-w-fit mr-auto">
          {element.ui}
        </div>
      </div>,
    );

    // consume the value stream to obtain the final string value
    // after which we can append to our chat history state
    (async () => {
      let lastEvent = await element.lastEvent;
      if (Array.isArray(lastEvent)) {
        if (lastEvent[0].invoke_model && lastEvent[0].invoke_model.result) {
          setHistory((prev) => [
            ...prev,
            ["human", input],
            ["ai", lastEvent[0].invoke_model.result],
          ]);
        } else if (lastEvent[1].invoke_tools) {
          setHistory((prev) => [
            ...prev,
            ["human", input],
            [
              "ai",
              `Tool result: ${JSON.stringify(lastEvent[1].invoke_tools.tool_result, null)}`,
            ],
          ]);
        } else {
          setHistory((prev) => [...prev, ["human", input]]);
        }
      } else if (lastEvent.invoke_model && lastEvent.invoke_model.result) {
        setHistory((prev) => [
          ...prev,
          ["human", input],
          ["ai", lastEvent.invoke_model.result],
        ]);
      }
    })();

    setElements(newElements);
    setInput("");
    setSelectedFile(undefined);
  }

  return (
    <div className="w-[70vw] overflow-y-scroll h-[80vh] flex flex-col gap-4 mx-auto border-[1px] border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50/25">
      <LocalContext.Provider value={onSubmit}>
        <div className="flex flex-col w-full gap-1 mt-auto">{elements}</div>
      </LocalContext.Provider>
      <form
        onSubmit={async (e) => {
          e.stopPropagation();
          e.preventDefault();
          await onSubmit(input);
        }}
        className="w-full flex flex-row gap-2"
      >
        <Input
          placeholder="What's the weather like in San Francisco?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="w-[300px]">
          <Input
            placeholder="Upload"
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
              }
            }}
          />
        </div>
        <Button type="submit">Submit</Button>
      </form>
    </div>
  );
}
