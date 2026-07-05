import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables first
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

# Validate credentials
assert os.getenv('OPENAI_API_KEY') is not None, "OPENAI_API_KEY must be set in .env"
assert os.getenv('TAVILY_API_KEY') is not None, "TAVILY_API_KEY must be set in .env"

from app import build_graph
from state import HealthBotState

app = FastAPI(
    title="HealthBot API",
    description="Backend web service for the AI-Powered Patient Education System",
    version="1.0.0"
)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows communication from local development tools (e.g. http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile graph workflow
bot_graph = build_graph().compile()


# --- Pydantic API Models ---
class SessionStartRequest(BaseModel):
    topic: str


class QuizReadinessRequest(BaseModel):
    state: dict
    ready: str  # "yes" or "no"


class QuizAnswerRequest(BaseModel):
    state: dict
    user_answer: str


# --- FastAPI Endpoints ---
@app.get("/api/health")
async def health_check():
    """Health probe endpoint."""
    return {"status": "ok", "app": "HealthBot API"}


@app.post("/api/start")
async def start_session(request: SessionStartRequest):
    """Initialize session state with a new topic and run search & summary nodes."""
    initial_state = {
        "topic": request.topic,
        "search_results": "",
        "summary": "",
        "quiz_question": "",
        "user_answer": "",
        "grade": "",
        "feedback": "",
        "conversation_history": [f"User selected topic: {request.topic}"],
        "ready_for_quiz": "",
        "restart": "",
    }
    try:
        final_state = bot_graph.invoke(initial_state)
        return {"success": True, "state": final_state}
    except Exception as e:
        print(f"Error in /api/start: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz/submit-readiness")
async def submit_readiness(request: QuizReadinessRequest):
    """Receive readiness update from frontend and invoke LangGraph execution."""
    current_state = request.state
    current_state["ready_for_quiz"] = request.ready
    try:
        updated_state = bot_graph.invoke(current_state)
        return {"success": True, "state": updated_state}
    except Exception as e:
        print(f"Error in /api/quiz/submit-readiness: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz/submit-answer")
async def submit_answer(request: QuizAnswerRequest):
    """Receive user quiz answer from frontend, evaluate, and return evaluation results."""
    current_state = request.state
    current_state["user_answer"] = request.user_answer
    try:
        updated_state = bot_graph.invoke(current_state)
        return {"success": True, "state": updated_state}
    except Exception as e:
        print(f"Error in /api/quiz/submit-answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
