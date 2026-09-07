defmodule Afterlight.LogCorrelation do
  @moduledoc """
  Secret-free log correlation (P10 design D3).

  Attaches `request_id`, room key, revision, and epoch as Logger metadata
  at channel and envelope boundaries. Correlation uses keys and revisions —
  never tokens, grants, or message payloads.
  """

  require Logger

  @correlation_keys ~w(request_id room revision epoch player_id)a

  @type context :: %{
          optional(:request_id) => String.t(),
          optional(:room) => String.t(),
          optional(:revision) => integer(),
          optional(:epoch) => integer(),
          optional(:player_id) => String.t()
        }

  @doc "Merge correlation fields into the current process Logger metadata."
  @spec put_context(context() | keyword()) :: :ok
  def put_context(context) when is_list(context), do: put_context(Map.new(context))

  def put_context(context) when is_map(context) do
    metadata =
      context
      |> Map.take(@correlation_keys)
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()

    Logger.metadata(metadata)
    :ok
  end

  @doc "Run `fun` with correlation metadata restored afterward."
  @spec with_context(context() | keyword(), (-> term)) :: term
  def with_context(context, fun) when is_function(fun, 0) do
    previous = Logger.metadata()
    put_context(context)

    try do
      fun.()
    after
      Logger.metadata(previous)

      for key <- @correlation_keys, not Keyword.has_key?(previous, key) do
        Logger.metadata([{key, nil}])
      end
    end
  end

  @doc "Copy Plug request id into Logger metadata."
  @spec attach_request_id(Plug.Conn.t()) :: Plug.Conn.t()
  def attach_request_id(conn) do
    case Plug.Conn.get_req_header(conn, "x-request-id") do
      [request_id | _] ->
        Logger.metadata(request_id: request_id)
        conn

      _ ->
        case conn.assigns[:request_id] do
          id when is_binary(id) ->
            Logger.metadata(request_id: id)
            conn

          _ ->
            conn
        end
    end
  end

  defmodule RequestPlug do
    @moduledoc false
    @behaviour Plug

    @impl true
    def init(opts), do: opts

    @impl true
    def call(conn, _opts), do: Afterlight.LogCorrelation.attach_request_id(conn)
  end
end
