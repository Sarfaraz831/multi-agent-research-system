"""
api_server.py

A thin HTTP layer around your existing multi-agent pipeline (agents.py /
pipeline.py) so the React UI (ResearchUI.jsx) can drive it from a browser.

It mirrors the exact steps in `run_research_pipeline` from pipeline.py,
but instead of printing each stage to the terminal, it streams them to
the client over Server-Sent Events (SSE) as each agent finishes.

Run it with:
    pip install fastapi "uvicorn[standard]"
    uvicorn api_server:app --reload --port 8000

Keep this in the same folder as agents.py / tools.py / .env.
"""

import json
import traceback

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents import build_reader_agent, build_search_agent, writer_chain, critic_chain

app = FastAPI(title="Research Pipeline API")

# Allow the React dev server (and the Claude artifact preview) to call this API.
# Tighten allow_origins to your actual frontend URL before deploying anywhere public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _text(value) -> str:
    """Normalize chain/agent outputs (str, AIMessage, etc.) into plain text."""
    if hasattr(value, "content"):
        return value.content
    return str(value)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def run_pipeline_stream(topic: str):
    state = {}
    try:
        # --- Search agent -------------------------------------------------
        yield _sse("stage", {"stage": "search", "status": "active"})
        search_agent = build_search_agent()
        search_result = search_agent.invoke(
            {"messages": [("user", f"Find recent, reliable and detailed information about: {topic}")]}
        )
        state["search_results"] = _text(search_result["messages"][-1].content)
        yield _sse("stage", {"stage": "search", "status": "done", "output": state["search_results"]})

        # --- Reader agent ---------------------------------------------------
        yield _sse("stage", {"stage": "reader", "status": "active"})
        reader_agent = build_reader_agent()
        reader_result = reader_agent.invoke(
            {
                "messages": [
                    (
                        "user",
                        f"Based on the following search results about '{topic}', "
                        f"pick the most relevant URL and scrape it for deeper content.\n\n"
                        f"Search Results:\n{state['search_results'][:800]}",
                    )
                ]
            }
        )
        state["scraped_content"] = _text(reader_result["messages"][-1].content)
        yield _sse("stage", {"stage": "reader", "status": "done", "output": state["scraped_content"]})

        # --- Writer -----------------------------------------------------
        yield _sse("stage", {"stage": "writer", "status": "active"})
        research_combined = (
            f"SEARCH RESULTS : \n {state['search_results']}\n\n"
            f"DETAILED CONTENT : \n{state['scraped_content']}"
        )
        state["report"] = _text(writer_chain.invoke({"topic": topic, "research": research_combined}))
        yield _sse("stage", {"stage": "writer", "status": "done", "output": state["report"]})

        # --- Critic -----------------------------------------------------
        yield _sse("stage", {"stage": "critic", "status": "active"})
        state["feedback"] = _text(critic_chain.invoke({"report": state["report"]}))
        yield _sse("stage", {"stage": "critic", "status": "done", "output": state["feedback"]})

        yield _sse("complete", {"state": state})

    except Exception as exc:  # surface the real error to the UI instead of hanging
        traceback.print_exc()
        yield _sse("pipeline_error", {"message": str(exc)})


@app.get("/api/research/stream")
def research_stream(topic: str = Query(..., min_length=1)):
    return StreamingResponse(run_pipeline_stream(topic), media_type="text/event-stream")


@app.get("/api/health")
def health():
    return {"status": "ok"}