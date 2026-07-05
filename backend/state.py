from typing import TypedDict, List


class HealthBotState(TypedDict):
    """Shared state for the HealthBot LangGraph workflow.

    Each field is populated by a specific node in the graph:
    - topic: User's chosen health topic (set by get_topic)
    - search_results: Raw Tavily search output (set by search_tavily)
    - summary: Patient-friendly summary (set by summarize_results)
    - quiz_question: Open-ended comprehension question (set by generate_quiz)
    - user_answer: User's response to the quiz (set by collect_answer)
    - grade: Letter grade A-F (set by evaluate_answer)
    - feedback: Explanation of the grade (set by evaluate_answer)
    - conversation_history: Log of interactions in the session
    - ready_for_quiz: Whether user is ready for the quiz (set by wait_for_ready)
    - restart: Whether user wants to learn another topic (set by restart_or_exit)
    """

    topic: str
    search_results: str
    summary: str
    quiz_question: str
    user_answer: str
    grade: str
    feedback: str
    conversation_history: List[str]
    ready_for_quiz: str
    restart: str
