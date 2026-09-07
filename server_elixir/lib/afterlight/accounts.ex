defmodule Afterlight.Accounts do
  @moduledoc """
  Ash domain for guest sessions, shadow players, receipts, and outbox.

  P4 authority is session-only. `hello` / `set_nickname` stay relayed to Node.
  GuestId claim window: import completion plus 30 days of `last_seen` recency
  (see `claim_window_open?/2`). The guest id is a stable key, never a secret;
  after the window an unclaimed shadow row cannot be claimed. Bare guestId is
  never authorization — only a verified token is.
  """

  use Ash.Domain, otp_app: :afterlight

  require Ash.Query

  alias Afterlight.Accounts.{
    Actor,
    CommandReceipt,
    GuestSession,
    OutboxEvent,
    Player,
    ReducerSupport
  }

  alias Afterlight.Gateway.Auth
  alias Afterlight.Repo

  resources do
    resource Player
    resource GuestSession
    resource CommandReceipt
    resource OutboxEvent
  end

  @claim_grace_ms 30 * 24 * 60 * 60 * 1000

  def token_hash(token) when is_binary(token) do
    :sha256 |> :crypto.hash(token) |> Base.encode16(case: :lower)
  end

  @doc """
  Bind a verified P2 token to a durable GuestSession. Upserts by identity
  (same token hash or same live player). Token is hashed, never stored.
  """
  def create_guest_session(token, claims) when is_binary(token) and is_map(claims) do
    guest_id = claims[:guest_id] || claims["guest_id"]
    now = now_ms()
    hash = token_hash(token)
    issued_at = issued_at_ms(claims, now)
    expires_at = issued_at + Auth.token_max_age_secs() * 1000
    actor = Actor.connecting(guest_id, hash)

    Repo.transaction(fn ->
      with {:ok, player} <- ensure_player(guest_id, actor, now),
           :ok <- assert_claim_window(player, now),
           {:ok, session} <- upsert_session(player.id, hash, issued_at, expires_at, actor),
           {:ok, player} <- activate_player(player, now, actor),
           {:ok, _} <- enqueue_outbox(player.id, "session.bound", %{session_id: session.id}, actor) do
        %{player: player, session: session}
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  def revoke_session(session, actor) do
    now = now_ms()

    Repo.transaction(fn ->
      with {:ok, session} <-
             session
             |> Ash.Changeset.for_update(:revoke, %{revoked_at: now}, actor: actor)
             |> Ash.update(),
           :ok <- maybe_deactivate(session.player_id, now, actor),
           {:ok, _} <-
             enqueue_outbox(session.player_id, "session.revoked", %{session_id: session.id}, actor) do
        session
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  def set_nickname(player, desired, actor, opts \\ []) do
    rng = Keyword.get(opts, :rng, &ReducerSupport.default_rng/0)
    clean = ReducerSupport.sanitize_nickname(desired, rng)
    receipt_id = "srv_" <> Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)

    run_idempotent(actor, receipt_id, %{op: :set_nickname, nickname: clean}, fn ->
      player
      |> Ash.Changeset.for_update(:set_nickname, %{nickname: clean}, actor: actor)
      |> Ash.update()
      |> case do
        {:ok, updated} ->
          _ = enqueue_outbox(updated.id, "player.nickname", %{nickname: updated.nickname}, actor)
          {:ok, updated}

        other ->
          other
      end
    end)
  end

  def allocate_nickname(desired, active, rng \\ &ReducerSupport.default_rng/0) do
    ReducerSupport.resolve_duplicate_nickname(desired, active, rng)
  end

  @doc """
  Insert-retry against the active-nickname unique index (P6 writer path).
  """
  def allocate_and_assign(player, desired, actor, rng \\ &ReducerSupport.default_rng/0) do
    active = active_nicknames(except_id: player.id)
    base = allocate_nickname(desired, active, rng)
    try_assign(player, base, actor, rng, 0)
  end

  def touch_last_seen(player, at_ms, actor) do
    player
    |> Ash.Changeset.for_update(:touch_last_seen, %{last_seen: at_ms}, actor: actor)
    |> Ash.update()
  end

  def run_idempotent(actor, request_id, payload, fun) do
    player_id = actor.player_id
    hash = payload_hash(payload)

    case fetch_receipt(player_id, request_id) do
      %{payload_hash: ^hash, outcome: outcome} ->
        :telemetry.execute([:afterlight, :durable, :dedup, :hit], %{count: 1}, %{player_id: player_id})
        {:ok, {:replay, outcome}}

      %{payload_hash: _other} ->
        {:error, :idempotency_conflict}

      nil ->
        case fun.() do
          {:ok, result} ->
            outcome = %{"ok" => true, "result" => dump_result(result)}

            {:ok, _} =
              CommandReceipt
              |> Ash.Changeset.for_create(
                :record,
                %{
                  actor: player_id,
                  request_id: request_id,
                  payload_hash: hash,
                  outcome: outcome,
                  created_at: now_ms()
                },
                actor: actor
              )
              |> Ash.create()

            {:ok, {:applied, result}}

          {:error, _} = err ->
            err

          other ->
            {:error, other}
        end
    end
  end

  def payload_hash(payload) do
    json = Jason.encode!(jsonish(payload))
    :sha256 |> :crypto.hash(json) |> Base.encode16(case: :lower)
  end

  def claim_window_grace_ms do
    Application.get_env(:afterlight, :accounts, [])
    |> Keyword.get(:claim_window_grace_ms, @claim_grace_ms)
  end

  def claim_window_open?(player, now \\ now_ms()) do
    cond do
      player.shadow != true -> true
      not is_nil(player.claimed_at) -> true
      true ->
        imported_at = Afterlight.Accounts.SystemImport.imported_at("players") || 0
        grace = claim_window_grace_ms()
        now <= imported_at + grace or now <= player.last_seen + grace
    end
  end

  def now_ms, do: System.system_time(:millisecond)

  def p4_writable_player_fields, do: [:active, :claimed_at]

  defp ensure_player(guest_id, actor, now) do
    case Ash.get(Player, guest_id, actor: actor, error?: false) do
      {:ok, %Player{} = player} ->
        {:ok, player}

      _ ->
        Player
        |> Ash.Changeset.for_create(
          :stub,
          %{id: guest_id, nickname: guest_id, last_seen: now},
          actor: actor
        )
        |> Ash.create()
    end
  end

  defp assert_claim_window(player, now) do
    if claim_window_open?(player, now) do
      :ok
    else
      {:error, :claim_window_closed}
    end
  end

  defp upsert_session(player_id, hash, issued_at, expires_at, actor) do
    attrs = %{player_id: player_id, token_hash: hash, issued_at: issued_at, expires_at: expires_at}

    case live_session(player_id, actor) do
      {:ok, session} ->
        session
        |> Ash.Changeset.for_update(:rebind, Map.take(attrs, [:token_hash, :issued_at, :expires_at]),
          actor: actor
        )
        |> Ash.update()

      _ ->
        GuestSession
        |> Ash.Changeset.for_create(:open, attrs, actor: actor)
        |> Ash.create()
    end
  end

  defp live_session(player_id, actor) do
    now = now_ms()

    GuestSession
    |> Ash.Query.filter(player_id == ^player_id and is_nil(revoked_at) and expires_at > ^now)
    |> Ash.Query.sort(issued_at: :desc)
    |> Ash.Query.limit(1)
    |> Ash.read(actor: actor)
    |> case do
      {:ok, [session | _]} -> {:ok, session}
      _ -> :error
    end
  end

  defp activate_player(player, now, actor) do
    claimed_at = player.claimed_at || now

    case player
         |> Ash.Changeset.for_update(:set_active, %{active: true, claimed_at: claimed_at}, actor: actor)
         |> Ash.update() do
      {:ok, updated} ->
        {:ok, updated}

      {:error, _} ->
        # Unique active-nickname collision among historical duplicates: keep
        # the session, leave active false so the first holder keeps the slot.
        {:ok, player}
    end
  end

  def maybe_deactivate(player_id, _now, actor) do
    still_live? =
      case live_session(player_id, actor) do
        {:ok, _} -> true
        _ -> false
      end

    if still_live? do
      :ok
    else
      case Ash.get(Player, player_id, actor: actor, error?: false) do
        {:ok, player} ->
          _ =
            player
            |> Ash.Changeset.for_update(:set_active, %{active: false}, actor: actor)
            |> Ash.update()

          :ok

        _ ->
          :ok
      end
    end
  end

  defp enqueue_outbox(player_id, event_type, payload, actor) do
    OutboxEvent
    |> Ash.Changeset.for_create(
      :enqueue,
      %{
        aggregate: "accounts",
        aggregate_id: player_id,
        revision: now_ms(),
        event_type: event_type,
        payload: jsonish(payload),
        created_at: now_ms()
      },
      actor: actor
    )
    |> Ash.create()
  end

  defp fetch_receipt(actor_id, request_id) do
    CommandReceipt
    |> Ash.Query.filter(actor == ^actor_id and request_id == ^request_id)
    |> Ash.read(actor: Actor.system(), authorize?: false)
    |> case do
      {:ok, [row | _]} -> row
      _ -> nil
    end
  end

  defp active_nicknames(except_id: except_id) do
    Player
    |> Ash.Query.filter(active == true and id != ^except_id)
    |> Ash.read!(actor: Actor.system(), authorize?: false)
    |> Enum.map(& &1.nickname)
  end

  defp try_assign(player, candidate, actor, rng, attempt) when attempt < 100 do
    case player
         |> Ash.Changeset.for_update(:set_nickname, %{nickname: candidate}, actor: actor, authorize?: false)
         |> Ash.update() do
      {:ok, updated} ->
        {:ok, updated}

      {:error, _} ->
        next = "#{ReducerSupport.sanitize_nickname(player.nickname, rng)}#{attempt + 2}"
        try_assign(player, next, actor, rng, attempt + 1)
    end
  end

  defp try_assign(player, _candidate, actor, rng, _attempt) do
    fallback = allocate_nickname(player.nickname, active_nicknames(except_id: player.id), rng)

    player
    |> Ash.Changeset.for_update(:set_nickname, %{nickname: fallback}, actor: actor, authorize?: false)
    |> Ash.update()
  end

  defp issued_at_ms(claims, now) do
    case claims[:issued_at] || claims["issued_at"] do
      n when is_integer(n) and n < 10_000_000_000 -> n * 1000
      n when is_integer(n) -> n
      _ -> now
    end
  end

  defp jsonish(%_{} = struct), do: Map.from_struct(struct) |> Map.drop([:__meta__]) |> jsonish()
  defp jsonish(map) when is_map(map), do: Map.new(map, fn {k, v} -> {to_string(k), jsonish(v)} end)
  defp jsonish(list) when is_list(list), do: Enum.map(list, &jsonish/1)
  defp jsonish(other), do: other

  defp dump_result(%_{id: id}), do: %{"id" => id}
  defp dump_result(other), do: jsonish(other)
end
