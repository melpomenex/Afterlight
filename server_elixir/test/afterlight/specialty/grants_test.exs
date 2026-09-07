defmodule Afterlight.Specialty.GrantsTest do
  use ExUnit.Case, async: true

  alias Afterlight.Specialty.Grants

  @infohash "08ada5a7a6183aae1e09d831df6748d566095a10"
  @participant "guest_test_player"
  @secret "test-torrent-grant-secret-000000000000000000"
  @other_secret "rotated-torrent-grant-secret-00000000000"

  setup do
    prev = Application.get_env(:afterlight, :torrent_grant_secret)
    prev_env = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET")
    prev_prev = System.get_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")
    Application.put_env(:afterlight, :torrent_grant_secret, @secret)
    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", @secret)
    System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")

    on_exit(fn ->
      Application.put_env(:afterlight, :torrent_grant_secret, prev)

      case prev_env do
        nil -> System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET")
        val -> System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", val)
      end

      case prev_prev do
        nil -> System.delete_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS")
        val -> System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS", val)
      end
    end)

    :ok
  end

  test "mint and verify a grant for the requested file" do
    now_ms = 1_700_000_000_000

    assert {:ok, info} =
             Grants.mint(@participant, @infohash, 2, now_ms: now_ms, ttl_secs: 300)

    assert is_binary(info.grant)
    refute info.grant =~ @secret
    refute Jason.encode!(info) =~ @secret

    now_sec = div(now_ms, 1000) + 60

    assert {:ok, claims} =
             Grants.verify(info.grant, @infohash, 2,
               secrets: [@secret],
               now_sec: now_sec
             )

    assert claims["participant"] == @participant
    assert claims["fileIndex"] == 2
  end

  test "re-mint inside the TTL produces a working grant" do
    now_ms = 1_700_000_000_000

    assert {:ok, first} = Grants.mint(@participant, @infohash, 0, now_ms: now_ms)
    assert {:ok, second} = Grants.re_mint(@participant, @infohash, 0, now_ms: now_ms + 200_000)

    refute first.grant == second.grant

    assert {:ok, _} =
             Grants.verify(second.grant, @infohash, 0,
               secrets: [@secret],
               now_sec: div(now_ms + 200_000, 1000) + 60
             )
  end

  test "signature tampering is rejected" do
    {:ok, info} = Grants.mint(@participant, @infohash, 0)
    [payload, _sig] = String.split(info.grant, ".")
    tampered = payload <> ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

    assert {:error, :invalid_signature} =
             Grants.verify(tampered, @infohash, 0, secrets: [@secret])
  end

  test "expired token is rejected" do
    now_ms = 1_700_000_000_000
    {:ok, info} = Grants.mint(@participant, @infohash, 0, now_ms: now_ms, ttl_secs: 60)

    assert {:error, :expired} =
             Grants.verify(info.grant, @infohash, 0,
               secrets: [@secret],
               now_sec: div(now_ms, 1000) + 120
             )
  end

  test "missing fields and unknown version are rejected" do
    claims = %{"v" => 99, "infohash" => @infohash, "fileIndex" => 0, "participant" => @participant, "exp" => 9_999_999_999}
    payload = Base.url_encode64(Jason.encode!(claims), padding: false)
    sig = Base.url_encode64(:crypto.mac(:hmac, :sha256, @secret, payload), padding: false)
    token = payload <> "." <> sig

    assert {:error, :unknown_version} = Grants.verify(token, @infohash, 0, secrets: [@secret])

    bad = %{"v" => 1, "infohash" => @infohash, "fileIndex" => 0, "exp" => 9_999_999_999}
    payload2 = Base.url_encode64(Jason.encode!(bad), padding: false)
    sig2 = Base.url_encode64(:crypto.mac(:hmac, :sha256, @secret, payload2), padding: false)

    assert {:error, :missing_fields} =
             Grants.verify(payload2 <> "." <> sig2, @infohash, 0, secrets: [@secret])
  end

  test "wrong file and dual-secret rotation window" do
    {:ok, info} = Grants.mint(@participant, @infohash, 1)

    assert {:error, :wrong_file} = Grants.verify(info.grant, @infohash, 2, secrets: [@secret])
    assert {:error, :wrong_file} =
             Grants.verify(info.grant, String.duplicate("a", 40), 1, secrets: [@secret])

    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET", @other_secret)
    System.put_env("AFTERLIGHT_TORRENT_GRANT_SECRET_PREVIOUS", @secret)

    assert {:ok, _} = Grants.verify(info.grant, @infohash, 1, now_sec: div(System.system_time(:millisecond), 1000))
  end

  test "should_re_mint? fires in the 50–80% TTL window" do
    now_ms = 1_700_000_000_000
    {:ok, info} = Grants.mint(@participant, @infohash, 0, now_ms: now_ms, ttl_secs: 300)

    refute Grants.should_re_mint?(info.expires_at_ms, now_ms + 60_000)
    assert Grants.should_re_mint?(info.expires_at_ms, now_ms + 200_000)
  end
end
