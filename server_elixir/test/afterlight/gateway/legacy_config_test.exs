defmodule Afterlight.Gateway.LegacyConfigTest do
  use ExUnit.Case, async: true

  alias Afterlight.Gateway.LegacyConfig

  test "warn/0 is callable" do
    assert LegacyConfig.warn() == :ok
  end
end
