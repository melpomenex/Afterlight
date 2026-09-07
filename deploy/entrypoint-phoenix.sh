#!/bin/sh
set -e
cd /app
mix ecto.create 2>/dev/null || true
mix ecto.migrate
exec mix phx.server
