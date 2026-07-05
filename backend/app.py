"""HealthBot: AI-Powered Patient Education & Comprehension Assistant.

Main application module that builds and runs the LangGraph workflow.
Flow: Topic → Search → Summary → Quiz → Grade → Restart/Exit
"""

from langgraph.graph import StateGraph, START, END
from state import HealthBotState
from nodes import (
    get_topic,
    search_tavily,
    summarize_results,
    display_summary,
    wait_for_ready,
    generate_quiz,
    collect_answer,
    evaluate_answer,
    display_grade,
    restart_or_exit,
)


# ---------------------------------------------------------------------------
# Conditional edge functions
# ---------------------------------------------------------------------------
def should_start_quiz(state: HealthBotState) -> str:
    """Route based on whether the user is ready for the quiz.
    
    If not explicitly ready, we yield execution back by returning END.
    """
    ready = state.get("ready_for_quiz", "")
    if isinstance(ready, str) and ready.lower() == "yes":
        return "generate_quiz"
    return END


def should_evaluate(state: HealthBotState) -> str:
    """Route based on whether the user has submitted their quiz response.
    
    If no answer has been submitted, we yield execution back by returning END.
    """
    ans = state.get("user_answer", "")
    if isinstance(ans, str) and ans.strip():
        return "evaluate_answer"
    return END


def should_restart(state: HealthBotState) -> str:
    """Route based on whether the user wants to learn another topic."""
    restart = state.get("restart", "")
    if isinstance(restart, str) and restart.lower() == "yes":
        return "get_topic"
    return END


# ---------------------------------------------------------------------------
# Build the LangGraph workflow
# ---------------------------------------------------------------------------
def build_graph() -> StateGraph:
    """Construct the HealthBot state graph with all nodes and edges."""

    graph = StateGraph(HealthBotState)

    # --- Add all 10 nodes ---
    graph.add_node("get_topic", get_topic)
    graph.add_node("search_tavily", search_tavily)
    graph.add_node("summarize_results", summarize_results)
    graph.add_node("display_summary", display_summary)
    graph.add_node("wait_for_ready", wait_for_ready)
    graph.add_node("generate_quiz", generate_quiz)
    graph.add_node("collect_answer", collect_answer)
    graph.add_node("evaluate_answer", evaluate_answer)
    graph.add_node("display_grade", display_grade)
    graph.add_node("restart_or_exit", restart_or_exit)

    # --- Define edges ---
    # Linear flow: START → get_topic → search → summarize → display → wait
    graph.add_edge(START, "get_topic")
    graph.add_edge("get_topic", "search_tavily")
    graph.add_edge("search_tavily", "summarize_results")
    graph.add_edge("summarize_results", "display_summary")
    graph.add_edge("display_summary", "wait_for_ready")

    # Conditional: wait_for_ready → generate_quiz (yes) | END (no/unset)
    graph.add_conditional_edges(
        "wait_for_ready",
        should_start_quiz,
        {
            "generate_quiz": "generate_quiz",
            END: END,
        },
    )

    # Linear flow: generate_quiz → collect_answer
    graph.add_edge("generate_quiz", "collect_answer")

    # Conditional: collect_answer → evaluate_answer (if user answered) | END (if waiting for answer)
    graph.add_conditional_edges(
        "collect_answer",
        should_evaluate,
        {
            "evaluate_answer": "evaluate_answer",
            END: END,
        },
    )

    # Linear flow: evaluate_answer → display_grade → restart_or_exit
    graph.add_edge("evaluate_answer", "display_grade")
    graph.add_edge("display_grade", "restart_or_exit")

    # Conditional: restart_or_exit → get_topic (restart) | END (exit)
    graph.add_conditional_edges(
        "restart_or_exit",
        should_restart,
        {
            "get_topic": "get_topic",
            END: END,
        },
    )

    return graph
