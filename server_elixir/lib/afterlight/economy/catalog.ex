defmodule Afterlight.Economy.Catalog do
  @moduledoc """
  Sellable goods catalog: processed goods from `shared/materials.js`.
  Crops live in `Afterlight.Gardens.Crops`.
  """

  @goods %{
    "flour" => %{
      "id" => "flour",
      "name" => "Stone-Ground Flour",
      "tagline" => "Fine milled flour from the Great Mill. Bakers pay a premium.",
      "basePrice" => 14
    }
  }

  @good_list Map.values(@goods)

  def goods, do: @goods
  def good_list, do: @good_list
  def get(good_id), do: Map.get(@goods, good_id)

  def get_sellable(good_id) do
    Afterlight.Gardens.Crops.get(good_id) || get(good_id)
  end
end
