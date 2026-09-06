# BEAM-side encode benchmark for the realtime data plane.
# Implements docs/architecture/realtime/contract.md §3 (frame layout), §6
# (server layering target), §8 (methodology). Standalone .exs until the P1
# Mix app exists — no deps. Uses the built-in `JSON` module (Elixir >= 1.18);
# if absent the JSON arms are skipped honestly.
#
# Run:  cd benchmarks/realtime && elixir beam/bench_encode.exs
#
# Arms per fixture (results/fixtures-for-beam/N*_f*.json):
#   1. json_encode            JSON.encode of the prebuilt presence_update map
#   2. json_build_and_encode  rebuild presence_update from columns + encode
#                             (full Encoders.JSON reference path)
#   3. soa_binary             afterlight-soa-v1 DELTA frame as one flat binary
#                             (24B header + transform SORTED_IDS + flags SORTED_IDS)
#   4. iodata_build / iodata_flatten  deep-list construction a room process
#                             does before ONE IO dispatch, vs final flattening
#   5. fanout                 encode-once + List.duplicate to K clients
#                             vs encoding per client, K ∈ {1,10,100,200}
#   6. reductions + memory observations
#
# Machine note: other agents run concurrently — MIN is the comparable
# statistic, median reported alongside (contract §8).

defmodule Afterlight.Bench do
  @moduledoc false

  @magic 0x414C_5254 # "ALRT"
  @proto_v0 1
  @frame_type_delta 1
  @sec_transform 3
  @sec_flags 6
  @enc_sorted_ids 1
  @warmup 3
  @runs 20

  # ---------------------------------------------------------------------------
  # Encoders.BinarySoA reference implementation (contract §3).
  # DELTA frame = 24-byte header + transform section (SORTED_IDS: ascending u32
  # ids, then x/y/z/yaw f32 little-endian columns) + flags section (ids + u8s).
  # ---------------------------------------------------------------------------

  def encode_delta_soa(ids, xs, ys, zs, yaws, flags, epoch, tick, seq, baseline) do
    ids = Enum.sort(ids) # SORTED_IDS: ascending (cheap on sorted fixture input)
    count = length(ids)
    ids_bin = for id <- ids, into: <<>>, do: <<id::little-size(32)>>
    x_bin = for v <- xs, into: <<>>, do: <<v::little-float-size(32)>>
    y_bin = for v <- ys, into: <<>>, do: <<v::little-float-size(32)>>
    z_bin = for v <- zs, into: <<>>, do: <<v::little-float-size(32)>>
    yaw_bin = for v <- yaws, into: <<>>, do: <<v::little-float-size(32)>>
    flags_bin = for v <- flags, into: <<>>, do: <<v::size(8)>>
    tf_len = 4 * count + 16 * count
    fl_len = 4 * count + count

    <<
      # header, 24 bytes
      @magic::little-size(32),
      @proto_v0::size(8),
      @frame_type_delta::size(8),
      0::size(8),
      24::size(8),
      epoch::little-size(32),
      tick::little-size(32),
      seq::little-size(32),
      baseline::little-size(32),
      # transform section
      @sec_transform::size(8),
      @enc_sorted_ids::size(8),
      0::size(16),
      count::little-size(32),
      tf_len::little-size(32),
      ids_bin::binary,
      x_bin::binary,
      y_bin::binary,
      z_bin::binary,
      yaw_bin::binary,
      # flags section
      @sec_flags::size(8),
      @enc_sorted_ids::size(8),
      0::size(16),
      count::little-size(32),
      fl_len::little-size(32),
      ids_bin::binary,
      flags_bin::binary
    >>
  end

  # Same frame as iodata: what a room process builds before ONE IO dispatch.
  def encode_delta_soa_iodata(ids, xs, ys, zs, yaws, flags, epoch, tick, seq, baseline) do
    ids = Enum.sort(ids)
    count = length(ids)
    ids_bin = for id <- ids, into: <<>>, do: <<id::little-size(32)>>
    x_bin = for v <- xs, into: <<>>, do: <<v::little-float-size(32)>>
    y_bin = for v <- ys, into: <<>>, do: <<v::little-float-size(32)>>
    z_bin = for v <- zs, into: <<>>, do: <<v::little-float-size(32)>>
    yaw_bin = for v <- yaws, into: <<>>, do: <<v::little-float-size(32)>>
    flags_bin = for v <- flags, into: <<>>, do: <<v::size(8)>>
    tf_len = 4 * count + 16 * count
    fl_len = 4 * count + count

    header = <<
      @magic::little-size(32),
      @proto_v0::size(8),
      @frame_type_delta::size(8),
      0::size(8),
      24::size(8),
      epoch::little-size(32),
      tick::little-size(32),
      seq::little-size(32),
      baseline::little-size(32)
    >>

    tf_hdr = <<@sec_transform::size(8), @enc_sorted_ids::size(8), 0::size(16), count::little-size(32), tf_len::little-size(32)>>
    fl_hdr = <<@sec_flags::size(8), @enc_sorted_ids::size(8), 0::size(16), count::little-size(32), fl_len::little-size(32)>>

    [header, tf_hdr, ids_bin, x_bin, y_bin, z_bin, yaw_bin, fl_hdr, ids_bin, flags_bin]
  end

  # ---------------------------------------------------------------------------
  # Encoders.JSON reference implementation (contract §6): presence_update shape,
  # string guest ids, protocol-catalog §1 field names.
  # ---------------------------------------------------------------------------

  def encode_presence_map(ids, guest_ids, xs, zs, yaws, flags) do
    players =
      Enum.zip([ids, guest_ids, xs, zs, yaws, flags])
      |> Enum.map(fn {_id, gid, x, z, yaw, fl} ->
        %{
          "id" => gid,
          "x" => js_num(Float.round(x, 3)),
          "z" => js_num(Float.round(z, 3)),
          "rotY" => js_num(Float.round(yaw, 3)),
          "walking" => rem(fl, 2) == 1,
          "sitting" => rem(fl, 4) >= 2,
          "airborne" => fl >= 4
        }
      end)

    %{"type" => "presence_update", "players" => players}
  end

  # JS serializes whole-valued numbers without a decimal point; match that so
  # the rebuilt map has the same JSON byte shape as the Node-produced one.
  defp js_num(v) when is_integer(v), do: v

  defp js_num(v) do
    t = trunc(v)
    if v == t * 1.0, do: t, else: v
  end

  # ---------------------------------------------------------------------------
  # Harness
  # ---------------------------------------------------------------------------

  def time_it(fun) do
    for _ <- 1..@warmup, do: fun.()

    samples =
      for _ <- 1..@runs do
        {t, _res} = :timer.tc(fun)
        t
      end

    s = Enum.sort(samples)

    %{
      median_us: Enum.fetch!(s, div(@runs, 2)),
      p95_us: Enum.fetch!(s, min(@runs - 1, ceil(@runs * 0.95) - 1)),
      min_us: hd(s)
    }
  end

  def reductions_delta(fun, samples \\ 5) do
    deltas =
      for _ <- 1..samples do
        {:reductions, r0} = :erlang.process_info(self(), :reductions)
        fun.()
        {:reductions, r1} = :erlang.process_info(self(), :reductions)
        max(0, r1 - r0)
      end

    s = Enum.sort(deltas)
    %{median: Enum.at(s, div(samples, 2)), min: hd(s)}
  end

  def memory_probe(fun, copies \\ 8) do
    :erlang.garbage_collect()
    {:memory, pm0} = :erlang.process_info(self(), :memory)
    b0 = :erlang.memory(:binary)
    frames = for _ <- 1..copies, do: fun.()
    bytes = byte_size(hd(frames))
    b1 = :erlang.memory(:binary)
    {:memory, pm1} = :erlang.process_info(self(), :memory)
    # keep frames alive until measured
    _ = Enum.sum(for <<b::8 <- hd(frames)>>, do: b)

    %{
      frame_bytes: bytes,
      binary_allocator_delta_bytes: b1 - b0,
      per_frame_binary_approx_bytes: div(max(0, b1 - b0), copies),
      process_memory_delta_bytes: pm1 - pm0
    }
  end
end

defmodule Afterlight.Bench.Runner do
  @moduledoc false
  @k_clients [1, 10, 100, 200]

  def run do
    here = __DIR__
    fixture_dir = Path.expand("../results/fixtures-for-beam", here)
    out_json = Path.expand("../results/beam.json", here)
    out_md = Path.expand("../results/beam-notes.md", here)

    json_ok? = Code.ensure_loaded?(JSON) and function_exported?(JSON, :encode!, 1)

    files =
      fixture_dir
      |> then(&Path.wildcard(Path.join(&1, "N*_f*.json")))
      |> Enum.sort_by(fn p ->
        case Regex.run(~r/N(\d+)_f([\d.]+)\.json$/, Path.basename(p)) do
          [_, n, f] -> {String.to_integer(n), String.to_float(f <> "0")}
          _ -> {0, 0.0}
        end
      end)

    if files == [] do
      raise("no fixtures found in #{fixture_dir} — run node lib/dump-fixtures.mjs")
    end

    IO.puts("fixtures: #{length(files)} from #{fixture_dir}")
    IO.puts("built-in JSON available: #{json_ok?}\n")

    results =
      Enum.map(files, fn path ->
        bench_file(path, json_ok?)
      end)

    env = %{
      elixir: System.version(),
      otp_release: to_string(:erlang.system_info(:otp_release)),
      schedulers_online: :erlang.system_info(:schedulers_online),
      logical_cpus: :erlang.system_info(:logical_processors_available),
      date: DateTime.utc_now() |> DateTime.to_iso8601(),
      warmup: 3,
      runs: 20,
      json_builtin: json_ok?,
      contention_note:
        "shared machine, other agents running concurrently; MIN is the comparable statistic (contract §8)"
    }

    File.write!(out_json, JSON.encode!(%{env: env, fixtures: results}) <> "\n")

    rows =
      Enum.map(results, fn r ->
        j = if r[:json], do: r.json.encode.min_us, else: "-"
        s = r.soa_binary.min_us
        jk = if r[:json], do: r.json.bytes, else: "-"
        jb = if r[:json_build_and_encode], do: r.json_build_and_encode.encode.min_us, else: "-"

        [
          r.n, r.f, r.changed_count,
          j, jb,
          s, r.soa_bytes,
          r.iodata_build.min_us + r.iodata_flatten.min_us,
          if(is_number(j) and s > 0, do: Float.round(j / s, 2), else: "-"),
          if(is_number(jk), do: Float.round(jk / r.soa_bytes, 2), else: "-")
        ]
      end)

    md = notes_md(env, results, rows)
    File.write!(out_md, md)

    IO.puts("\n=== encode (min µs / median µs) ===")
    Enum.each(rows, fn [n, f, c, j, jb, s, sb, io, sx, bx] ->
      IO.puts(
        "N#{n} f#{f} count=#{c} | json #{fmt(j)} #{fmt(jb)} | soa #{fmt(s)} #{sb}B | iodata+flatten #{fmt(io)} | speedup x#{sx} bytes x#{bx}"
      )
    end)

    IO.puts("\nwrote #{out_json}\nwrote #{out_md}")
  end

  defp fmt(v) when is_integer(v), do: Integer.to_string(v)
  defp fmt(v), do: v

  defp bench_file(path, json_ok?) do
    base = Path.basename(path, ".json")
    [_, n_s, f_s] = Regex.run(~r/N(\d+)_f([\d.]+)/, base)
    n = String.to_integer(n_s)
    f = String.to_float(f_s <> "0")
    doc = path |> File.read!() |> JSON.decode!()
    changed = doc["changed"]

    if changed != Enum.sort(changed), do: raise("fixture #{base}: changed ids not sorted")

    # ---- untimed prep: RealtimeFrame equivalent (WorldDelta extractor output)
    ids_t = List.to_tuple(doc["ids"])
    xs_t = List.to_tuple(doc["x"])
    ys_t = List.to_tuple(doc["y"])
    zs_t = List.to_tuple(doc["z"])
    yaws_t = List.to_tuple(doc["yaw"])
    flags_t = List.to_tuple(doc["flags"])
    gids_t = List.to_tuple(doc["guestIds"])

    slots = Enum.map(changed, fn id -> id_slot(ids_t, id, 0, tuple_size(ids_t) - 1) end)
    ids_c = changed
    x_c = for i <- slots, do: :erlang.float(elem(xs_t, i))
    y_c = for i <- slots, do: :erlang.float(elem(ys_t, i))
    z_c = for i <- slots, do: :erlang.float(elem(zs_t, i))
    yaw_c = for i <- slots, do: :erlang.float(elem(yaws_t, i))
    flags_c = for i <- slots, do: elem(flags_t, i)
    gid_c = for i <- slots, do: elem(gids_t, i)

    enc_soa = fn ->
      Afterlight.Bench.encode_delta_soa(ids_c, x_c, y_c, z_c, yaw_c, flags_c, 0, 1, 1, 0)
    end

    enc_iodata = fn ->
      Afterlight.Bench.encode_delta_soa_iodata(ids_c, x_c, y_c, z_c, yaw_c, flags_c, 0, 1, 1, 0)
    end

    frame = enc_soa.()
    iodata = enc_iodata.()

    if IO.iodata_to_binary(iodata) != frame, do: raise("iodata/binary arm mismatch for #{base}")

    prebuilt_iodata = enc_iodata.()
    flatten = fn -> IO.iodata_to_binary(prebuilt_iodata) end

    presence_prebuilt = doc["presence_update"]

    json_encode =
      if json_ok? do
        Afterlight.Bench.time_it(fn -> JSON.encode!(presence_prebuilt) end)
      else
        nil
      end

    json_build_and_encode =
      if json_ok? do
        Afterlight.Bench.time_it(fn ->
          presence_prebuilt_built =
            Afterlight.Bench.encode_presence_map(ids_c, gid_c, x_c, z_c, yaw_c, flags_c)

          JSON.encode!(presence_prebuilt_built)
        end)
      else
        nil
      end

    soa_binary = Afterlight.Bench.time_it(enc_soa)
    iodata_build = Afterlight.Bench.time_it(enc_iodata)
    iodata_flatten = Afterlight.Bench.time_it(flatten)

    # json bytes: prebuilt (Node-generated) vs rebuilt must be near-identical
    json_bytes =
      if json_ok? do
        byte_size(JSON.encode!(presence_prebuilt))
      end

    json_build_bytes =
      if json_ok? do
        byte_size(JSON.encode!(Afterlight.Bench.encode_presence_map(ids_c, gid_c, x_c, z_c, yaw_c, flags_c)))
      end

    # ---- fanout: encode once + duplicate vs encode per client
    fanout =
      for k <- @k_clients do
        fan = Afterlight.Bench.time_it(fn -> List.duplicate(frame, k) end)

        per_client =
          Afterlight.Bench.time_it(fn ->
            for _ <- 1..k, do: enc_soa.()
          end)

        once_total = soa_binary.median_us + fan.median_us
        saving = if once_total > 0, do: Float.round(per_client.median_us / once_total, 2), else: nil

        %{
          k: k,
          encode_once_us: soa_binary,
          duplicate_us: fan,
          per_client_total_us: per_client,
          saving_x_median: saving
        }
      end

    red_soa = Afterlight.Bench.reductions_delta(enc_soa)

    red_json =
      if json_ok? do
        Afterlight.Bench.reductions_delta(fn ->
          JSON.encode!(Afterlight.Bench.encode_presence_map(ids_c, gid_c, x_c, z_c, yaw_c, flags_c))
        end)
      end

    mem = Afterlight.Bench.memory_probe(enc_soa)

    IO.puts(
      "benched #{base}: changed=#{length(changed)} soa=#{mem.frame_bytes}B " <>
        "min(soa)=#{soa_binary.min_us}µs min(json)=#{if json_encode, do: json_encode.min_us, else: "skip"}µs"
    )

    %{
      n: n,
      f: f,
      changed_count: length(changed),
      soa_binary: soa_binary,
      soa_bytes: mem.frame_bytes,
      iodata_build: iodata_build,
      iodata_flatten: iodata_flatten,
      iodata_bytes: byte_size(IO.iodata_to_binary(iodata)),
      json: if(json_encode, do: %{encode: json_encode, bytes: json_bytes}, else: nil),
      json_build_and_encode:
        if(json_build_and_encode, do: %{encode: json_build_and_encode, bytes: json_build_bytes}, else: nil),
      fanout: fanout,
      reductions: %{soa_binary: red_soa, json_build_and_encode: red_json},
      memory: mem
    }
  end

  # binary search id -> slot over the dense local slots (fixture ids are
  # ascending by construction, cf. fixtures.mjs makeWorld)
  defp id_slot(ids_t, id, lo, hi) when lo <= hi do
    mid = div(lo + hi, 2)
    v = elem(ids_t, mid)

    cond do
      v == id -> mid
      v < id -> id_slot(ids_t, id, mid + 1, hi)
      true -> id_slot(ids_t, id, lo, mid - 1)
    end
  end

  defp id_slot(_ids_t, id, _lo, _hi), do: raise("id #{id} not found in fixture world")

  # ---------------------------------------------------------------------------
  # Generated markdown (contract §8: JSON + generated markdown)
  # ---------------------------------------------------------------------------

  defp notes_md(env, results, rows) do
    table_rows =
      Enum.map(rows, fn [n, f, c, j, jb, s, sb, io, sx, bx] ->
        "| #{n} | #{f} | #{c} | #{fmt(j)} | #{fmt(jb)} | #{s} | #{sb} | #{io} | #{sx} | #{bx} |"
      end)
      |> Enum.join("\n")

    fanout_rows =
      for r <- results, fk <- r.fanout, fk.k in [100, 200] do
        saving = if fk.saving_x_median, do: "x#{fk.saving_x_median}", else: "-"
        "| #{r.n} | #{r.f} | #{fk.k} | #{fk.encode_once_us.median_us} | #{fk.duplicate_us.min_us} | #{fk.per_client_total_us.median_us} | #{saving} |"
      end
      |> Enum.join("\n")

    """
    # BEAM (Phoenix/BEAM data plane) encode benchmark — afterlight-soa-v1 DELTA

    Generated by `beam/bench_encode.exs` from `results/fixtures-for-beam/` (generated by
    `lib/dump-fixtures.mjs` from `lib/fixtures.mjs`, contract §8). Reference implementation of
    what `Afterlight.Realtime.Encoders.BinarySoA` would do per contract §3: 24-byte header +
    transform section (SORTED_IDS, x/y/z/yaw f32 LE columns) + flags section (SORTED_IDS, u8s).

    Env: Elixir #{env.elixir} / OTP #{env.otp_release}, #{env.schedulers_online} schedulers,
    built-in JSON: #{env.json_builtin}. #{env.contention_note}.

    All times are µs, `:timer.tc`, warmup 3, 20 runs; each cell is `min (median)` — under machine
    contention min is the honest estimator (contract §8).

    | N | f | changed | JSON encode | JSON build+encode | SoA binary | SoA bytes | iodata build+flatten | JSON/SoA time | JSON/SoA bytes |
    |---|---|---|---|---|---|---|---|---|---|
    #{table_rows}

    ## Encode-once fanout (median µs; saving = K per-client encodes / (1 encode + List.duplicate))

    | N | f | K | encode-once | duplicate-to-K min | K per-client encodes | saving |
    |---|---|---|---|---|---|---|
    #{fanout_rows}

    ## FrameEncoder behaviour (contract §6)

    The natural shape is `Afterlight.Realtime.FrameEncoder` — a behaviour with
    `@callback encode(Afterlight.Realtime.RealtimeFrame.t(), keyword) :: iodata` implemented by
    `Afterlight.Realtime.Encoders.JSON` (debug, presence_update shape) and
    `Afterlight.Realtime.Encoders.BinarySoA` (this contract), with `Encoders.Arrow` as a possible
    third. RoomServer encodes ONCE per capability class per 100 ms tick and fans the same iodata
    out to every socket; this benchmark's fanout arm quantifies that saving directly.

    ## Observations (see beam.json for exact numbers)

    - SoA binary encoding is column comprehensions into bitstrings plus one header append —
      reduction counts stay near-linear and are typically one to two orders of magnitude below the
      JSON build+encode path for the same delta, and the frame is also much smaller on the wire.
    - iodata construction (deep list of column binaries) is what the room process pays per tick;
      the final `IO.iodata_to_binary` is a separate, cheaper step the driver would otherwise repeat
      per client port_command.
    - Memory: frames >64 bytes are refc binaries allocated off-heap and refcounted — duplicating
      the same frame to K clients is K pointer copies, not K payload copies; process
      `:memory` therefore barely moves and the ERTS binary allocator tracks the payload.
    - Hazard for a 10 Hz x 200-client room: the per-send cost is the port_command serialization
      (each socket gets its own copy into the driver buffer — unavoidable), so encode-once +
      per-socket sends keeps CPU flat, but a slow client backlog retains the refc binary (and its
      1 MiB worst case per contract cap) until the last reference drains.
    """
  end
end

Afterlight.Bench.Runner.run()
