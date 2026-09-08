defmodule Afterlight.TheaterMedia.Coordinator do
  @moduledoc """
  Deduped media preparation jobs for theater bill items.
  """

  use GenServer
  require Logger

  alias Afterlight.TheaterMedia.{Cache, Compatibility, Probe, SecureUrl, Transcoder}

  @default_room "theater"

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)

  def ensure(room_key, item_id, source_url) do
    GenServer.cast(__MODULE__, {:ensure, room_key, item_id, source_url})
  end

  @impl true
  def init(state) do
    if Probe.tools_available?() do
      Logger.info("theater_media ffmpeg/ffprobe available")
    else
      Logger.warning("theater_media ffmpeg/ffprobe unavailable — only direct-play media works")
    end

    {:ok, Map.merge(%{jobs: %{}, running: 0}, state)}
  end

  @impl true
  def handle_cast({:ensure, room_key, item_id, source_url}, state) do
    key = {room_key, item_id}

    if Map.has_key?(state.jobs, key) do
      {:noreply, state}
    else
      max = max_concurrent()

      if state.running >= max do
        Process.send_after(self(), {:deferred_ensure, room_key, item_id, source_url}, 500)
        {:noreply, state}
      else
        task =
          Task.Supervisor.async_nolink(Afterlight.TheaterMedia.TaskSupervisor, fn ->
            run_job(room_key, item_id, source_url)
          end)

        {:noreply,
         %{
           state
           | jobs: Map.put(state.jobs, key, %{task: task, source_url: source_url}),
             running: state.running + 1
         }}
      end
    end
  end

  @impl true
  def handle_info({:deferred_ensure, room_key, item_id, source_url}, state) do
    handle_cast({:ensure, room_key, item_id, source_url}, state)
  end

  @impl true
  def handle_info({ref, _result}, state) when is_reference(ref) do
    jobs =
      Enum.reduce(state.jobs, state.jobs, fn {key, %{task: task} = meta}, acc ->
        if task.ref == ref do
          Map.delete(acc, key)
        else
          acc
        end
      end)

    {:noreply, %{state | jobs: jobs, running: max(0, state.running - 1)}}
  end

  @impl true
  def handle_info({:DOWN, _ref, :process, _pid, _reason}, state) do
    {:noreply, state}
  end

  defp run_job(room_key, item_id, source_url) do
    unless Probe.tools_available?() do
      Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
        "prepareStatus" => "failed",
        "prepareError" => "engine_unavailable"
      })
    else
      do_run_job(room_key, item_id, source_url)
    end
  end

  defp do_run_job(room_key, item_id, source_url) do
    unless Probe.tools_available?() do
      Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
        "prepareStatus" => "failed",
        "prepareError" => "engine_unavailable"
      })
    else
      do_run_job(room_key, item_id, source_url)
    end
  end

  defp do_run_job(room_key, item_id, source_url) do
    Logger.info("theater_media probe started", item_id: item_id)

    with :ok <- SecureUrl.validate(source_url),
         :ok <- patch_status(item_id, "probing"),
         {:ok, probe} <- Probe.probe_url(source_url),
         plan <- Compatibility.plan(probe),
         prepare_id <- Compatibility.cache_key(source_url, probe, plan) do
      case plan[:strategy] do
        "direct" ->
          Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
            "prepareStatus" => "direct",
            "sourceUrl" => source_url
          })

        _ ->
          case Cache.lookup_hit(prepare_id) do
            {:hit, _} ->
              Logger.info("theater_media cache hit", prepare_id: prepare_id)
              url = "/api/theater/media/#{prepare_id}/index.m3u8"
              Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
                "prepareStatus" => "ready",
                "prepareId" => prepare_id,
                "playbackUrl" => url,
                "kind" => "hls"
              })

            :miss ->
              patch_status(item_id, "preparing")
              Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
                "prepareStatus" => "preparing",
                "prepareId" => prepare_id,
                "sourceUrl" => source_url
              })

              case Transcoder.run(source_url, probe, plan, prepare_id) do
                :ok ->
                  url = "/api/theater/media/#{prepare_id}/index.m3u8"
                  Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
                    "prepareStatus" => "ready",
                    "prepareId" => prepare_id,
                    "playbackUrl" => url,
                    "kind" => "hls"
                  })

                {:error, reason} ->
                  Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
                    "prepareStatus" => "failed",
                    "prepareId" => prepare_id,
                    "prepareError" => error_code(reason)
                  })
              end
          end
      end
    else
      {:error, reason} ->
        Afterlight.Theater.patch_prepare_fields(room_key, item_id, %{
          "prepareStatus" => "failed",
          "prepareError" => error_code(reason)
        })
    end
  end

  defp patch_status(item_id, status) do
    Afterlight.Theater.patch_prepare_fields("theater", item_id, %{"prepareStatus" => status})
    :ok
  end

  defp error_code(:engine_unavailable), do: "engine_unavailable"
  defp error_code(:auth_required), do: "auth_required"
  defp error_code(:probe_failed), do: "probe_failed"
  defp error_code(:prepare_failed), do: "prepare_failed"
  defp error_code(:prepare_timeout), do: "prepare_timeout"
  defp error_code(:blocked), do: "blocked"
  defp error_code(:host_rejected), do: "host_rejected"
  defp error_code(:unreachable), do: "unreachable"
  defp error_code(_), do: "prepare_failed"

  defp max_concurrent do
    Application.get_env(:afterlight, :theater_media, [])
    |> Keyword.get(:max_concurrent, 2)
  end
end
