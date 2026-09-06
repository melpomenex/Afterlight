# Prod-specific compile-time overrides. Secrets and gateway URLs are
# read from the environment in runtime.exs (which hard-fails on missing
# prod secrets) — nothing needed here yet.
import Config
