defmodule Afterlight.World.Lease do
  @moduledoc """
  PostgreSQL-backed room ownership leases (P9, design D1).

  Acquisition is atomic with epoch increment; renewal and expiry use
  **database time only** — node wall clocks never decide ownership.
  """

  import Ecto.Query

  alias Afterlight.Repo
  alias Afterlight.World
  alias Afterlight.World.Lease.{Handle, RoomLease}
  alias Afterlight.World.RoomKey

  @max_ttl_secs 15
  @renew_interval_ms 5_000
  @query_timeout_ms 15_000

  @doc "Maximum lease TTL in seconds (design bound)."
  @spec max_ttl_secs() :: pos_integer()
  def max_ttl_secs, do: @max_ttl_secs

  @doc "Renewal cadence in milliseconds (design bound, jitter applied by Renewer)."
  @spec renew_interval_ms() :: pos_integer()
  def renew_interval_ms, do: @renew_interval_ms

  @doc "Default lease query timeout in milliseconds (callers may pass a tighter `:timeout` opt)."
  @spec query_timeout_ms() :: pos_integer()
  def query_timeout_ms, do: @query_timeout_ms

  @doc "This node's owner identity string."
  @spec owner_node() :: String.t()
  def owner_node do
    World.config(:owner_node, to_string(Node.self()))
  end

  @doc """
  Atomically acquire or take over an expired lease. Concurrent claimants
  yield exactly one winner; takeover bumps `epoch`.

  Options: `:timeout` — query timeout in milliseconds. The live owner seam
  (RoomServer startup, Renewer) passes a bounded timeout so a stalled
  database degrades a room quickly instead of stalling a join or a
  renewal for the full default.
  """
  @spec acquire(RoomKey.t() | map(), keyword()) :: {:ok, Handle.t()} | {:error, term}
  def acquire(key, opts \\ []) do
    key = normalize_key(key)
    node = owner_node()
    ttl = max_ttl_secs()
    query_opts = [timeout: Keyword.get(opts, :timeout, @query_timeout_ms)]

    sql = """
    INSERT INTO room_leases AS l
      (room_key, region, district_id, instance_id, owner_node, epoch, expires_at, renewed_at, inserted_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 1, now() + ($6 || ' seconds')::interval, now(), now(), now())
    ON CONFLICT (room_key) DO UPDATE SET
      owner_node = EXCLUDED.owner_node,
      epoch = CASE
        WHEN l.expires_at < now() OR l.owner_node <> EXCLUDED.owner_node THEN l.epoch + 1
        ELSE l.epoch
      END,
      expires_at = EXCLUDED.expires_at,
      renewed_at = EXCLUDED.renewed_at,
      updated_at = now()
    WHERE l.expires_at < now() OR l.owner_node = EXCLUDED.owner_node
    RETURNING room_key, owner_node, epoch
    """

    case Repo.query(sql, [
           key.room_key,
           key.region,
           key.district_id,
           key.instance_id,
           node,
           Integer.to_string(ttl)
         ], query_opts) do
      {:ok, %{rows: [[room_key, owner, epoch]]}} when owner == node ->
        {:ok, %Handle{room_key: room_key, owner_node: owner, epoch: epoch, fenced: false}}

      {:ok, %{rows: [[_room_key, owner, _epoch]]}} ->
        {:error, {:held_by, owner}}

      {:ok, %{rows: []}} ->
        # Lost race — read current holder.
        case get_row(key.room_key) do
          nil -> {:error, :acquire_race}
          row -> {:error, {:held_by, row.owner_node}}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Guarded renewal: owner and epoch must match and lease must be unexpired
  (database `now()`). Failed renewal returns `{:error, :fenced}`.
  Options: `:timeout` — query timeout in milliseconds (see `acquire/2`).
  """
  @spec renew(Handle.t(), keyword()) :: {:ok, Handle.t()} | {:error, :fenced | term}
  def renew(handle, opts \\ [])

  def renew(%Handle{fenced: true}, _opts), do: {:error, :fenced}

  def renew(%Handle{} = handle, opts) do
    ttl = max_ttl_secs()
    query_opts = [timeout: Keyword.get(opts, :timeout, @query_timeout_ms)]

    sql = """
    UPDATE room_leases
    SET expires_at = now() + ($3 || ' seconds')::interval,
        renewed_at = now(),
        updated_at = now()
    WHERE room_key = $1
      AND owner_node = $2
      AND epoch = $4
      AND expires_at > now()
    RETURNING epoch
    """

    case Repo.query(sql, [
           handle.room_key,
           handle.owner_node,
           Integer.to_string(ttl),
           handle.epoch
         ], query_opts) do
      {:ok, %{rows: [[epoch]]}} ->
        {:ok, %{handle | epoch: epoch, fenced: false}}

      {:ok, %{rows: []}} ->
        {:error, :fenced}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc "Mark a handle fenced (renewal lost or DB unreachable)."
  @spec fence(Handle.t()) :: Handle.t()
  def fence(%Handle{} = handle), do: %{handle | fenced: true}

  @doc """
  In-transaction lease check for durable mutations (design D2). Must run
  inside `Repo.transaction/1`. Aborts with `{:error, :lease_lost}` when the
  lease no longer matches or is expired.
  """
  @spec verify_in_transaction(Handle.t(), Ecto.Repo.t()) :: :ok | {:error, :lease_lost}
  def verify_in_transaction(%Handle{fenced: true}, _repo), do: {:error, :lease_lost}

  def verify_in_transaction(%Handle{} = handle, repo) do
    sql = """
    SELECT 1 FROM room_leases
    WHERE room_key = $1
      AND owner_node = $2
      AND epoch = $3
      AND expires_at > now()
    LIMIT 1
    """

    case repo.query(sql, [handle.room_key, handle.owner_node, handle.epoch]) do
      {:ok, %{rows: [[1]]}} -> :ok
      _ -> {:error, :lease_lost}
    end
  end

  @doc "Read the current lease row for a room key (database time for expiry)."
  @spec lookup(String.t()) :: RoomLease.t() | nil
  def lookup(room_key) do
    get_row(room_key)
  end

  @doc "True when the lease row exists, is unexpired, and owned by this node."
  @spec held_by_self?(String.t()) :: boolean
  def held_by_self?(room_key) do
    self = owner_node()

    case get_row(room_key) do
      %{owner_node: ^self, expires_at: expires} ->
        DateTime.compare(expires, db_now()) == :gt

      _ ->
        false
    end
  end

  @doc "Successor acquisition with jittered backoff (design D1)."
  @spec acquire_with_backoff(RoomKey.t(), non_neg_integer()) :: {:ok, Handle.t()} | {:error, term}
  def acquire_with_backoff(key, attempt \\ 0) do
    jitter = :rand.uniform(200) + attempt * 50
    Process.sleep(jitter)

    case acquire(key) do
      {:ok, handle} ->
        {:ok, handle}

      {:error, {:held_by, _}} when attempt < 5 ->
        acquire_with_backoff(key, attempt + 1)

      other ->
        other
    end
  end

  @doc "Release lease on graceful room shutdown (best-effort)."
  @spec release(Handle.t()) :: :ok
  def release(%Handle{} = handle) do
    Repo.delete_all(from l in RoomLease, where: l.room_key == ^handle.room_key and l.owner_node == ^handle.owner_node and l.epoch == ^handle.epoch)
    :ok
  end

  defp normalize_key(%{room_key: _} = key), do: key

  defp get_row(room_key) do
    Repo.one(from l in RoomLease, where: l.room_key == ^room_key)
  end

  defp db_now do
    case Repo.query("SELECT now()") do
      {:ok, %{rows: [[%DateTime{} = dt]]}} -> dt
      _ -> DateTime.utc_now()
    end
  end
end
