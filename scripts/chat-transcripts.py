#!/usr/bin/env python3
"""Generate transcripts from AGC chat log CSV exports.

Usage:
    python scripts/chat-transcripts.py <csv_file>                    # full transcripts
    python scripts/chat-transcripts.py <csv_file> --summary          # summary only
    python scripts/chat-transcripts.py <csv_file> --output out.txt   # write to file
    python scripts/chat-transcripts.py <csv_file> --include-test     # include test sessions

Export chat logs from Supabase first:
    1. Go to the SQL Editor: https://supabase.com/dashboard/project/rukppthsduuvsfjynfmw/sql
    2. Run:  SELECT * FROM chat_logs WHERE client_id = 'CLIENT_ID' ORDER BY created_at DESC;
    3. Click "Export to CSV" and save the file.
"""

import argparse
import re
import sys

import pandas as pd


TEST_PATTERNS = re.compile(
    r"\bben\b|\btesting\b|\btest\b|\bhugh\b", re.IGNORECASE
)


def identify_test_sessions(df):
    """Return set of session_ids that are developer testing sessions."""
    user_msgs = df[df["role"] == "user"]
    test_sessions = set()

    # Flag sessions where any user message matches test patterns
    for _, row in user_msgs.iterrows():
        if TEST_PATTERNS.search(row["message"]):
            test_sessions.add(row["session_id"])

    # Flag sessions whose messages duplicate content from known test sessions
    # Use substring matching: if a non-test message appears verbatim inside a test message
    # (or vice versa), it's likely the same person testing without identifying themselves
    test_user_messages = set()
    for sid in test_sessions:
        sess = df[(df["session_id"] == sid) & (df["role"] == "user")]
        for _, row in sess.iterrows():
            test_user_messages.add(row["message"].strip())

    for _, row in user_msgs.iterrows():
        if row["session_id"] in test_sessions:
            continue
        msg = row["message"].strip()
        if len(msg) < 20:
            continue
        for tmsg in test_user_messages:
            if msg in tmsg or tmsg in msg:
                test_sessions.add(row["session_id"])
                break

    # Flag sessions that share unique nouns (e.g. pet names) with test sessions
    test_user_text = {}
    for sid in test_sessions:
        msgs = df[(df["session_id"] == sid) & (df["role"] == "user")]
        test_user_text[sid] = " ".join(msgs["message"].values)

    for sid in df["session_id"].unique():
        if sid in test_sessions:
            continue
        sess_msgs = df[(df["session_id"] == sid) & (df["role"] == "user")]
        user_text = " ".join(sess_msgs["message"].values)
        # Find proper-noun-like capitalized words shared with test sessions
        words = set(re.findall(r"\b[A-Z][a-z]{3,}\b", user_text))
        for ttext in test_user_text.values():
            twords = set(re.findall(r"\b[A-Z][a-z]{3,}\b", ttext))
            # Shared uncommon words (exclude common words)
            common = {"What", "This", "That", "Yeah", "Does", "Have", "Here",
                       "Tell", "Show", "Think", "Just", "About"}
            shared = (words & twords) - common
            if shared:
                test_sessions.add(sid)
                break

    return test_sessions


def filter_minimal_sessions(df):
    """Return set of session_ids with only a single trivial user message."""
    minimal = set()
    for sid in df["session_id"].unique():
        sess = df[df["session_id"] == sid]
        user_messages = sess[sess["role"] == "user"]
        if len(user_messages) == 1 and len(user_messages.iloc[0]["message"].strip()) <= 5:
            minimal.add(sid)
    return minimal


def print_transcript(df, out):
    """Print full transcripts for each session."""
    for sid in df.sort_values("created_at")["session_id"].unique():
        sess = df[df["session_id"] == sid].sort_values("created_at")
        widget = sess["widget_id"].iloc[0]
        date = sess["created_at"].iloc[0].strftime("%B %d, %Y")
        origin = sess["origin"].iloc[0]

        out.write("=" * 70 + "\n")
        out.write(f"Session: {sid[:8]}...\n")
        out.write(f"Date: {date} | Widget: {widget} | Origin: {origin}\n")
        out.write("=" * 70 + "\n")

        for _, row in sess.iterrows():
            ts = row["created_at"].strftime("%I:%M %p")
            role = "Customer" if row["role"] == "user" else f"Bot ({widget})"
            out.write(f"\n[{ts}] {role}:\n")
            out.write(row["message"].strip() + "\n")
        out.write("\n\n")


def print_summary(df, out):
    """Print a summary table of each session."""
    out.write(f"{'Date':<14} {'Customer':<16} {'Widget':<10} {'Msgs':>4}  Topic\n")
    out.write("-" * 70 + "\n")

    for sid in df.sort_values("created_at")["session_id"].unique():
        sess = df[df["session_id"] == sid].sort_values("created_at")
        user_msgs = sess[sess["role"] == "user"]
        date = sess["created_at"].iloc[0].strftime("%b %d, %Y")
        widget = sess["widget_id"].iloc[0]
        n_msgs = len(sess)

        # Try to extract a customer name from user messages
        name = "Unknown"
        for _, row in user_msgs.iterrows():
            m = re.search(
                r"(?:my name(?:'?s| is)|this is|i'm|i am|hey,?\s*this is)\s+([A-Z]\w+)",
                row["message"], re.IGNORECASE,
            )
            if m and m.group(1).lower() not in ("ben", "hugh", "just", "not"):
                name = m.group(1).title()
                break
        if name == "Unknown":
            # Check if the message is signed with a name at the end
            for _, row in user_msgs.iterrows():
                m = re.search(r"\.\s+([A-Z][a-z]+)\s*$", row["message"].strip())
                if m and m.group(1).lower() not in ("ben", "hugh"):
                    name = m.group(1)
                    break
        if name == "Unknown":
            asst = sess[sess["role"] == "assistant"]
            for _, row in asst.iterrows():
                m = re.search(r"(?:Hi|Hello|Hey|sorry)\s+(\b[A-Z][a-z]+\b)[,!]", row["message"])
                if m and m.group(1).lower() not in ("ben", "hugh", "there"):
                    name = m.group(1)
                    break

        opener = user_msgs.iloc[0]["message"].strip()[:50]
        if len(user_msgs.iloc[0]["message"].strip()) > 50:
            opener += "..."

        out.write(f"{date:<14} {name:<16} {widget:<10} {n_msgs:>4}  {opener}\n")

    out.write(f"\nTotal sessions: {df['session_id'].nunique()}\n")


def main():
    parser = argparse.ArgumentParser(description="Generate transcripts from AGC chat log exports")
    parser.add_argument("csv_file", help="Path to chat_logs CSV export")
    parser.add_argument("--summary", action="store_true", help="Show summary table instead of full transcripts")
    parser.add_argument("--output", "-o", help="Write output to file instead of stdout")
    parser.add_argument("--include-test", action="store_true", help="Include developer test sessions")
    parser.add_argument("--client-id", help="Filter to a specific client_id")
    parser.add_argument("--month", help="Filter to month (e.g. 2026-02)")
    args = parser.parse_args()

    df = pd.read_csv(args.csv_file)
    df["created_at"] = pd.to_datetime(df["created_at"])

    if args.client_id:
        df = df[df["client_id"] == args.client_id]

    if args.month:
        year, month = map(int, args.month.split("-"))
        df = df[(df["created_at"].dt.year == year) & (df["created_at"].dt.month == month)]

    if not args.include_test:
        test_sessions = identify_test_sessions(df)
        minimal_sessions = filter_minimal_sessions(df)
        excluded = test_sessions | minimal_sessions
        df = df[~df["session_id"].isin(excluded)]

    if df.empty:
        print("No matching sessions found.", file=sys.stderr)
        sys.exit(0)

    out = open(args.output, "w") if args.output else sys.stdout

    if args.summary:
        print_summary(df, out)
    else:
        print_transcript(df, out)

    if args.output:
        out.close()
        print(f"Written to {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
