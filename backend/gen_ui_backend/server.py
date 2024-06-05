import uvicorn
from fastapi import FastAPI  # type: ignore
from langserve import add_routes
from langchain_core.runnables import Runnable, RunnableLambda

def create_runnable() -> Runnable[ChatInputType, str]:
    return RunnableLambda(lambda x: x)


def start_cli() -> None:
    app = FastAPI(
        title="Gen UI Backend",
        version="1.0",
        description="A simple api server using Langchain's Runnable interfaces",
    )

    add_routes(app, create_runnable(), path="/chat", playground_type="chat")
    print("Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
