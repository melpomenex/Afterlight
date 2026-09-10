defmodule AfterlightWeb.DownhillCourseController do
  @moduledoc """
  Serves the canonical Downhill Mayhem Daily course document
  (integrate-multiplayer-downhill-mayhem-arcade 4.3, design D5).

  The Daily cannot be precommitted, so the server is the sole runtime generator:
  it bakes the document for the UTC date (or an explicit `?date=YYYYMMDD`),
  publishes its hash, and delivers the exact bytes clients race. Clients never
  generate the Daily independently, so a stale client fails the `loaded`
  handshake closed with `course_mismatch` instead of racing a different hill.
  """

  import Plug.Conn

  use Phoenix.Controller, formats: [:json]

  alias Afterlight.Activities.DownhillMayhem.Course
  alias Afterlight.Activities.DownhillMayhem.Daily

  def daily(conn, params) do
    with {:ok, seed} <- resolve_seed(params) do
      course = course_for_seed(seed)

      conn
      |> put_resp_content_type("application/json")
      |> put_resp_header("cache-control", "public, max-age=300")
      |> send_resp(200, Jason.encode!(course.doc))
    else
      {:error, reason} ->
        conn
        |> put_status(400)
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{ok: false, error: to_string(reason)}))
    end
  end

  # `?date=YYYYMMDD` is bounded: a real calendar date within a generous window,
  # so the endpoint cannot be used to bake unbounded generators.
  defp resolve_seed(params) do
    case Map.get(params, "date") do
      nil ->
        {:ok, Date.utc_today()}

      raw ->
        with {:ok, date} <- parse_date(raw),
             :ok <- in_window?(date) do
          {:ok, date}
        end
    end
  end

  defp parse_date(raw) when is_binary(raw) do
    case Regex.run(~r/^(\d{4})(\d{2})(\d{2})$/, raw) do
      [_, y, m, d] ->
        with {year, ""} <- Integer.parse(y),
             {month, ""} <- Integer.parse(m),
             {day, ""} <- Integer.parse(d),
             {:ok, date} <- Date.new(year, month, day) do
          {:ok, date}
        else
          _ -> {:error, "invalid_date"}
        end

      _ ->
        {:error, "invalid_date"}
    end
  end

  defp parse_date(_), do: {:error, "invalid_date"}

  defp in_window?(date) do
    days = Date.diff(date, Date.utc_today())

    if abs(days) <= 366 do
      :ok
    else
      {:error, "date_out_of_range"}
    end
  end

  defp course_for_seed(%Date{} = date) do
    if date == Date.utc_today() do
      Daily.daily()
    else
      date |> Daily.seed_for_date() |> Daily.generate_document() |> Course.load_any()
    end
  end
end
