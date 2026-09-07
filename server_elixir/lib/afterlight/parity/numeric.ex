defmodule Afterlight.Parity.Numeric do
  @moduledoc """
  JavaScript numeric parity primitives (`Math.round`, `Number(x.toFixed(3))`,
  `Number(x)` coercion). Used by economy/garden/restoration ports and the
  parity harness.
  """

  @doc """
  JS `Math.round`: `floor(x + 0.5)` — half toward +Infinity.
  """
  def js_round(x) when is_float(x) or is_integer(x) do
    :math.floor(x + 0.5)
  end

  @doc """
  JS `Number(x.toFixed(3))`: format the exact binary double with three
  decimals and parse back.
  """
  def js_to_fixed_3(x) when is_float(x) or is_integer(x) do
    String.to_float(:erlang.float_to_binary(x * 1.0, decimals: 3))
  end

  @doc """
  JS `Number(x)` coercion subset relevant to parity ports.
  """
  def js_to_number(n) when is_number(n), do: n
  def js_to_number(:absent), do: :nan
  def js_to_number(""), do: 0

  def js_to_number(<<char, rest::binary>>) when char in [?\s, ?\t, ?\n, ?\r] do
    case String.trim(rest) do
      "" -> 0
      _ -> js_parse(rest)
    end
  end

  def js_to_number(value) when is_binary(value), do: js_parse(value)
  def js_to_number(nil), do: 0
  def js_to_number(true), do: 1
  def js_to_number(false), do: 0
  def js_to_number(_), do: :nan

  defp js_parse("0x" <> hex) do
    case Integer.parse(hex, 16) do
      {n, ""} -> n
      _ -> :nan
    end
  end

  defp js_parse(value) do
    trimmed = String.trim(value)

    case Float.parse(trimmed) do
      {f, ""} ->
        if f == trunc(f) and not (trimmed =~ "." or trimmed =~ "e" or trimmed =~ "E") do
          trunc(f)
        else
          f
        end

      _ ->
        :nan
    end
  end

  @max_unit 1_000_000_000
  @max_order_value 1_000_000_000_000

  def coerce_integer(n) when is_integer(n) do
    if n >= 0 and n <= @max_unit, do: {:ok, n}, else: {:error, :out_of_range}
  end

  def coerce_integer(n) when is_float(n) do
    if n >= 0 and n <= @max_unit * 1.0 and n == trunc(n) do
      {:ok, trunc(n)}
    else
      {:error, :invalid_integer}
    end
  end

  def coerce_integer(_), do: {:error, :invalid_integer}

  def guard_order_params(price, quantity) do
    with {:ok, p} <- coerce_integer(price),
         {:ok, q} <- coerce_integer(quantity),
         true <- p > 0,
         true <- q > 0,
         true <- p * q <= @max_order_value do
      {:ok, {p, q}}
    else
      false -> {:error, :invalid_order_params}
      {:error, _} = err -> err
    end
  end
end
