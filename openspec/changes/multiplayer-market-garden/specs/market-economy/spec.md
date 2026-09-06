## Purpose

Provides a three-layer economy featuring guaranteed NPC liquidity, bounded dynamic supply and demand pricing with mean reversion, an order book with atomic matching, and rotating contracts.

## ADDED Requirements

### Requirement: NPC Market Liquidity and Reference Pricing
The system SHALL provide NPC liquidity for all crop commodities so players can always immediately sell harvested produce at a fair reference bid and purchase basic seeds at a reference ask.

#### Scenario: Instant selling of produce
- **WHEN** a player executes an instant market sell of produce
- **THEN** the produce is removed from inventory and coins are immediately credited based on the current reference bid and quality multiplier

#### Scenario: Purchasing basic seeds
- **WHEN** a player purchases seeds from the market seed vendor
- **THEN** coins are deducted and the selected seed item is credited to the player's inventory

### Requirement: Dynamic Bounded Supply and Demand
The system SHALL adjust commodity prices dynamically based on trade volume and scarcity while bounding price multipliers within strict limits (e.g. 0.4x to 2.5x base) and mean-reverting toward base value over time.

#### Scenario: Price shift following market sales
- **WHEN** large volumes of a crop are sold to the market
- **THEN** the bid and ask prices for that crop decrease smoothly according to the bounded pricing formula

#### Scenario: Mean reversion of prices
- **WHEN** no transactions occur for a crop across market cycles
- **THEN** the price drifts back toward its configured equilibrium base value

### Requirement: Player Order Book Matching and Asset Reservation
The system SHALL support player-submitted limit orders (BUY and SELL), reserve required coins or inventory items while orders are open, match opposing orders using price/time priority, and apply a 2% market fee.

#### Scenario: Creating a sell order
- **WHEN** a player submits an order to sell produce at a specified unit price
- **THEN** the produce is reserved in the player's inventory and the order is added to the market order book

#### Scenario: Creating a buy order
- **WHEN** a player submits an order to buy produce at a specified unit price
- **THEN** the total coins required are reserved from the player's wallet and the buy order is added to the book

#### Scenario: Executing matching orders
- **WHEN** a buy order price is greater than or equal to the lowest open sell order price
- **THEN** the engine matches the trades atomically, transfers goods and net coins (less transaction fee) between accounts, and broadcasts trade execution

#### Scenario: Cancelling an active order
- **WHEN** a player cancels their own open order
- **THEN** the order is removed from the book and reserved inventory or coins are refunded immediately

### Requirement: Rotating Market Contracts
The system SHALL generate rotating NPC restaurant and cafe contracts requiring specific crop quantities and minimum quality grades, awarding coins, reputation, and XP upon fulfillment.

#### Scenario: Fulfilling an NPC contract
- **WHEN** a player fulfills an active contract with eligible produce from inventory
- **THEN** the requested produce is deducted and the reward coins, reputation, and XP are credited to the player
