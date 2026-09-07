defmodule Afterlight.Theater.ConcurrencyTest do
  use Afterlight.DataCase, async: false

  alias Afterlight.Theater
  alias Afterlight.Theater.TheaterRoom

  @room "theater"
  @youtube "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

  setup do
    start_supervised!(Afterlight.Theater.Supervisor)
    :ok
  end

  test "concurrent theater ops serialize with strictly increasing revision" do
    parent = self()

    tasks =
      for n <- 1..4 do
        Task.async(fn ->
          Ecto.Adapters.SQL.Sandbox.allow(Afterlight.Repo, parent, self())

          Theater.apply_action(
            @room,
            %{"op" => "add", "url" => @youtube, "title" => "Video #{n}"},
            "Racer"
          )
        end)
      end

    results = Task.await_many(tasks, 5_000)
    assert Enum.all?(results, &match?({:ok, _}, &1))

    revisions = Enum.map(results, fn {:ok, commit} -> commit.revision end) |> Enum.sort()
    assert revisions == Enum.to_list(2..5)
    assert revisions == Enum.uniq(revisions)

    room = Ash.get!(TheaterRoom, @room, actor: Afterlight.Accounts.Actor.system(), authorize?: false)
    assert room.revision == Enum.max(revisions)
  end
end
