defmodule AfterlightWeb.DownhillCourseControllerTest do
  use ExUnit.Case, async: true

  alias Afterlight.Activities.DownhillMayhem.Daily

  defp get(query \\ "") do
    Plug.Test.conn(:get, "/api/downhill/course/daily#{query}")
    |> Plug.Conn.fetch_query_params()
    |> AfterlightWeb.Router.call(AfterlightWeb.Router.init([]))
  end

  test "serves today's server-generated Daily document with its hash" do
    conn = get()
    assert conn.status == 200
    assert Plug.Conn.get_resp_header(conn, "content-type") == ["application/json; charset=utf-8"]

    doc = Jason.decode!(conn.resp_body)
    assert doc["id"] == "daily"
    assert doc["mountain"] == "daily"
    assert doc["seed"] == Daily.seed_for_date(Date.utc_today())
    assert is_binary(doc["hash"]) and byte_size(doc["hash"]) == 64
    assert is_list(doc["cy"]) and is_list(doc["colliders"])
  end

  test "an explicit bounded date serves that date's document deterministically" do
    # A date inside the bounded window but not today (generator path, not the
    # UTC-day cache); computed relative to today so the test never expires.
    date = Date.add(Date.utc_today(), -30)

    query =
      "?date=#{date.year}#{String.pad_leading("#{date.month}", 2, "0")}#{String.pad_leading("#{date.day}", 2, "0")}"

    conn = get(query)
    assert conn.status == 200
    doc = Jason.decode!(conn.resp_body)
    assert doc["seed"] == Daily.seed_for_date(date)

    # Same date requested twice is the same document (generator stable).
    again = get(query)
    assert again.status == 200
    assert Jason.decode!(again.resp_body) == doc
  end

  test "invalid and out-of-window dates fail closed with a named error" do
    for {query, error} <- [
          {"?date=20260230", "invalid_date"},
          {"?date=nonsense", "invalid_date"},
          {"?date=19990101", "date_out_of_range"}
        ] do
      conn = get(query)
      assert conn.status == 400
      assert Jason.decode!(conn.resp_body)["error"] == error
    end
  end
end
