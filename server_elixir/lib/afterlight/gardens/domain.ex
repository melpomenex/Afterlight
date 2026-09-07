defmodule Afterlight.Gardens.Domain do
  @moduledoc "Ash domain for garden persistence (`gardens`, `beds`, `sprinklers`)."

  use Ash.Domain, otp_app: :afterlight

  resources do
    resource Afterlight.Gardens.Garden
    resource Afterlight.Gardens.Bed
    resource Afterlight.Gardens.Sprinkler
  end
end
