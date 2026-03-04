"""
load_data.py — Run this once to load your NYC Traffic Accidents CSV into SQLite.

Usage:
    python load_data.py --csv path/to/your/file.csv

The script will:
  1. Read the CSV with pandas
  2. Normalize column names (lowercase, underscores)
  3. Parse date/time columns
  4. Save to ../data/traffic.db as table 'accidents'
"""

import pandas as pd
import sqlite3
import argparse
import os

def load(csv_path: str, db_path: str = "../data/traffic.db"):
    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"  {len(df):,} rows, {len(df.columns)} columns")

    # Normalize column names
    df.columns = (
        df.columns
        .str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace("/", "_")
        .str.replace("(", "")
        .str.replace(")", "")
    )
    print(f"  Columns: {list(df.columns)}")

    # Try to parse crash_date and crash_time if present
    for col in ["crash_date", "crash_time"]:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce").astype(str)

    # Add derived columns if crash_date exists
    if "crash_date" in df.columns:
        dt = pd.to_datetime(df["crash_date"], errors="coerce")
        df["year"] = dt.dt.year
        df["month"] = dt.dt.month
        df["month_name"] = dt.dt.strftime("%B")
        df["day_of_week"] = dt.dt.day_name()
        df["hour"] = pd.to_datetime(df.get("crash_time", pd.Series()), errors="coerce").dt.hour

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    df.to_sql("accidents", conn, if_exists="replace", index=False)
    conn.close()
    print(f"\n✅ Loaded into {db_path} as table 'accidents'")
    print(f"   Run the FastAPI server and start asking questions!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to the NYC traffic accidents CSV")
    args = parser.parse_args()
    load(args.csv)
