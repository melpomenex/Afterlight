defmodule WorldTestHelper do
  @moduledoc """
  Test support for the P3 world runtime: fake member-channel processes
  that record pushed frames, and a telemetry tap.
  """

  @doc """
  A fake member "channel": consumes `{:world_frame, frame}` pushes and
  records them to the test process as `{:recorded, id, frame}`. Linked to
  the caller so the room sees the member's DOWN when the test ends.
  """
  def recorder!(test_pid, id) do
    spawn_link(fn -> recorder_loop(test_pid, id) end)
  end

  defp recorder_loop(test_pid, id) do
    receive do
      {:world_frame, frame} ->
        send(test_pid, {:recorded, id, frame})
        recorder_loop(test_pid, id)

      {:world_stall, _room_pid} ->
        send(test_pid, {:stalled, id})

      :stop ->
        :ok
    end
  end

  @doc """
  A fake member channel that never reads its mailbox (a stalled
  consumer): frames pile up in its queue so the RoomServer's outbound
  bound fires; the eventual `{:world_stall, room}` is reported to the
  test process (default `self()`) as `{:stalled, :stalled}`. Linked to
  the caller so it dies with the test.
  """
  def stalled_channel!(test_pid \\ self()) do
    spawn_link(fn ->
      receive do
        {:world_stall, _room_pid} ->
          if test_pid, do: send(test_pid, {:stalled, :stalled})

        :stop ->
          :ok
      end
    end)
  end

  @doc """
  Attaches a telemetry tap forwarding every event to the test process as
  `{:telemetry, name, measurements, metadata}`. Returns the tap ref; call
  `detach_telemetry/1` in `on_exit`.
  """
  def tap_telemetry!(test_pid) do
    ref = make_ref()
    name = {:world_test_tap, ref}

    :telemetry.attach(
      name,
      [:afterlight, :room, :join],
      fn event, measurements, metadata, _ ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    :telemetry.attach(
      {name, :leave},
      [:afterlight, :room, :leave],
      fn event, measurements, metadata, _ ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    :telemetry.attach(
      {name, :tick},
      [:afterlight, :room, :tick],
      fn event, measurements, metadata, _ ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    :telemetry.attach(
      {name, :coalesced},
      [:afterlight, :movement, :coalesced],
      fn event, measurements, metadata, _ ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    :telemetry.attach(
      {name, :stopped},
      [:afterlight, :room, :stopped],
      fn event, measurements, metadata, _ ->
        send(test_pid, {:telemetry, event, measurements, metadata})
      end,
      nil
    )

    name
  end

  def detach_telemetry(name) do
    for suffix <- [nil, :leave, :tick, :coalesced, :stopped] do
      key = if suffix, do: {name, suffix}, else: name

      try do
        :telemetry.detach(key)
      rescue
        _ -> :ok
      end
    end

    :ok
  end
end
