defmodule Afterlight.LogScrubber do
  @moduledoc """
  Formatter-level deny-list scrubber (P10 design D3).

  Strips session tokens, signed guest credentials, TURN secrets, and
  private/DM message bodies from log lines. Room keys and revisions are
  the correlation surface — never payloads.
  """

  @replacement "[REDACTED]"

  # Adversarial shapes covered by tests/fixtures in log_scrubber_test.exs.
  @patterns [
    # Phoenix / Afterlight guest tokens (base64url segments).
    ~r/\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
    # Bearer headers and query tokens.
    ~r/(?i)(bearer\s+)[A-Za-z0-9._~+\/-]+/,
    ~r/(?i)(token=)[^&\s"']+/,
    ~r/(?i)(guest[_-]?token["']?\s*[:=]\s*)["']?[^"'\s,}]+/,
    # TURN / media grant secrets in key=value logs.
    ~r/(?i)(turn[_-]?secret["']?\s*[:=]\s*)["']?[^"'\s,}]+/,
    ~r/(?i)(media[_-]?grant[_-]?secret["']?\s*[:=]\s*)["']?[^"'\s,}]+/,
    # Private/DM message bodies when logged as structured text.
    ~r/(?i)(private[_-]?message|dm[_-]?body|chat[_-]?dm)["']?\s*[:=]\s*["'][^"']{1,}/,
    ~r/(?i)"text"\s*:\s*"[^"]{1,}"/
  ]

  @spec scrub(term) :: term
  def scrub(message) when is_binary(message) do
    Enum.reduce(@patterns, message, fn pattern, acc ->
      Regex.replace(pattern, acc, fn _full, prefix -> prefix <> @replacement end)
    end)
  end

  def scrub(other), do: other

  @spec scrub_metadata(keyword() | map()) :: keyword()
  def scrub_metadata(metadata) when is_list(metadata), do: scrub_metadata(Map.new(metadata))

  def scrub_metadata(metadata) when is_map(metadata) do
    metadata
    |> Enum.map(fn {key, value} -> {key, scrub_metadata_value(key, value)} end)
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Keyword.new()
  end

  defp scrub_metadata_value(:token, _value), do: @replacement
  defp scrub_metadata_value(:guest_token, _value), do: @replacement
  defp scrub_metadata_value(:turn_secret, _value), do: @replacement
  defp scrub_metadata_value(:media_grant, _value), do: @replacement
  defp scrub_metadata_value(:private_message, _value), do: @replacement
  defp scrub_metadata_value(:text, value) when is_binary(value), do: @replacement
  defp scrub_metadata_value(_key, value) when is_binary(value), do: scrub(value)
  defp scrub_metadata_value(_key, value), do: value
end
