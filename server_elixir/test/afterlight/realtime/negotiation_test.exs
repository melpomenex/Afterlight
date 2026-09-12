defmodule Afterlight.Realtime.NegotiationTest do
  @moduledoc """
  Additive capability parsing (contract §5): the `spawn` flag advertises that
  the client applies lifecycle-carrying FULL snapshots on the live path
  (fix-remote-avatar-flicker). Absence and malformed values fall back to the
  baseline-compatible delta shape.
  """

  use ExUnit.Case, async: true

  alias Afterlight.Realtime.Negotiation

  test "spawn is parsed additively; absent and malformed values default false" do
    assert %{spawn: false} =
             Negotiation.parse_hello_rt(%{"rt" => %{"protocols" => ["afterlight-soa-v1"]}})

    assert %{spawn: false} =
             Negotiation.parse_hello_rt(%{
               "rt" => %{"protocols" => ["afterlight-soa-v1"], "spawn" => "yes"}
             })

    assert %{spawn: true} =
             Negotiation.parse_hello_rt(%{
               "rt" => %{"protocols" => ["afterlight-soa-v1"], "spawn" => true}
             })
  end

  test "unknown protocols and legacy hellos stay nil" do
    assert Negotiation.parse_hello_rt(%{"rt" => %{"protocols" => ["other-v1"], "spawn" => true}}) ==
             nil

    assert Negotiation.parse_hello_rt(%{"guestId" => "g"}) == nil
    assert Negotiation.parse_hello_rt(%{}) == nil
  end
end
