defmodule Afterlight.Specialty.BillSyncTest do
  use ExUnit.Case, async: false

  alias Afterlight.Specialty.BillSource
  alias Afterlight.Specialty.BillSync

  test "bill source returns a list when theater_items is absent" do
    assert is_list(BillSource.torrent_infohashes())
  end

  test "sync_now is idempotent when the bill set is unchanged" do
    :ok = BillSync.sync_now()
    first = BillSync.last_pushed()
    :ok = BillSync.sync_now()
    assert BillSync.last_pushed() == first
  end
end
