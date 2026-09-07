defmodule Afterlight.Protocol.PayloadEncoderTest do
  use ExUnit.Case, async: true

  alias Afterlight.Parity
  alias Afterlight.Protocol.PayloadEncoder

  test "integral floats render without decimal point (protocol/serialize-integral-float)" do
    msg = %{"type" => "movement", "x" => 1.0, "z" => -0.5}
    assert PayloadEncoder.encode(msg) == "{\"type\":\"movement\",\"x\":1,\"z\":-0.5}"
  end

  test "null encodes as JSON null" do
    assert PayloadEncoder.encode(nil) == "null"

    assert PayloadEncoder.encode_ordered_map([
             {"theater", %{"now" => nil, "queue" => []}},
             {"serverNow", 1_700_000_000_000}
           ]) ==
             "{\"theater\":{\"now\":null,\"queue\":[]},\"serverNow\":1700000000000}"
  end

  test "encode_ordered_map preserves insertion order" do
    json =
      PayloadEncoder.encode_ordered_map([
        {"prices", [%{"cropId" => "wheat", "multiplier" => 1.0}]},
        {"orderBook", %{"bids" => [], "asks" => [], "trades" => []}}
      ])

    assert String.starts_with?(json, "{\"prices\":")
    assert json =~ "\"multiplier\":1"
    assert json =~ "\"orderBook\":"
  end

  test "fixture vectors match JS JSON.stringify recordings" do
    cases =
      Parity.load_fixture("identity-nodes-machines.json")
      |> Map.fetch!("cases")
      |> Enum.filter(fn c -> c["fn"] in ["serializeMsg", "roundtripMsg"] end)

    assert cases != []

    for %{"args" => [msg], "expected" => expected} <- cases do
      if is_binary(expected) do
        assert PayloadEncoder.encode(msg) == expected
      else
        roundtrip = msg |> PayloadEncoder.encode() |> Jason.decode!()
        assert roundtrip == expected
      end
    end
  end
end
