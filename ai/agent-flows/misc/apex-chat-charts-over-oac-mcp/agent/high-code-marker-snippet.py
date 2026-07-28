"""
High-code agent: emit the chart marker.

This snippet is intentionally NARROW. It shows only the reusable piece: the
rule that makes a high-code agent append the chart marker, so its answers get
inline charts in the APEX chat region (see the marker spec in ../README.md).

It is deliberately NOT a full agent. Your agent's setup - the LLM, the MCP
connection to your data source, and authentication - is your own. If you are
connecting to Oracle Analytics Cloud (OAC) over MCP with per-user auth, the
repo already has a complete working example; reference it rather than copying
auth code around:

    ../../../code-first/mcp-examples/single-agent-mcp-session-variables.py

The only thing this file adds on top of that: the CHART_BLOCK_RULE below, added
to your agent's prompt rules. The marker it produces is IDENTICAL to the one a
low-code agent emits (low-code-instructions.md), so the same APEX front-end
renders both.
"""

# ---------------------------------------------------------------------------
# 1) YOUR AGENT + AUTH SETUP GOES HERE.
#    Build your agent, connect to your data source (e.g. OAC over MCP), and
#    wire up auth. For an OAC-MCP + per-user-auth starting point, see:
#    ../../../code-first/mcp-examples/single-agent-mcp-session-variables.py
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# 2) THE CHART RULE. Add this to your agent's prompt rules (for the AIDP
#    Python SDK this is prompt.extra_rules; for a raw system prompt, append it
#    to the system prompt text). It is the same rule a low-code agent uses.
# ---------------------------------------------------------------------------
CHART_BLOCK_RULE = """
CHART BLOCK - MANDATORY FORMATTING RULE.
If your answer contains ANY breakdown of a category by a number (a per-category
list, a table with a category column and a number column, "X by Y", counts or
totals per group, or a ranking), you MUST append the chart block. It is not
optional: an answer that shows a breakdown but omits the block is incomplete.
Append the block for the exact rows you listed; the table AND the chart block
are both required.

FORMAT: on its own final line, AFTER the prose, put the chart JSON inside a
single HTML comment so it never shows in the chat bubble:
<!--CHART:{"type":"<type>","title":"<short title>","data":[{"label":"<category>","value":<number>}]}-->

CHOOSING "type" - apply IN ORDER, stop at the first match:
  1. IF the user names a chart type ("as a bar", "as a donut", "as a
     pyramid / funnel", or any explicit type) use EXACTLY that type. The
     user's choice wins.
  2. ELSE if the question is about composition / share / proportion / mix /
     percentage / split, use "pie".
  3. ELSE if the answer is a trend over an ordered sequence (over time,
     "by month / quarter / year", "trend"), use "line".
  4. ELSE (counts, totals, rankings, comparisons) use "hbar". Default.

"type" is EXACTLY one of: hbar, pie, bar, line, donut, pyramid, funnel (lowercase).
The data shape is identical for every type ({label,value}); only "type" changes.
Auto-selection is only ever hbar, pie, or line. NEVER auto-pick bar / donut /
pyramid / funnel; use those ONLY when the user names them.

Rules: one object per category in "data" (include EVERY row you listed);
"value" is a plain number (no quotes, no thousands separators). No code fences,
no second comment, nothing after the closing -->. NEVER emit a chart of
made-up values. Only omit the block for a single value, a metadata answer, or
plain prose with no category-to-number breakdown.
"""


# ---------------------------------------------------------------------------
# 3) EXAMPLE of attaching the rule.
#    Below is illustrative only - adapt it to however your agent is defined.
# ---------------------------------------------------------------------------
def build_prompt_rules(existing_rules=None):
    """Return the agent's prompt rules with the chart rule appended.

    existing_rules: your agent's current list of prompt rules (e.g. the AIDP
    SDK's prompt.extra_rules). The chart rule is added last so it layers on top
    of your data/query instructions.
    """
    rules = list(existing_rules or [])
    rules.append(CHART_BLOCK_RULE.strip())
    return rules


# For a plain system-prompt agent, you would instead do:
#     system_prompt = your_system_prompt + "\n\n" + CHART_BLOCK_RULE
