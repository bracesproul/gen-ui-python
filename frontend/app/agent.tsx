import "server-only";

import { agentExecutor } from "../ai/graph";
import { exposeEndpoints, streamRunnableUI } from "../utils/server";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { RemoteRunnable } from "@langchain/core/runnables/remote";

const convertChatHistoryToMessages = (
  chat_history: [role: string, content: string][],
) => {
  return chat_history.map(([role, content]) => {
    switch (role) {
      case "human":
        return new HumanMessage(content);
      case "assistant":
      case "ai":
        return new AIMessage(content);
      default:
        return new HumanMessage(content);
    }
  });
};

async function processFile(input: {
  input: string;
  chat_history: [role: string, content: string][];
  file?: {
    base64: string;
    extension: string;
  };
}) {
  if (input.file) {
    const imageTemplate = new HumanMessage({
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/${input.file.extension};base64,${input.file.base64}`,
          },
        },
      ],
    });
    return {
      input: input.input,
      chat_history: [
        ...convertChatHistoryToMessages(input.chat_history),
        imageTemplate,
      ],
    };
  } else {
    return {
      input: input.input,
      chat_history: convertChatHistoryToMessages(input.chat_history),
    };
  }
}

function processInputsV2(inputs: {
  input: string;
  chat_history: [role: string, content: string][];
  file?: {
    base64: string;
    extension: string;
  };
}): Array<{ type: string; content: string }> {
  const history = inputs.chat_history.map(([role, content]) => ({
    type: role,
    content,
  }));
  const humanInput = {
    type: "human",
    content: inputs.input,
  };
  return [...history, humanInput];
}

const API_URL = "http://localhost:8000/chat";

async function agent(inputs: {
  input: string;
  chat_history: [role: string, content: string][];
  file?: {
    base64: string;
    extension: string;
  };
}) {
  "use server";
  const processedInputs = processInputsV2(inputs);
  const remoteRunnable = new RemoteRunnable({
    url: API_URL,
  });

  return streamRunnableUI(remoteRunnable, {
    input: processedInputs,
  });
}

export const EndpointsContext = exposeEndpoints({ agent });
