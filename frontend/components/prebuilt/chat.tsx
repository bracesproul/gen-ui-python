"use client";

import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { EndpointsContext } from "@/app/agent";
import { useActions } from "@/utils/client";
import { LocalContext } from "@/app/shared";
import { AIMessageText, HumanMessageText } from "./message";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "./auth";

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

export default function Chat() {
  const actions = useActions<typeof EndpointsContext>();
  const authMessage = "You must authenticate first.";
  const authSuccessMessage = "Successfully authenticated!";
  const searchParams = useSearchParams();

  const [elements, setElements] = useState<JSX.Element[]>([]);
  const [history, setHistory] = useState<[role: string, content: string][]>([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File>();

  useEffect(() => {
    const nameParam = searchParams.get("name");
    if (!nameParam) return;
    async function postAuthRequest() {
      const customAuthSuccessMessage = `${authSuccessMessage} Welcome, ${nameParam}!`;
      const newElements = [...elements];
      const newHistory: [role: string, content: string][] = [
        ...history,
        ["assistant", customAuthSuccessMessage],
      ];
      const lastUserQuestion = history[history.length - 2]?.[1];

      let base64File: string | undefined = undefined;
      let fileExtension = selectedFile?.type.split("/")[1];
      if (selectedFile) {
        base64File = await convertFileToBase64(selectedFile);
      }
      const element = await actions.agent({
        input: lastUserQuestion,
        chat_history: newHistory,
        file:
          base64File && fileExtension
            ? {
                base64: base64File,
                extension: fileExtension,
              }
            : undefined,
      });

      newElements.push(
        <div
          className="flex flex-col w-full gap-1 mt-auto"
          key={newHistory.length}
        >
          <div className="flex flex-col gap-1 w-full max-w-fit mr-auto">
            <AIMessageText content={customAuthSuccessMessage} />
            {element.ui}
          </div>
        </div>,
      );

      // consume the value stream to obtain the final string value
      // after which we can append to our chat history state
      (async () => {
        let lastEvent = await element.lastEvent;
        if (typeof lastEvent === "string") {
          setHistory([...newHistory, ["assistant", lastEvent]]);
        }
      })();

      setElements(newElements);
      setInput("");
      setSelectedFile(undefined);
    }
    if (nameParam && history[history.length - 1]?.[1] === authMessage) {
      postAuthRequest().then(() => {
        // no-op
      });
    }
  }, [searchParams]);

  async function onSubmit(input: string) {
    const newElements = [...elements];
    const nameParam = searchParams.get("name");

    if (!nameParam) {
      newElements.push(
        <div
          className="flex flex-col w-full gap-1 mt-auto"
          key={history.length}
        >
          {selectedFile && <FileUploadMessage file={selectedFile} />}
          <HumanMessageText content={input} />
          <div className="flex flex-col gap-1 w-full max-w-fit mr-auto">
            <LoginForm />
            <AIMessageText content={authMessage} />
          </div>
        </div>,
      );

      /** @TODO file should be passed here. Maybe special "file" type? */
      setHistory((prev) => [
        ...prev,
        ["user", input],
        ["assistant", authMessage],
      ]);

      setElements(newElements);
      setInput("");
      setSelectedFile(undefined);
      return;
    }

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
      if (typeof lastEvent === "string") {
        setHistory((prev) => [
          ...prev,
          ["user", input],
          ["assistant", lastEvent],
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
