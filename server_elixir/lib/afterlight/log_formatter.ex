defmodule Afterlight.LogFormatter do
  @moduledoc false

  @metadata_keys ~w(request_id room revision epoch player_id)a

  def format(level, message, timestamp, metadata) do
    message = Afterlight.LogScrubber.scrub(format_message(message))

    metadata =
      metadata
      |> Afterlight.LogScrubber.scrub_metadata()
      |> Enum.filter(fn {key, _value} -> key in @metadata_keys end)

    time = format_time(timestamp)

    meta =
      case metadata do
        [] -> ""
        list -> " " <> format_metadata(list)
      end

    "#{time}#{meta} [#{level}] #{message}\n"
  end

  defp format_time({{year, month, day}, {hour, minute, second, millisecond}}) do
    "#{year}-#{pad(month, 2)}-#{pad(day, 2)} #{pad(hour, 2)}:#{pad(minute, 2)}:#{pad(second, 2)}.#{pad(millisecond, 3)}"
  end

  defp format_metadata(metadata) do
    metadata
    |> Enum.map(fn {key, value} -> "#{key}=#{inspect(value)}" end)
    |> Enum.join(" ")
  end

  defp pad(value, width) do
    value
    |> Integer.to_string()
    |> String.pad_leading(width, "0")
  end

  defp format_message({:string, text}) when is_binary(text), do: text
  defp format_message(message) when is_binary(message), do: message
  defp format_message(message), do: IO.iodata_to_binary(message)
end
