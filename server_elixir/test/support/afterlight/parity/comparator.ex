defmodule Afterlight.Parity.Comparator do
  @moduledoc """
  Fixture comparator: two-sided structural unification with threaded bindings.

  Rules (see `Afterlight.Parity` moduledoc):
  * numbers compare by value (int vs float unify; floats tolerate 1e-9
    relative error so JS shortest-round-trip and Elixir float formatting
    agree),
  * expected `"<gen:N>"` binds to the actual generated id at the matching
    position; bindings persist per case and the same real id must always
    map to the same token,
  * expected `"<generated>"` matches any binary,
  * maps are key-order-insensitive; lists are order-sensitive,
  * `%{"__strLen" => n}` (args only) materializes a string of length n.

  Protocol: `compare/6` and `materialize_arg/3` return `{:ok, bindings}` on
  success (possibly extended bindings) or `{:mismatch, detail}`.
  """

  alias Afterlight.Parity.Hazards

  @float_tol 1.0e-9

  # -- arg materialization ---------------------------------------------------

  @doc "Resolves tokens/__strLen in an arg, returning {:ok, value, bindings}."
  def materialize_arg(value, module, bindings) do
    case do_materialize(value, module, bindings) do
      {value2, bindings2} -> {:ok, value2, bindings2}
      {:mismatch, _} = mismatch -> mismatch
    end
  end

  # Internal protocol: {value, bindings} 2-tuples; mismatches throw
  # {:token_error, detail} which the runner converts to a case failure.

  defp do_materialize(%{"__strLen" => n} = v, _module, bindings)
       when is_integer(n) and map_size(v) == 1 do
    {String.duplicate("x", n), bindings}
  end

  defp do_materialize(value, module, bindings) when is_binary(value) do
    cond do
      token?(value) and String.starts_with?(value, "<gen:") ->
        case :maps.find(value, bindings) do
          {:ok, real} ->
            {real, bindings}

          :error ->
            if Hazards.generated_id?(module, value) do
              # Deterministic placeholder, distinct per token so input ids
              # never collide.
              placeholder = Hazards.placeholder_for(value)
              {placeholder, :maps.put(value, placeholder, bindings)}
            else
              throw({:token_error, "token #{value} referenced but module has no generated-id format"})
            end
        end

      true ->
        {value, bindings}
    end
  end

  defp do_materialize(value, module, bindings) when is_list(value) do
    Enum.map_reduce(value, bindings, &do_materialize(&1, module, &2))
  end

  defp do_materialize(value, module, bindings) when is_map(value) do
    {pairs, bindings2} =
      Enum.map_reduce(value, bindings, fn {k, v}, b ->
        {v2, b2} = do_materialize(v, module, b)
        {{k, v2}, b2}
      end)

    {:maps.from_list(pairs), bindings2}
  end

  defp do_materialize(value, _module, bindings), do: {value, bindings}

  # -- comparison -------------------------------------------------------------

  @doc "Compares expected (fixture JSON) against actual (port result)."
  def compare(expected, actual, module, bindings, where, depth \\ 0)

  def compare(expected, actual, module, bindings, where, depth)
      when is_binary(expected) and is_binary(actual) do
    cond do
      expected == actual ->
        {:ok, bindings}

      token?(expected) and String.starts_with?(expected, "<gen:") ->
        case :maps.find(expected, bindings) do
          {:ok, ^actual} ->
            {:ok, bindings}

          {:ok, other} ->
            {:mismatch,
             "#{where}: token #{expected} bound to #{inspect(other)} but actual is #{inspect(actual)} (depth #{depth})"}

          :error ->
            if Hazards.generated_id?(module, actual) do
              {:ok, :maps.put(expected, actual, bindings)}
            else
              {:mismatch,
               "#{where}: expected token #{expected}, got #{inspect(actual)} which matches no generated-id format (depth #{depth})"}
            end
        end

      expected == "<generated>" ->
        {:ok, bindings}

      true ->
        {:mismatch, "#{where}: expected #{inspect(expected)}, got #{inspect(actual)} (depth #{depth})"}
    end
  end

  def compare(expected, actual, _module, bindings, where, depth)
      when is_number(expected) and is_number(actual) do
    if numbers_match?(expected, actual) do
      {:ok, bindings}
    else
      {:mismatch, "#{where}: expected #{expected}, got #{actual} (depth #{depth})"}
    end
  end

  def compare(expected, actual, module, bindings, where, depth)
      when is_list(expected) and is_list(actual) do
    if length(expected) != length(actual) do
      {:mismatch, "#{where}: list length #{length(expected)} != #{length(actual)} (depth #{depth})"}
    else
      fold(expected, actual, module, bindings, where, depth)
    end
  end

  def compare(expected, actual, module, bindings, where, depth)
      when is_map(expected) and is_map(actual) do
    missing = expected |> Map.keys() |> MapSet.new() |> MapSet.difference(actual |> Map.keys() |> MapSet.new())
    extra = actual |> Map.keys() |> MapSet.new() |> MapSet.difference(expected |> Map.keys() |> MapSet.new())

    if MapSet.size(missing) > 0 or MapSet.size(extra) > 0 do
      {:mismatch,
       "#{where}: map keys differ (missing=#{inspect(MapSet.to_list(missing))}, extra=#{inspect(MapSet.to_list(extra))} at depth #{depth})"}
    else
      Enum.reduce_while(expected, {:ok, bindings}, fn {k, ev}, {:ok, b} ->
        case compare(ev, Map.fetch!(actual, k), module, b, where <> "." <> to_string(k), depth + 1) do
          {:ok, b2} -> {:cont, {:ok, b2}}
          {:mismatch, _} = m -> {:halt, m}
        end
      end)
    end
  end

  def compare(nil, nil, _m, bindings, _w, _d), do: {:ok, bindings}
  def compare(true, true, _m, bindings, _w, _d), do: {:ok, bindings}
  def compare(false, false, _m, bindings, _w, _d), do: {:ok, bindings}

  def compare(expected, actual, _module, _bindings, where, depth) do
    {:mismatch, "#{where}: expected #{inspect(expected)}, got #{inspect(actual)} (depth #{depth})"}
  end

  defp fold(expected, actual, module, bindings, where, depth) do
    expected
    |> Enum.zip(actual)
    |> Enum.reduce_while({:ok, bindings}, fn {e, a}, {:ok, b} ->
      case compare(e, a, module, b, where, depth + 1) do
        {:ok, b2} -> {:cont, {:ok, b2}}
        {:mismatch, _} = m -> {:halt, m}
      end
    end)
  end

  defp numbers_match?(expected, actual) do
    e = to_float(expected)
    a = to_float(actual)
    abs(e - a) <= @float_tol * max(1.0, max(abs(e), abs(a)))
  end

  defp to_float(n) when is_integer(n), do: n * 1.0
  defp to_float(n) when is_float(n), do: n

  defp token?(value), do: String.starts_with?(value, "<gen:") or value == "<generated>"
end
