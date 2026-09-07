defmodule Afterlight.Import.Snapshot do
  @moduledoc false

  @doc """
  Copies `source_path` aside and returns `{tmp_path, sha256_hex}`.
  The caller must delete `tmp_path` when finished.
  """
  def copy_and_hash(source_path) do
    source_path = Path.expand(source_path)
    tmp = source_path <> ".import.#{:erlang.unique_integer([:positive])}"
    File.copy!(source_path, tmp)
    {tmp, sha256_file(tmp)}
  end

  def sha256_file(path) do
    path
    |> File.stream!([], 64 * 1024)
    |> Enum.reduce(:crypto.hash_init(:sha256), &:crypto.hash_update(&2, &1))
    |> :crypto.hash_final()
    |> Base.encode16(case: :lower)
  end
end
