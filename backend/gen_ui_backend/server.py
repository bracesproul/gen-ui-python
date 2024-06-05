from gen_ui_backend.types import ChatInputType
from gen_ui_backend.chain import create_graph, GenerativeUIState
import uvicorn
from fastapi import FastAPI  # type: ignore
from langserve import add_routes
from langchain_core.runnables import Runnable, RunnableLambda
from dotenv import load_dotenv
from langchain_core.messages import AIMessage

# Load environment variables from .env file
load_dotenv()

def start_cli() -> None:
    app = FastAPI(
        title="Gen UI Backend",
        version="1.0",
        description="A simple api server using Langchain's Runnable interfaces",
    )

    graph = create_graph()

    runnable = graph.with_types(input_type=ChatInputType, output_type=dict)

    add_routes(app, runnable, path="/chat", playground_type="chat")
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
