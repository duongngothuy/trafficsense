# TrafficSense — Agentic NYC Traffic Analyst

An OpenClaw-inspired AI agent that autonomously analyzes 238,421 NYC traffic accident records using the Claude API. Ask questions in plain English — the agent decides what to query, generates visualizations, and surfaces insights without you writing a single line of SQL.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Agent | Claude claude-sonnet-4-20250514 via Anthropic API (tool use) |
| Database | SQLite (loaded from CSV) |
| Charts | Plotly |

## Project Structure

```
trafficsense/
├── backend/
│   ├── main.py          # FastAPI server + Claude agent loop + tools
│   ├── load_data.py     # One-time CSV → SQLite ingestion script
│   └── requirements.txt
├── frontend/
│   └── src/
│       └── App.jsx      # React chat UI
└── data/
    └── traffic.db       # Generated after running load_data.py
```

## Setup

### 1. Clone & install backend

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set your Anthropic API key

```bash
export ANTHROPIC_API_KEY=your_key_here
```

### 3. Download the dataset

Download the **NYC Traffic Accidents** CSV from [Mave Analytics](https://maveanalytics.com) and save it somewhere accessible.

### 4. Load the data

```bash
cd backend
python load_data.py --csv /path/to/nyc_traffic_accidents.csv
```

This creates `data/traffic.db` with a normalized `accidents` table.

### 5. Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## How the Agent Works

The agent uses Claude's **tool use** feature with 3 tools:

1. **`get_schema`** — inspects the database structure before writing SQL
2. **`query_data`** — runs SQL queries and returns results + summary stats
3. **`generate_chart`** — creates Plotly visualizations from query results

The agent runs in an **agentic loop**: it calls tools, reads the results, decides whether to dig deeper, and only stops when it has a complete answer. This means it can autonomously:
- Detect interesting patterns and investigate them further
- Chain multiple queries to build a complete picture
- Choose the right chart type for the data

## Example Questions

- "Which borough has the most pedestrian injuries?"
- "What time of day are accidents most deadly?"
- "Has the accident rate improved over 2021–2023?"
- "What are the top 5 most dangerous intersections?"
- "Compare weekday vs weekend accident patterns"

