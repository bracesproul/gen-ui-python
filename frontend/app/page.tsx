import Chat from "@/components/prebuilt/chat";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex h-screen flex-col items-center justify-between px-24">
      <div className="w-full min-w-[600px] flex flex-col gap-4">
        <p className="text-[28px] text-center font-medium">
          Generative UI with{" "}
          <a
            href="https://github.com/langchain-ai/langchainjs"
            target="_blank"
            className="text-blue-600 hover:underline hover:underline-offset-2"
          >
            LangChain.js 🦜🔗
          </a>
        </p>
        <Suspense>
          <Chat />
        </Suspense>
      </div>
    </main>
  );
}
