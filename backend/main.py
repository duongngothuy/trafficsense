from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import sqlite3
import pandas as pd
import plotly.express as px
import json
import os
from typing import Optional

app = FastAPI(title="TrafficSense API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
DB_PATH = "../data/traffic.db"

def query_data(sql: str) -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        return {"success": True, "rows": len(df), "columns": list(df.columns), "data": df.head(100).to_dict(orient="records")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def generate_chart(chart_type: str, sql: str, x_col: str, y_col: str, title: str, color_col: Optional[str] = None) -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        df = pd.read_sql_query(sql, conn)
        conn.close()
        if df.empty:
            return {"success": False, "error": "No data"}
        colors = ["#FF4444", "#FF8800", "#FFD700", "#FF6B6B", "#FFA500"]
        if chart_type == "pie":
            fig = px.pie(df, names=x_col, values=y_col, title=title, color_discrete_sequence=colors)
        elif chart_type == "bar":
            fig = px.bar(df, x=x_col, y=y_col, title=title, color_discrete_sequence=colors)
        elif chart_type == "line":
            fig = px.line(df, x=x_col, y=y_col, title=title, color_discrete_sequence=colors)
        elif chart_type == "scatter":
            fig = px.scatter(df, x=x_col, y=y_col, title=title, color_discrete_sequence=colors)
        elif chart_type == "histogram":
            fig = px.histogram(df, x=x_col, title=title, color_discrete_sequence=colors)
        else:
            return {"success": False, "error": f"Unknown chart type: {chart_type}"}
        fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#e2e8f0"))
        return {"success": True, "chart": fig.to_json(), "rows": len(df)}
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_schema() -> dict:
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        schema = {}
        for table in tables:
            cursor.execute(f"PRAGMA table_info({table})")
            cols = [{"name": r[1], "type": r[2]} for r in cursor.fetchall()]
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            schema[table] = {"columns": cols, "row_count": count}
        conn.close()
        return {"success": True, "schema": schema}
    except Exception as e:
        return {"success": False, "error": str(e)}

TOOLS = [
    {"name": "get_schema", "description": "Get database schema. Always call this first before writing SQL.", "input_schema": {"type": "object", "properties": {}, "required": []}},
    {"name": "query_data", "description": "Execute a SQL query against the accidents table.", "input_schema": {"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]}},
    {"name": "generate_chart", "description": "Generate a Plotly chart from a SQL query.", "input_schema": {"type": "object", "properties": {"chart_type": {"type": "string", "enum": ["bar", "line", "scatter", "pie", "histogram"]}, "sql": {"type": "string"}, "x_col": {"type": "string"}, "y_col": {"type": "string"}, "title": {"type": "string"}, "color_col": {"type": "string"}}, "required": ["chart_type", "sql", "x_col", "y_col", "title"]}}
]

SYSTEM_PROMPT = """You are TrafficSense, an expert agentic data analyst for NYC traffic accident data.
Always call get_schema first, then query_data to analyze, then generate_chart to visualize.
Be autonomous — dig deep, surface interesting insights with specific numbers."""

def run_agent(user_message: str, conversation_history: list) -> dict:
    messages = conversation_history + [{"role": "user", "content": user_message}]
    charts = []

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages
        )

        assistant_content = []
        for block in response.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_content.append({"type": "tool_use", "id": block.id, "name": block.name, "input": block.input})

        messages.append({"role": "assistant", "content": assistant_content})

        if response.stop_reason == "end_turn":
            text = next((b["text"] for b in assistant_content if b["type"] == "text"), "")
            return {"text": text, "charts": charts, "messages": messages}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in assistant_content:
                if block["type"] != "tool_use":
                    continue
                name, inp = block["name"], block["input"]
                if name == "get_schema":
                    result = get_schema()
                elif name == "query_data":
                    result = query_data(inp["sql"])
                elif name == "generate_chart":
                    result = generate_chart(**inp)
                    if result.get("success") and result.get("chart"):
                        charts.append(result["chart"])
                        result = {k: v for k, v in result.items() if k != "chart"}
                else:
                    result = {"error": f"Unknown tool: {name}"}
                tool_results.append({"type": "tool_result", "tool_use_id": block["id"], "content": json.dumps(result)})
            messages.append({"role": "user", "content": tool_results})

class ChatRequest(BaseModel):
    message: str
    history: list = []

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        result = run_agent(req.message, req.history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "db_exists": os.path.exists(DB_PATH)}
