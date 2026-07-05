"""HealthBot LangGraph Node Functions.

Each function represents a node in the LangGraph workflow.
All nodes accept HealthBotState and return a partial state update dict.
Nodes are designed to be idempotent to support stateless API execution.
"""

import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.tools.tavily_search import TavilySearchResults
from state import HealthBotState


# ---------------------------------------------------------------------------
# LLM instance (lazy-initialized after dotenv loads API keys)
# ---------------------------------------------------------------------------
_llm = None


def get_llm():
    """Return a shared ChatOpenAI instance, creating it on first call."""
    global _llm
    if _llm is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and api_key.startswith("sk-or-"):
            # OpenRouter Integration
            model = os.getenv("OPENAI_MODEL", "google/gemini-2.5-flash")
            _llm = ChatOpenAI(
                model=model,
                temperature=0.3,
                max_tokens=2000,
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key
            )
        else:
            model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            _llm = ChatOpenAI(model=model, temperature=0.3)
    return _llm


# ========================== NODE 1: get_topic ==============================
def get_topic(state: HealthBotState) -> dict:
    """Read the health topic directly from the state payload."""
    topic = state.get("topic", "").strip()
    print(f"\n[INFO] Web Request Received! Topic: {topic}")
    
    # Only reset details if starting a fresh session (no summary exists yet)
    if not state.get("summary"):
        return {
            "topic": topic,
            "search_results": "",
            "summary": "",
            "quiz_question": "",
            "user_answer": "",
            "grade": "",
            "feedback": "",
            "conversation_history": [f"User selected topic: {topic}"],
            "ready_for_quiz": "",
            "restart": "",
        }
    return {}


# ========================== NODE 2: search_tavily ==========================
def search_tavily(state: HealthBotState) -> dict:
    """Search the web for health information using Tavily."""
    if state.get("search_results"):
        return {}

    topic = state.get("topic", "")
    print(f"\n[SEARCH] Searching Tavily for topic: {topic}...")

    search_tool = TavilySearchResults(max_results=5)
    query = f"{topic} health information patient education"

    try:
        results = search_tool.invoke(query)

        if isinstance(results, str):
            raise ValueError(results)

        # Combine all result content into a single string
        combined = ""
        for i, result in enumerate(results, 1):
            content = result.get("content", "")
            url = result.get("url", "")
            combined += f"\n--- Source {i} ({url}) ---\n{content}\n"

        if not combined.strip():
            combined = "No results found. Please try a different topic."

        print("[SEARCH] Search complete! Processing results...")

    except Exception as e:
        combined = f"Search encountered an error: {str(e)}. Please try again."
        print(f"[SEARCH ERROR] Search error: {e}")

    return {
        "search_results": combined,
        "conversation_history": state.get("conversation_history", [])
            + ["Tavily search completed"],
    }


# ========================== NODE 3: summarize_results ======================
def summarize_results(state: HealthBotState) -> dict:
    """Summarize search results into a patient-friendly explanation."""
    if state.get("summary"):
        return {}

    topic = state.get("topic", "")
    search_results = state.get("search_results", "")
    print(f"\n[SUMMARY] Generating summary for {topic}...")

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a healthcare education assistant. Your job is to create "
            "clear, patient-friendly summaries of medical information. "
            "Follow these rules strictly:\n"
            "1. Write exactly 3-4 paragraphs.\n"
            "2. Use simple, everyday language.\n"
            "3. If you must use a medical term, explain it in parentheses.\n"
            "4. Base your summary ONLY on the provided search results.\n"
            "5. Do NOT add information from your own knowledge.\n"
            "6. Make the summary informative and reassuring in tone.",
        ),
        (
            "human",
            "Please summarize the following search results about "
            '"{topic}" into a patient-friendly explanation:\n\n'
            "{search_results}",
        ),
    ])

    chain = prompt | get_llm()
    response = chain.invoke({
        "topic": topic,
        "search_results": search_results,
    })

    summary = response.content.strip()

    return {
        "summary": summary,
        "conversation_history": state.get("conversation_history", [])
            + ["Summary generated"],
    }


# ========================== NODE 4: display_summary ========================
def display_summary(state: HealthBotState) -> dict:
    """Log the summary display update."""
    print(f"\n[SUMMARY] Summary ready for {state.get('topic')}")
    history_entry = "Summary displayed to user"
    if history_entry not in state.get("conversation_history", []):
        return {
            "conversation_history": state.get("conversation_history", [])
                + [history_entry],
        }
    return {}


# ========================== NODE 5: wait_for_ready =========================
def wait_for_ready(state: HealthBotState) -> dict:
    """Read readiness state passed from the frontend UI."""
    ready = state.get("ready_for_quiz", "no").strip().lower()
    if ready in ("1", "yes", "y"):
        ready_val = "yes"
    else:
        ready_val = "no"

    print(f"[QUIZ] Quiz readiness status: {ready_val}")
    history_entry = f"Quiz readiness: {ready_val}"
    if history_entry not in state.get("conversation_history", []):
        return {
            "ready_for_quiz": ready_val,
            "conversation_history": state.get("conversation_history", [])
                + [history_entry],
        }
    return {"ready_for_quiz": ready_val}


# ========================== NODE 6: generate_quiz ==========================
def generate_quiz(state: HealthBotState) -> dict:
    """Generate exactly one open-ended comprehension question."""
    if state.get("quiz_question"):
        return {}

    summary = state.get("summary", "")
    print("\n[QUIZ] Generating quiz question...")

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a healthcare education quiz generator. "
            "Follow these rules strictly:\n"
            "1. Generate EXACTLY ONE open-ended question.\n"
            "2. The question MUST be based ONLY on the provided summary.\n"
            "3. Do NOT use any external knowledge.\n"
            "4. The question should test understanding, not memorization.\n"
            "5. Use clear, simple language.\n"
            "6. Output ONLY the question — no numbering, no preamble.",
        ),
        (
            "human",
            "Based ONLY on this summary, generate one open-ended "
            "comprehension question:\n\n{summary}",
        ),
    ])

    chain = prompt | get_llm()
    response = chain.invoke({"summary": summary})
    
    # Clean up the output text thoroughly
    question = response.content.strip()
    
    # Strip common prefixes if the LLM includes them
    prefixes_to_strip = ["question:", "quiz question:", "quiz question", "**question:**", "**quiz question:**"]
    for prefix in prefixes_to_strip:
        if question.lower().startswith(prefix):
            question = question[len(prefix):].strip()
            
    # Clean out any leftover markdown bold/italic asterisks or outer quotes
    question = question.replace("*", "").replace('"', '').replace("'", "").strip()

    print(f"[QUIZ] Quiz Question Generated: {question}")

    return {
        "quiz_question": question,
        "conversation_history": state.get("conversation_history", [])
            + ["Quiz question generated"],
    }


# ========================== NODE 7: collect_answer =========================
def collect_answer(state: HealthBotState) -> dict:
    """Read user answer passed from the frontend UI."""
    answer = state.get("user_answer", "").strip()
    print(f"[QUIZ] Collected user answer: {answer}")
    if answer:
        history_entry = f"User answered: {answer}"
        if history_entry not in state.get("conversation_history", []):
            return {
                "user_answer": answer,
                "conversation_history": state.get("conversation_history", [])
                    + [history_entry],
            }
    return {"user_answer": answer}


# ========================== NODE 8: evaluate_answer ========================
def evaluate_answer(state: HealthBotState) -> dict:
    """Grade the user's answer using ONLY the generated summary."""
    if state.get("feedback"):
        return {}

    summary = state.get("summary", "")
    quiz_question = state.get("quiz_question", "")
    user_answer = state.get("user_answer", "")
    
    print("\n[EVAL] Evaluating answer...")

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            "You are a healthcare education evaluator. "
            "Follow these rules strictly:\n"
            "1. Evaluate the user's answer using ONLY the provided summary.\n"
            "2. Do NOT use any external or model knowledge.\n"
            "3. Assign a letter grade: A, B, C, D, or F.\n"
            "4. Provide a clear explanation of why you assigned that grade. This explanation MUST include relevant citations/quotes from the health information summary to reinforce learning.\n"
            "5. Mention what the user got right and what they missed.\n"
            "6. Be encouraging and educational in tone.\n\n"
            "Output format:\n"
            "Grade: [letter]\n\n"
            "Feedback:\n[your explanation]",
        ),
        (
            "human",
            "Summary:\n{summary}\n\n"
            "Question:\n{quiz_question}\n\n"
            "User's Answer:\n{user_answer}\n\n"
            "Please evaluate this answer based ONLY on the summary above.",
        ),
    ])

    chain = prompt | get_llm()
    response = chain.invoke({
        "summary": summary,
        "quiz_question": quiz_question,
        "user_answer": user_answer,
    })

    result = response.content

    # Parse grade and feedback from the response robustly
    grade = ""
    feedback = result
    
    for line in result.split("\n"):
        clean_line = line.replace("*", "").replace('"', '').replace("'", "").strip().lower()
        if clean_line.startswith("grade:"):
            grade = line.replace("*", "").replace('"', '').replace("'", "").split(":", 1)[1].strip()
            break

    # Fallback: If it couldn't find "Grade:", see if the LLM outputted the letter directly in the first line
    if not grade:
        first_line = result.split("\n")[0].replace("*", "").replace('"', '').replace("'", "").strip()
        if len(first_line) == 1 and first_line.upper() in ["A", "B", "C", "D", "F"]:
            grade = first_line.upper()

    if not grade:
        grade = "Completed"

    print(f"[EVAL] Evaluation complete. Grade: {grade}")

    return {
        "grade": grade,
        "feedback": feedback,
        "conversation_history": state.get("conversation_history", [])
            + [f"Answer graded: {grade}"],
    }


# ========================== NODE 9: display_grade ==========================
def display_grade(state: HealthBotState) -> dict:
    """Log the grade display update."""
    print("[EVAL] Grade evaluated and recorded in state.")
    history_entry = "Grade displayed to user"
    if history_entry not in state.get("conversation_history", []):
        return {
            "conversation_history": state.get("conversation_history", [])
                + [history_entry],
        }
    return {}


# ========================== NODE 10: restart_or_exit =======================
def restart_or_exit(state: HealthBotState) -> dict:
    """Read restart state passed from the frontend UI."""
    restart = state.get("restart", "no").strip().lower()
    if restart in ("1", "yes", "y", "restart"):
        restart_val = "yes"
    else:
        restart_val = "no"

    print(f"[RESTART] Restart status: {restart_val}")
    history_entry = f"User restart option: {restart_val}"
    if history_entry not in state.get("conversation_history", []):
        return {
            "restart": restart_val,
            "conversation_history": state.get("conversation_history", [])
                + [history_entry],
        }
    return {"restart": restart_val}
