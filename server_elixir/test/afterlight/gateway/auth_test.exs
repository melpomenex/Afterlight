defmodule Afterlight.Gateway.AuthTest do
  use ExUnit.Case, async: false

  alias Afterlight.Gateway.Auth
  alias Afterlight.Gateway.Sessions

  describe "validate_guest/1" do
    test "accepts guestId with optional nickname" do
      assert {:ok, %{guest_id: "guest_abc", nickname_hint: "Fern"}} =
               Auth.validate_guest(%{"guestId" => "guest_abc", "nickname" => "Fern"})

      assert {:ok, %{guest_id: "guest_abc", nickname_hint: nil}} =
               Auth.validate_guest(%{"guestId" => "guest_abc"})
    end

    test "rejects missing / empty / oversized / non-printable guestId" do
      assert :error = Auth.validate_guest(%{})
      assert :error = Auth.validate_guest(%{"guestId" => ""})
      assert :error = Auth.validate_guest(%{"guestId" => String.duplicate("a", 65)})
      assert :error = Auth.validate_guest(%{"guestId" => "ok\u0000nul"})
      assert :error = Auth.validate_guest(%{"guestId" => 42})
    end

    test "accepts guestId of exactly 64 bytes" do
      assert {:ok, %{guest_id: g}} = Auth.validate_guest(%{"guestId" => String.duplicate("a", 64)})
      assert byte_size(g) == 64
    end

    test "rejects oversized / non-printable / non-string nickname" do
      assert :error = Auth.validate_guest(%{"guestId" => "g", "nickname" => String.duplicate("a", 41)})
      assert :error = Auth.validate_guest(%{"guestId" => "g", "nickname" => "bad\u0007bell"})
      assert :error = Auth.validate_guest(%{"guestId" => "g", "nickname" => []})
    end

    test "rejects non-map payloads" do
      assert :error = Auth.validate_guest("guest_abc")
      assert :error = Auth.validate_guest(nil)
      assert :error = Auth.validate_guest([{"guestId", "g"}])
    end
  end

  describe "issue/3 + verify/2" do
    setup do
      # Deterministic token secret is pinned by test.exs.
      {:ok, issued} = Auth.issue("guest_auth_roundtrip", "Fern")
      %{issued: issued}
    end

    test "issue returns token, guest id and configured TTL", %{issued: issued} do
      assert issued.token == issued.token
      assert issued.guest_id == "guest_auth_roundtrip"
      assert issued.expires_in == Auth.token_max_age_secs()
      assert is_binary(issued.token)
    end

    test "issue records a transient token => guest_id entry (ETS, no DB)", %{issued: issued} do
      assert Sessions.lookup_token(issued.token) == {:ok, "guest_auth_roundtrip"}
      Sessions.delete_token(issued.token)
      assert Sessions.lookup_token(issued.token) == :error
    end

    test "verify returns the claims; identity comes only from the claim", %{issued: issued} do
      assert {:ok, claims} = Auth.verify(issued.token)
      assert claims.guest_id == "guest_auth_roundtrip"
      assert claims.nickname_hint == "Fern"
      assert is_integer(claims.issued_at)
    end

    test "verify rejects garbage / wrong-salt / tampered tokens" do
      assert {:error, _} = Auth.verify("not-a-token")
      assert {:error, _} = Auth.verify("g2gDZA" <> Base.encode64("junk"))

      # A token signed with a DIFFERENT secret must not verify.
      foreign = Phoenix.Token.sign("foreign-secret-at-least-twenty-bytes", "afterlight guest token v1", %{guest_id: "x"})
      assert {:error, _} = Auth.verify(foreign)
    end

    test "verify rejects tokens without a guest_id claim" do
      # Same signing context, same salt — but no guest_id in the claims.
      token =
        Phoenix.Token.sign(Auth.signing_context(), "afterlight guest token v1", %{nope: true})

      assert {:error, :invalid} = Auth.verify(token)
    end

    test "expired tokens are refused (backdated beyond max_age)" do
      back = System.system_time(:second) - 120

      {:ok, issued} = Auth.issue("guest_expired", nil, signed_at: back)

      assert {:error, :expired} = Auth.verify(issued.token, max_age: 60)
      # and the configured TTL applies by default
      assert {:ok, _claims} = Auth.verify(issued.token, max_age: 43_200)
    end

    test "token_max_age_secs falls back to 12h on bad config" do
      :ok =
        GatewayTest.ConfigLock.with_lock(:token_max_age_secs, "garbage", fn ->
          assert Auth.token_max_age_secs() == 43_200
          :ok
        end)
    end
  end
end
