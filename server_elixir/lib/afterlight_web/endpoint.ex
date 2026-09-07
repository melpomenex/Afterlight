defmodule AfterlightWeb.Endpoint do
  # Gateway endpoint (P2): the `/ws` channel socket, the reverse-proxied
  # HTTP side channel, and the auth route.
  #
  # Plug order matters: `socket "/ws"` paths are matched before the plug
  # pipeline (Phoenix compiles socket dispatch ahead of it), then
  # HTTPProxy intercepts `/api/health` + `/api/theater/*` BEFORE
  # Plug.Parsers so raw bodies pass through untouched; everything else
  # flows through parsers into the router. `/health` stays a direct
  # Phoenix endpoint; `/api/health` now answers from Node.
  use Phoenix.Endpoint, otp_app: :afterlight

  socket "/ws", AfterlightWeb.UserSocket,
    websocket: true,
    longpoll: false

  plug AfterlightWeb.MetricsPlug
  plug Plug.RequestId
  plug Afterlight.LogCorrelation.RequestPlug

  plug AfterlightWeb.Plugs.TheaterCors
  plug AfterlightWeb.Plugs.TheaterCatalog
  plug AfterlightWeb.HTTPProxy

  plug Plug.Parsers,
    parsers: [:json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug AfterlightWeb.Router
end
