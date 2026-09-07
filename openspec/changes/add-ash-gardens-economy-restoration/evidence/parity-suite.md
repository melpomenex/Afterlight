# Parity suite — flip-gate evidence (task 2.6)

Recorded: 2026-09-07

## Command

```sh
cd server_elixir && mix test test/parity/
```

## Result

```
16 tests, 0 failures
Finished in ~1.3s
```

## Fixture coverage (gardens / economy / restoration group)

| Fixture | Reference module | Cases |
| --- | --- | --- |
| `garden-crops.json` | `Afterlight.Parity.Reference.Garden` | 48 |
| `market.json` | `Afterlight.Parity.Reference.Market` | 283 |
| `contracts.json` | `Afterlight.Parity.Reference.Contracts` | 9 |
| `identity-nodes-machines.json` | `Afterlight.Parity.Reference.Misc` | 54 |

## Production modules (authority targets)

- `Afterlight.Gardens.Crops`, `Afterlight.Gardens.Model`
- `Afterlight.Economy.Catalog`, `Afterlight.Economy.Pricing`, `Afterlight.Economy.OrderBook`, `Afterlight.Economy.Contracts`
- `Afterlight.Restoration.Materials`, `Afterlight.Restoration.Nodes`, `Afterlight.Restoration.Machines`
- `Afterlight.Parity.Numeric` (shared JS number helpers)

Test reference modules delegate to the production modules; parity runner exercises the full corpus (theater, torrent, market, contracts, garden, iptv, misc, world, chat) plus world frame shape tests.
