defmodule Afterlight.LogScrubberTest do
  use ExUnit.Case, async: true

  alias Afterlight.LogFormatter
  alias Afterlight.LogScrubber

  @guest_token "eyJhbGciOiJIUzI1NiJ9.eyJndWVzdElkIjoiZ3Vlc3RfMSJ9.signedsegmentvalue"
  @turn_secret "turn_secret=super-turn-credential-value-12345"
  @dm_body ~s(private_message="please do not log this secret chat body")

  test "deny-list patterns redact adversarial fixtures" do
    fixtures = [
      "connect token=#{@guest_token}",
      "Authorization: Bearer #{@guest_token}",
      @turn_secret,
      "media_grant_secret=afterlight-media-grant-dev-secret-change-in-prod",
      @dm_body,
      ~s({"text":"private hello world"})
    ]

    for fixture <- fixtures do
      scrubbed = LogScrubber.scrub(fixture)
      refute scrubbed =~ @guest_token
      refute scrubbed =~ "please do not log this secret chat body"
      refute scrubbed =~ "super-turn-credential-value"
      assert scrubbed =~ "[REDACTED]"
    end
  end

  test "formatter output never contains token or private message bodies" do
    message =
      LogFormatter.format(
        :info,
        "guest_token=#{@guest_token} #{@dm_body}",
        {{2026, 9, 7}, {12, 0, 0, 0}},
        token: @guest_token,
        private_message: "dm payload",
        room: "theater",
        revision: 4,
        epoch: 2
      )

    refute message =~ @guest_token
    refute message =~ "dm payload"
    assert message =~ "room=\"theater\""
    assert message =~ "revision=4"
    assert message =~ "epoch=2"
  end

  test "metadata scrubber redacts sensitive keys but keeps correlation fields" do
    metadata =
      LogScrubber.scrub_metadata(
        room: "market",
        revision: 10,
        epoch: 3,
        request_id: "req-1",
        token: @guest_token,
        text: "secret chat"
      )

    assert metadata[:room] == "market"
    assert metadata[:revision] == 10
    assert metadata[:request_id] == "req-1"
    assert metadata[:token] == "[REDACTED]"
    assert metadata[:text] == "[REDACTED]"
  end
end
