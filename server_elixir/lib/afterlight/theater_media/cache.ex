defmodule Afterlight.TheaterMedia.Cache do
  @moduledoc """
  Disk cache for prepared HLS output under data/theater-media/.
  """

  @default_max_bytes 8 * 1024 * 1024 * 1024

  def root_dir do
    Application.get_env(:afterlight, :theater_media, [])
    |> Keyword.get(:cache_dir, Path.expand("data/theater-media", cwd()))
  end

  def job_dir(prepare_id), do: Path.join(root_dir(), prepare_id)

  def manifest_path(prepare_id), do: Path.join(job_dir(prepare_id), "index.m3u8")

  def ready?(prepare_id) do
    path = manifest_path(prepare_id)
    File.exists?(path) and File.stat!(path).size > 0
  end

  def ensure_dir!(prepare_id) do
    path = job_dir(prepare_id)
    File.mkdir_p!(path)
    path
  end

  def lookup_hit(prepare_id) do
    if ready?(prepare_id), do: {:hit, prepare_id}, else: :miss
  end

  def touch(prepare_id) do
    path = job_dir(prepare_id)
    if File.exists?(path), do: File.touch(path)
  end

  def enforce_cap do
    max = max_bytes()
    entries = list_entries()

    total =
      Enum.reduce(entries, 0, fn {_id, bytes, _mtime}, acc ->
        acc + bytes
      end)

    if total > max do
      evict_until(entries, total, max)
    end

    :ok
  end

  defp list_entries do
    root = root_dir()

    if File.exists?(root) do
      root
      |> File.ls!()
      |> Enum.map(fn id ->
        dir = Path.join(root, id)
        mtime = file_mtime(dir)
        bytes = dir_size(dir)
        {id, bytes, mtime}
      end)
      |> Enum.sort_by(&elem(&1, 2))
    else
      []
    end
  end

  defp evict_until(entries, total, max) do
    Enum.reduce_while(entries, total, fn {id, bytes, _mtime}, acc ->
      if acc <= max do
        {:halt, acc}
      else
        File.rm_rf(job_dir(id))
        {:cont, acc - bytes}
      end
    end)
  end

  defp dir_size(path) do
    path
    |> Path.join("**/*")
    |> Path.wildcard()
    |> Enum.filter(&File.regular?/1)
    |> Enum.reduce(0, fn file, acc ->
      acc + File.stat!(file).size
    end)
  catch
    _, _ -> 0
  end

  defp file_mtime(path) do
    case File.stat(path, time: :posix) do
      {:ok, stat} -> stat.mtime
      _ -> 0
    end
  end

  defp max_bytes do
    Application.get_env(:afterlight, :theater_media, [])
    |> Keyword.get(:cache_max_bytes, @default_max_bytes)
  end

  defp cwd do
    Application.get_env(:afterlight, :runtime_cwd) || File.cwd!()
  end
end
