defmodule Afterlight.Parity.Reference.Chat do
  @moduledoc """
  Parity reference for `server/chat.js` (chat parsing, caps, command parsing)
  — fixture file `chat-relay.json`.
  TEST-SIDE PARITY REFERENCE — delegates to `Afterlight.Social.Parser`.
  """

  @behaviour Afterlight.Parity.Reference

  alias Afterlight.Social.Parser

  @impl true
  def run_case_fn("cleanText", [text], _now_ms) do
    Parser.clean_text(text)
  end

  def run_case_fn("parseChat", [raw_text], _now_ms) do
    Parser.parse(raw_text, %{})
  end

  def run_case_fn("parseChat", [raw_text, opts], _now_ms) do
    Parser.parse(raw_text, opts || %{})
  end

  def run_case_fn(_other, _args, _now_ms), do: nil
end
