defmodule Afterlight.Social.SeenLedgerTest do
  use ExUnit.Case, async: true

  alias Afterlight.Social.SeenLedger

  test "record is new until cap then evicts oldest" do
    ledger = SeenLedger.new(2)
    {:new, ledger} = SeenLedger.record(ledger, {:game, "a"})
    {:new, ledger} = SeenLedger.record(ledger, {:irc, "b"})
    assert SeenLedger.seen?(ledger, {:game, "a"})
    {:seen, _} = SeenLedger.record(ledger, {:game, "a"})
    {:new, ledger} = SeenLedger.record(ledger, {:game, "c"})
    refute SeenLedger.seen?(ledger, {:game, "a"})
    assert SeenLedger.seen?(ledger, {:irc, "b"})
    assert SeenLedger.size(ledger) == 2
  end
end
