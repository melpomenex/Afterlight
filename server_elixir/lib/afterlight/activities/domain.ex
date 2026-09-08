defmodule Afterlight.Activities.Domain do
  @moduledoc """
  Ash domain for durable activity results (task 3.9, design D8).

  Rows are written only through the fenced server-side completion path
  (`Afterlight.Activities.Results` / `CompletionRecorder`); clients have no
  create action, so submitted scores can never become ranked entries.
  """

  use Ash.Domain, otp_app: :afterlight

  resources do
    resource(Afterlight.Activities.ArcadeRun)
    resource(Afterlight.Activities.ActivityMatch)
  end
end
