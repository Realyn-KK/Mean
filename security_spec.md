# Security Specification: Mogu-Mogu Matsuri (Firestore Rules)

## 1. Data Invariants

1. **Code Identity & Single-Use Integrity**: A `/codes/{codeId}` document ID must strictly be 4 digits (`^[0-9]{4}$`), equal `data.code`, have `1 <= maxUses <= 99`, and `0 <= usedCount <= maxUses`. Once `redeemed == true`, a non-admin cannot reset `redeemed` to `false` or change `redeemedBy`, `maxUses`, `code`, or `createdAt`.
2. **Play Consumption Monotonicity**: A non-admin can only increment `usedCount` by exact `+1` while `redeemed == true` and `usedCount < maxUses`. Once `usedCount == maxUses`, the code is in a terminal state for non-admin writes.
3. **Atomic Winner Logging**: Every non-admin `/logs/{logId}` creation must occur in the exact same atomic transaction as incrementing `codes/{code}.usedCount` by `+1` (`getAfter`), ensuring no fabricated prize logs can be injected without consuming a valid play.
4. **Admin Isolation**: Only verified admins (`chat4kwankao@gmail.com` with `email_verified == true` or UID in `/admins/{uid}`) may list all `/codes`, create/delete `/codes`, read/list/delete `/logs`, or modify `/settings/prizeRates`.
5. **Temporal Integrity & Strict Schema**: All `createdAt`, `redeemedAt`, and `updatedAt` timestamps must equal `request.time`. All documents enforce `keys().hasAll(...) && keys().hasOnly(...)` and bounded string sizes.

## 2. Dirty Dozen Adversarial Payloads

1. **List Scraping Codes**: Unauthenticated `list` query on `/codes` -> `PERMISSION_DENIED`.
2. **Code Creation Spoofing**: Non-admin `create` on `/codes/9999` -> `PERMISSION_DENIED`.
3. **Re-Redeeming Used Code**: Non-admin `update` on `/codes/8888` changing `redeemed: true -> false` or changing `redeemedBy` -> `PERMISSION_DENIED`.
4. **Quota Escalation**: Non-admin `update` on `/codes/8888` increasing `maxUses` from `3` to `99` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: `update` on `/codes/8888` adding an unlisted field `isVip: true` -> `PERMISSION_DENIED`.
6. **Negative / Skip Play Count**: Non-admin `update` setting `usedCount` to `-1` or `usedCount + 2` -> `PERMISSION_DENIED`.
7. **Fabricated Winner Log Without Code Consumption**: Non-admin `create` on `/logs/fake1` without an atomic `+1` increment on `/codes/{code}` -> `PERMISSION_DENIED`.
8. **Winner Log Name Spoofing**: Non-admin `create` on `/logs/log1` with `playerName` different from `codes/{code}.redeemedBy` -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamp**: `create` on `/logs/log1` or `/codes/1111` passing a hardcoded client `Timestamp` instead of `request.time` -> `PERMISSION_DENIED`.
10. **PII / Log Scraping**: Non-admin `list` or `get` on `/logs` -> `PERMISSION_DENIED`.
11. **Prize Rate Manipulation**: Non-admin `update` on `/settings/prizeRates` setting `freeFoodRate: 100` -> `PERMISSION_DENIED`.
12. **Unverified Admin Email Spoof**: Signed-in user with `email == 'chat4kwankao@gmail.com'` and `email_verified == false` attempting admin write -> `PERMISSION_DENIED`.
