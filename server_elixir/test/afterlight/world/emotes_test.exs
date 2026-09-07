defmodule Afterlight.World.EmotesTest do
  @moduledoc "Task 4.1: the six-id allow-list (parity: world.json `emote/*`)."

  use ExUnit.Case, async: true

  alias Afterlight.World.Emotes

  test "exactly the six shared ids are allowed" do
    assert Emotes.ids() == ["wave", "dance", "cheer", "heart", "bow", "shrug"]

    for id <- Emotes.ids(), do: assert(Emotes.valid?(id))
  end

  test "unknown, foreign-case and empty ids are rejected" do
    for bad <- ["floss", "WAVE", "", nil, 3, "wave "] do
      refute Emotes.valid?(bad)
    end
  end

  test "cooldown window matches the Node baseline" do
    assert Emotes.cooldown_ms() == 500
  end
end
