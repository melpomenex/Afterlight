defmodule Afterlight.World.Fence do
  @moduledoc """
  In-transaction durable mutation fencing (design D2).

  Wraps `Repo.transaction` blocks with a lease check so no durable room
  mutation commits without a current owner/epoch/unexpired lease.
  """

  alias Afterlight.Repo
  alias Afterlight.World.Lease

  @doc """
  Run `fun.(repo)` inside a transaction after verifying the lease handle.
  Returns `{:error, :lease_lost}` when fenced or expired.
  """
  @spec transaction(Lease.Handle.t(), (Ecto.Repo.t() -> term())) :: {:ok, term} | {:error, term}
  def transaction(handle, fun) when is_function(fun, 1) do
    if handle.fenced do
      {:error, :lease_lost}
    else
      Repo.transaction(fn repo ->
        case Lease.verify_in_transaction(handle, repo) do
          :ok -> fun.(repo)
          {:error, :lease_lost} -> repo.rollback(:lease_lost)
        end
      end)
      |> normalize_result()
    end
  end

  @doc "Gateway-side check before relaying a durable command (no transaction yet)."
  @spec allows_command?(Lease.Handle.t() | nil) :: boolean
  def allows_command?(handle) do
    if lease_fencing_enabled?(), do: allows_command_fenced?(handle), else: true
  end

  defp allows_command_fenced?(nil), do: false
  defp allows_command_fenced?(%{fenced: true}), do: false
  defp allows_command_fenced?(%Lease.Handle{}), do: true

  defp lease_fencing_enabled? do
    Application.get_env(:afterlight, :world, [])
    |> Keyword.get(:lease_fencing, true)
    |> Kernel.===(true)
  end

  defp normalize_result({:ok, value}), do: {:ok, value}
  defp normalize_result({:error, :lease_lost}), do: {:error, :lease_lost}
  defp normalize_result({:error, {:lease_lost, _}}), do: {:error, :lease_lost}
  defp normalize_result({:error, other}), do: {:error, other}
end
