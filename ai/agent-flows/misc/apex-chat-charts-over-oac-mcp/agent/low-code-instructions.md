# Low-code agent: chart instructions

Paste the block below into a **low-code AIDP agent's Instructions** field. It
teaches the agent to append the chart marker whenever its answer contains a
category-to-number breakdown. That marker is what the APEX chat region renders
inline (see the marker spec in [`../README.md`](../README.md)).

> This file is **only** the chart rule. Your agent still needs its own data
> instructions - how to find and query your data source (for example, an OAC
> dataset over MCP). Keep those as-is and add this rule on top. Where this text
> says "the data you just listed", it means the rows your agent already
> retrieved and showed; this rule never invents numbers.

---

```
CHART BLOCK - MANDATORY FORMATTING RULE.
If your answer contains ANY breakdown of a category by a number (a per-category
list, a table with a category column and a number column, "X by Y", counts or
totals per group, or a ranking), you MUST append the chart block. It is not
optional: an answer that shows a breakdown but omits the block is incomplete.
Append the block for the exact rows you listed - never skip it because you
"already showed a table"; the table AND the chart block are both required.

FORMAT: on its own final line, AFTER the prose, put the chart JSON inside a
single HTML comment so it never shows in the chat bubble:
<!--CHART:{"type":"<type>","title":"<short title>","data":[{"label":"<category>","value":<number>}]}-->

CHOOSING "type" - apply IN ORDER, stop at the first match:
  1. IF the user names a chart type ("as a bar", "as a donut", "as a
     pyramid / funnel", or any explicit type) use EXACTLY that type. The
     user's choice always wins.
  2. ELSE if the question is about composition / share / proportion / mix /
     percentage / split, use "pie".
  3. ELSE if the answer is a trend over an ordered sequence (over time,
     "by month / quarter / year", "trend", "over the last N ..."), use "line".
  4. ELSE (counts, totals, rankings, comparisons: "break down", "by", "per",
     "each", "how many", "top", "most") use "hbar". Default; when in doubt, "hbar".

"type" is EXACTLY one of: hbar, pie, bar, line, donut, pyramid, funnel (lowercase).
The data shape is identical for every type ({label,value}); only "type" changes.
Auto-selection is only ever hbar, pie, or line. NEVER auto-pick bar / donut /
pyramid / funnel; use those ONLY when the user explicitly names them (rule 1).

Rules: one object per category in "data" (include EVERY row you listed);
"value" is a plain number (no quotes, no thousands separators). Do NOT wrap the
block in code fences, do NOT emit a second comment, put NOTHING after the
closing -->. NEVER emit a chart of made-up values - if you could not retrieve
the data, say so plainly and omit the block. Only omit the block when the
answer is a single value, a metadata answer, or plain prose with no
category-to-number breakdown.
```

---

## Quick check

Ask the agent something like *"break down sales by region"*. The reply should
end with a line such as:

```
<!--CHART:{"type":"hbar","title":"Sales by region","data":[{"label":"North","value":120},{"label":"South","value":90},{"label":"East","value":140},{"label":"West","value":75}]}-->
```

If you see that line in the raw reply, the APEX region will turn it into an
inline chart.
