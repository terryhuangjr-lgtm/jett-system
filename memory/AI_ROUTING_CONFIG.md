# AI Routing Configuration
# Route tasks to the right model for cost/efficiency

PROVIDERS: {
  "ollama": {
    "endpoint": "http://localhost:11434",
    "model": "llama3.1:8b",
    "cost": "$0.00/minute",
    "latency": "~100ms",
    "strengths": ["simple_qa", "formatting", "summarization", "extraction"],
    "weaknesses": ["complex_reasoning", "creative", "nuance"]
  },
  "claude": {
    "endpoint": "api.anthropic.com",
    "model": "claude-sonnet-4-5",
    "cost": "$0.03/1K tokens",
    "latency": "~2s",
    "strengths": ["complex_reasoning", "creative", "verification", "strategy"],
    "weaknesses": ["cost", "speed"]
  }
}

ROUTING_RULES: [
  # OLLAMA TASKS (local, free, fast)
  {
    "task_type": "simple_fact_extraction",
    "description": "Extract facts from text",
    "provider": "ollama",
    "examples": ["extract contract values", "pull numbers from article"]
  },
  {
    "task_type": "formatting",
    "description": "Format text into structures",
    "provider": "ollama",
    "examples": ["format as JSON", "create table", "format tweet"]
  },
  {
    "task_type": "summarization",
    "description": "Short summaries",
    "provider": "ollama",
    "examples": ["summarize in 2 sentences", "key points only"]
  },
  {
    "task_type": "basic_qa",
    "description": "Simple Q&A",
    "provider": "ollama",
    "examples": ["what year?", "how much?", "who is?"]
  },

  # CLAUDE TASKS (complex, paid, slow)
  {
    "task_type": "creative_writing",
    "description": "Tweets, stories, angles",
    "provider": "claude",
    "examples": ["write engaging tweet", "find angle", "creative hook"]
  },
  {
    "task_type": "verification",
    "description": "Verify facts across sources",
    "provider": "claude",
    "examples": ["confirm this is true", "cross-reference"]
  },
  {
    "task_type": "complex_reasoning",
    "description": "Multi-step analysis",
    "provider": "claude",
    "examples": ["compare options", "strategic advice"]
  },
  {
    "task_type": "quality_content",
    "description": "High-quality final output",
    "provider": "claude",
    "examples": ["final tweet draft", " polished content"]
  }
]

ROUTING_FUNCTION: {
  "name": "routeTask",
  "input": {"task_type": "string", "complexity": "low|medium|high"},
  "output": {"provider": "string", "model": "string"},
  "logic": """
    IF task_type IN [formatting, simple_faq, summarization, extraction]:
      RETURN ollama
    ELSE IF complexity = high:
      RETURN claude
    ELSE:
      DEFAULT claude  # err on side of quality
  """
}

# CURRENT SYSTEM STATUS
STATUS: {
  "ollama_running": true,
  "models": ["llama3.1:8b"],
  "claude_configured": true,
  "routing_automated": false
}

# RECOMMENDATIONS
NEXT_STEPS: [
  "1. Route deploy-21m-tweet.js to Ollama (just formatting)",
  "2. Route deploy-ebay-scans.js to Ollama (just formatting)",
  "3. Add more Ollama models for specialized tasks",
  "4. Create wrapper function routeTask() for all scripts"
]
