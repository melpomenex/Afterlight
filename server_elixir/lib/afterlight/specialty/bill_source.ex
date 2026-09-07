defmodule Afterlight.Specialty.BillSource do
  @moduledoc false

  alias Afterlight.Repo

  @infohash_re ~r/^[0-9a-f]{40}$/

  @doc """
  Distinct lower-case infohashes referenced by torrent rows in `theater_items`.

  Returns `[]` when the P5 table is not present yet (advisory sync).
  """
  @spec torrent_infohashes() :: [String.t()]
  def torrent_infohashes do
    sql = """
    SELECT DISTINCT infohash
    FROM theater_items
    WHERE kind = 'torrent'
      AND infohash IS NOT NULL
      AND length(infohash) = 40
    """

    case Repo.query(sql, []) do
      {:ok, %{rows: rows}} ->
        rows
        |> Enum.map(fn [hash] -> String.downcase(hash) end)
        |> Enum.filter(&Regex.match?(@infohash_re, &1))
        |> Enum.uniq()

      {:error, %{postgres: %{code: :undefined_table}}} ->
        []

      {:error, _} ->
        []
    end
  rescue
    _ -> []
  end
end
