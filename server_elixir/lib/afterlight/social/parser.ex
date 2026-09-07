defmodule Afterlight.Social.Parser do
  @moduledoc """
  Pure parser, caps, and sanitization for Afterlight chat.

  Ports the pure portions of `server/chat.js` for `Afterlight.Social`:
    * `clean_text/1`: control-character strip set (`[\\x00-\\x08\\x0B-\\x1F\\x7F]`),
      whitespace collapse (`[\\r\\n\\t]+` to single space), and trimming.
    * raw character limit (600 characters max) and sanitized character limit (400 characters max).
    * Command parsing: `/me`, `/msg`, `/query`, `/help`, and unknown commands.
    * Target matching for DMs: online players (case-insensitive, not self),
      IRC nicks (case-insensitive, not self), absent target.
    * Byte-for-byte identical error and help strings.
  """

  @chat_hard_limit 600
  @chat_max_chars 400
  @default_channel "#afterlight"

  def chat_hard_limit, do: @chat_hard_limit
  def chat_max_chars, do: @chat_max_chars
  def default_channel, do: @default_channel

  @doc """
  Sanitizes text by stripping control characters (`[\\x00-\\x08\\x0B-\\x1F\\x7F]`),
  collapsing `[\\r\\n\\t]+` runs to a single space, and trimming leading/trailing whitespace.
  Non-binary or nil inputs are converted to string.
  """
  def clean_text(nil), do: ""

  def clean_text(text) when is_binary(text) do
    text
    |> String.replace(~r/[\x00-\x08\x0B-\x1F\x7F]/u, "")
    |> String.replace(~r/[\r\n\t]+/u, " ")
    |> String.trim()
  end

  def clean_text(text), do: text |> to_string() |> clean_text()

  @doc """
  Measures string length in UTF-16 code units (matching JavaScript `string.length`).
  """
  def utf16_length(str) when is_binary(str) do
    case :unicode.characters_to_binary(str, :utf8, {:utf16, :big}) do
      binary when is_binary(binary) -> div(byte_size(binary), 2)
      _ -> String.length(str)
    end
  end

  def utf16_length(_), do: 0

  @doc """
  Slices a UTF-8 string to at most `max_units` UTF-16 code units
  (matching JavaScript `string.slice(0, max_units)`).
  """
  def utf16_slice(str, max_units) when is_binary(str) do
    utf16 = :unicode.characters_to_binary(str, :utf8, {:utf16, :big})
    total_units = div(byte_size(utf16), 2)

    if total_units <= max_units do
      str
    else
      part = binary_part(utf16, 0, max_units * 2)

      case :unicode.characters_to_binary(part, {:utf16, :big}, :utf8) do
        res when is_binary(res) -> res
        {:incomplete, converted, _} -> converted
        {:error, converted, _} -> converted
      end
    end
  end

  @doc """
  Parses a raw chat submission.

  Options can be a map or keyword list with:
    * `:sender` or `"sender"`: current sender's nickname
    * `:players` or `"players"`: list of other online player nicknames
    * `:irc_nicks` or `"ircNicks"`: list of online IRC nicknames

  Returns a string-keyed map matching the wire/parity outcome:
    * `%{"kind" => "message", "text" => clean}`
    * `%{"kind" => "me", "text" => action}`
    * `%{"kind" => "dm", "target" => matched_nick, "targetKind" => "player" | "irc", "text" => body}`
    * `%{"kind" => "help", "text" => help_text}`
    * `%{"error" => error_message}`
  """
  def parse(raw_text, opts \\ %{})

  def parse(raw_text, opts) when is_list(opts) do
    parse(raw_text, Map.new(opts))
  end

  def parse(raw_text, opts) when is_map(opts) do
    text = if is_binary(raw_text), do: raw_text, else: ""

    sender = get_opt(opts, [:sender, "sender"], "")
    players = get_opt(opts, [:players, "players"], [])
    irc_nicks = get_opt(opts, [:irc_nicks, "ircNicks", :ircNicks, "irc_nicks"], [])

    cond do
      String.trim(text) == "" ->
        %{"error" => "Say something first."}

      utf16_length(text) > @chat_hard_limit ->
        %{"error" => "That message is too long (#{@chat_max_chars} characters max)."}

      true ->
        clean = text |> clean_text() |> utf16_slice(@chat_max_chars)

        if clean == "" do
          %{"error" => "Say something first."}
        else
          if String.starts_with?(clean, "/") do
            parse_command(clean, sender, players, irc_nicks)
          else
            %{"kind" => "message", "text" => clean}
          end
        end
    end
  end

  defp parse_command(clean, sender, players, irc_nicks) do
    {command, args} =
      case String.split(clean, " ", parts: 2) do
        [cmd, rest] -> {String.downcase(cmd), String.trim(rest)}
        [cmd] -> {String.downcase(cmd), ""}
      end

    case command do
      "/me" ->
        if args == "" do
          %{"error" => "Usage: /me <action>"}
        else
          %{"kind" => "me", "text" => args}
        end

      cmd when cmd in ["/msg", "/query"] ->
        {target, body} =
          case String.split(args, " ", parts: 2) do
            [t, b] -> {t, String.trim(b)}
            [t] -> {t, ""}
          end

        if target == "" or body == "" do
          %{"error" => "Usage: /msg <name> <message>"}
        else
          sender_lower = String.downcase(sender)
          target_lower = String.downcase(target)

          # Another online player (case-insensitive, not self)?
          matched_player =
            Enum.find(players, fn p ->
              String.downcase(p) == target_lower and String.downcase(p) != sender_lower
            end)

          if matched_player do
            %{"kind" => "dm", "target" => matched_player, "targetKind" => "player", "text" => body}
          else
            # External IRC connection (case-insensitive, not self)?
            matched_irc =
              Enum.find(irc_nicks, fn n ->
                String.downcase(n) == target_lower and String.downcase(n) != sender_lower
              end)

            if matched_irc do
              %{"kind" => "dm", "target" => matched_irc, "targetKind" => "irc", "text" => body}
            else
              %{"error" => "No one called #{target} is around right now."}
            end
          end
        end

      "/help" ->
        %{
          "kind" => "help",
          "text" => "Commands: /msg <name> <text> whispers directly · /me <action> acts it out."
        }

      _other ->
        %{"error" => "Unknown command #{command}. Try /msg <name> <text> or /me <action>."}
    end
  end

  defp get_opt(map, keys, default) do
    Enum.find_value(keys, default, fn k ->
      case Map.fetch(map, k) do
        {:ok, val} -> val
        :error -> nil
      end
    end)
  end
end
