import { RemoteRunnable } from "@langchain/core/runnables/remote";
import { exposeEndpoints, streamRunnableUI } from "@/utils/server";
import "server-only";

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
  const remoteRunnable = new RemoteRunnable({
    url: API_URL,
  })

  return streamRunnableUI(remoteRunnable, {
    input: [
      ...inputs.chat_history.map(([role, content]) => ({
        type: role,
        content,
      })),
      {
        type: "human",
        content: inputs.input,
      },
    ],
  });
}

export const EndpointsContext = exposeEndpoints({ agent });