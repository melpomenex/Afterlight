defmodule Afterlight.TheaterMedia.Transcoder do
  @moduledoc """
  ffmpeg HLS preparation with stream-copy or transcode profiles.
  """

  require Logger

  alias Afterlight.TheaterMedia.Cache

  @segment_sec 4

  @spec run(String.t(), map(), map(), String.t()) :: :ok | {:error, atom()}
  def run(source_url, probe, plan, prepare_id) do
    unless Afterlight.TheaterMedia.Probe.tools_available?() do
      {:error, :engine_unavailable}
    else
      out_dir = Cache.ensure_dir!(prepare_id)
      playlist = Path.join(out_dir, "index.m3u8")
      segment_pattern = Path.join(out_dir, "seg_%05d.m4s")

      args =
        base_input(source_url) ++
          video_args(plan) ++
          audio_args(plan) ++
          hls_output(playlist, segment_pattern)

      Logger.info("theater_media transcode started",
        prepare_id: prepare_id,
        strategy: plan[:strategy] || plan["strategy"]
      )

      task =
        Task.Supervisor.async_nolink(Afterlight.TheaterMedia.TaskSupervisor, fn ->
          System.cmd("ffmpeg", args, stderr_to_stdout: true, env: [])
        end)

      case wait_manifest(playlist, task, timeout_ms()) do
        :ok ->
          Cache.touch(prepare_id)
          Cache.enforce_cap()
          Logger.info("theater_media ready", prepare_id: prepare_id)
          :ok

        {:error, reason} ->
          File.rm_rf(out_dir)
          {:error, reason}
      end
    end
  end

  defp base_input(url) do
    ["-hide_banner", "-loglevel", "error", "-y", "-i", url]
  end

  defp video_args(%{strategy: "transcode_full"}),
    do: ["-map", "0:v:0?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23"]

  defp video_args(%{strategy: "transcode_audio"}), do: ["-map", "0:v:0?", "-c:v", "copy"]
  defp video_args(%{strategy: "remux"}), do: ["-map", "0:v:0?", "-c:v", "copy"]
  defp video_args(_), do: ["-map", "0:v:0?", "-c:v", "copy"]

  defp audio_args(%{strategy: "transcode_full"}),
    do: ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "128k"]

  defp audio_args(%{strategy: "transcode_audio"}),
    do: ["-map", "0:a:0?", "-c:a", "aac", "-b:a", "128k"]

  defp audio_args(%{strategy: "remux"}), do: ["-map", "0:a:0?", "-c:a", "copy"]
  defp audio_args(_), do: ["-map", "0:a:0?", "-c:a", "copy"]

  defp hls_output(playlist, segment_pattern) do
    [
      "-f",
      "hls",
      "-hls_time",
      Integer.to_string(@segment_sec),
      "-hls_playlist_type",
      "event",
      "-hls_flags",
      "independent_segments+program_date_time",
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      "init.mp4",
      "-hls_segment_filename",
      segment_pattern,
      playlist
    ]
  end

  defp wait_manifest(playlist, task, deadline_ms) do
    started = System.monotonic_time(:millisecond)

    wait_loop(playlist, task, started, deadline_ms)
  end

  defp wait_loop(playlist, task, started, deadline_ms) do
    prepare_id = Path.basename(Path.dirname(playlist))

    cond do
      Cache.ready?(prepare_id) ->
        drain_task(task)
        :ok

      System.monotonic_time(:millisecond) - started > deadline_ms ->
        Task.shutdown(task, :brutal_kill)
        {:error, :prepare_timeout}

      true ->
        case Task.yield(task, 250) || :running do
          {:ok, {_out, 0}} ->
            if File.exists?(playlist), do: :ok, else: {:error, :prepare_failed}

          {:ok, _} ->
            {:error, :prepare_failed}

          {:exit, _} ->
            if File.exists?(playlist), do: :ok, else: {:error, :prepare_failed}

          :running ->
            wait_loop(playlist, task, started, deadline_ms)
        end
    end
  end

  defp drain_task(task) do
    case Task.yield(task, 5_000) || Task.shutdown(task) do
      {:ok, _} -> :ok
      _ -> :ok
    end
  end

  defp timeout_ms do
    Application.get_env(:afterlight, :theater_media, [])
    |> Keyword.get(:prepare_timeout_ms, 3_600_000)
  end
end
