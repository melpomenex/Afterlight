defmodule AfterlightWeb.Endpoint do
  # Minimal P1 endpoint: health check only. No Channels, no socket, no game
  # protocol, no LiveView surface — those arrive with P2 (gateway transport).
  use Phoenix.Endpoint, otp_app: :afterlight

  plug Plug.RequestId

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug AfterlightWeb.Router
end
