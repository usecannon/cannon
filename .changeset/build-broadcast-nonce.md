---
"@usecannon/cli": patch
"@usecannon/builder": patch
---

fix: prevent "nonce too low" during `cannon build -- broadcast` on strict-ordering RPCs

Live private-key signers now use a viem `nonceManager`, so nonces are assigned from a
serialized local counter that never regresses below an already-used nonce instead of a fresh
`eth_getTransactionCount('pending')` read on every transaction. Every broadcast is also wrapped
in a nonce-aware retry that re-reads the nonce and resubmits on a transient nonce error. Fixes
repeated build aborts on eventually-consistent / load-balanced RPCs (e.g. MegaETH testnet).
