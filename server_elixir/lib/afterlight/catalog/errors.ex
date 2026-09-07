defmodule Afterlight.Catalog.Errors do
  @moduledoc """
  Stable IPTV error strings (byte-identical to shared/iptvModel.js).
  """

  alias Afterlight.Catalog.Model

  @spec text(String.t()) :: String.t()
  def text(reason) do
    case reason do
      "too_many_lists" ->
        "The theater's channel shelf is full (#{Model.lists_max()} lists). Remove one to make room."

      "text_too_large" ->
        "That playlist text is too large to file — trim it or split it into a couple of lists."

      "too_many_channels" ->
        "That playlist carries more than #{Model.channels_max()} channels — more than the guide can hold."

      "no_channels" ->
        "No playable channels were found in that playlist."

      "not_a_playlist" ->
        "That does not look like an M3U/M3U8 playlist — it should start with #EXTM3U or contain channel URLs, one per line."

      "list_not_found" ->
        "That list is no longer in the theater library."

      "persist_failed" ->
        "The theater could not accept that."

      _ ->
        "The theater could not accept that."
    end
  end
end
