# 2-per-user-oac-token - per-user OAC token (per-user OAC token phase)

> **Placeholder - to be filled with the scrubbed per-user minting scripts.**

This phase builds on `../1-login/`. Once login establishes `:APP_USER`, it mints a per-user
downstream **OAC** token whose subject is that same user and caches it per user, so the target
enforces the user's own authorization. Phase 3 then injects that token into the agent call.

Expected contents (scrubbed to placeholders):

```
apex_sql/
  package-jwt_util.sql            # KMS-backed JWT signing
  package-token_store.sql         # per-user, per-domain token cache
  procedure-mint_domain2_token.sql / _oac.sql   # OBO mint (sub = end user)
  table-agent_user_tokens.sql
  table-debug_log.sql
apex_code/
  Apex-AgentCall.txt              # scrubbed: no real gateway URL / agent ID
```

Nothing is committed here until the scripts are reviewed and scrubbed.
