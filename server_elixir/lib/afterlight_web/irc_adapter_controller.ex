defmodule AfterlightWeb.IrcAdapterController do
  @moduledoc """
  Inbound authenticated adapter endpoint for Node IRC sidecar events.
  """

  use Phoenix.Controller, formats: [:json]

  alias Afterlight.Gateway
  alias Afterlight.Specialty.IrcBridge

  def create(conn, params) do
    with :ok <- verify_boundary(conn),
         event when is_map(event) <- Map.get(params, "event") do
      IrcBridge.receive_event(event)
      json(conn, %{ok: true})
    else
      nil ->
        conn |> put_status(400) |> json(%{ok: false, error: "missing_event"})

      :error ->
        conn |> put_status(403) |> json(%{ok: false, error: "boundary"})
    end
  end

  defp verify_boundary(conn) do
    case Gateway.config(:boundary_secret) do
      secret when is_binary(secret) ->
        presented = get_req_header(conn, "x-afterlight-boundary") |> List.first()
        if presented == secret, do: :ok, else: :error

      _ ->
        # Loopback dev without secret: accept only from localhost.
        case conn.remote_ip do
          {127, 0, 0, 1} -> :ok
          {0, 0, 0, 0, 0, 0, 0, 1} -> :ok
          _ -> :error
        end
    end
  end
end
