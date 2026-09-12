# market-economy

## REMOVED Requirements

### Requirement: NPC Market Liquidity and Reference Pricing

**Reason**: Coins, seeds and produce trading are removed; the game no longer has a commodity economy.

**Migration**: No replacement. The trade board, seed vendor and instant-sell/buy paths are deleted; `market_buy` and `market_sell` are retired wire types.

### Requirement: Dynamic Bounded Supply and Demand

**Reason**: Dynamic multipliers existed only to price crops and flour, all removed.

**Migration**: No replacement. Stored multipliers remain untouched in the frozen snapshots and are no longer read or written.

### Requirement: Player Order Book Matching and Asset Reservation

**Reason**: Player-to-player commodity trading is removed with the economy.

**Migration**: No replacement. `order_place` and `order_cancel` are retired wire types; escrow fields are ignored, and any persisted orders/trades remain read-only in the frozen snapshots until the dated export.

### Requirement: Rotating Market Contracts

**Reason**: Contracts paid coins, reputation and XP for produce, none of which survive the retirement.

**Migration**: No replacement. `contract_complete` and `contract_update` are retired; the contract board, its generators and its tick are deleted.
