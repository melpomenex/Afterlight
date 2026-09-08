#!/usr/bin/env node
/**
 * Media compatibility smoke: generates a tiny H.264+AAC MKV, serves it locally,
 * and verifies classify → prepare fields → (optional) ffprobe/transcode chain.
 *
 * Usage: node scripts/theater-media-smoke.mjs
 * Requires: ffmpeg/ffprobe on PATH for the transcode leg.
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifySource, applyTheaterAction, createTheaterState } from '../shared/theaterModel.js';
import { planCompatibility, PREPARE_STATUS, resolvedPlayback } from '../shared/mediaModel.js';

const root = await mkdtemp(join(tmpdir(), 'afterlight-media-smoke-'));
const mkvPath = join(root, 'clip.mkv');
const cacheDir = join(root, 'cache');
const prepareId = 'med_smoke';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} exited ${code}: ${out.slice(0, 400)}`));
    });
  });
}

try {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=2:size=160x90:rate=24',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
    mkvPath,
  ]);
  record('fixture mkv generated', true);

  const mp4Url = 'https://example.com/clip.mp4';
  const mp4 = classifySource(mp4Url);
  record('mp4 classifies as direct file', mp4?.kind === 'file' && !mp4.needsPrepare, mp4?.kind);

  const server = createServer(async (req, res) => {
    if (req.url === '/clip.mkv') {
      const body = await readFile(mkvPath);
      res.writeHead(200, { 'Content-Type': 'video/x-matroska', 'Content-Length': body.length });
      res.end(body);
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const mkvUrl = `http://127.0.0.1:${port}/clip.mkv`;

  const mkv = classifySource(mkvUrl);
  record('mkv classifies with needsPrepare', mkv?.needsPrepare === true, mkvUrl);

  const state = createTheaterState();
  const { state: afterAdd, error } = applyTheaterAction(state, { op: 'channel', url: mkvUrl, title: 'Smoke MKV' }, 'Smoke', Date.now());
  record('mkv accepted on channel op', !error && afterAdd?.now?.prepareStatus === PREPARE_STATUS.PENDING);

  const waiting = resolvedPlayback(afterAdd.now);
  record('client waits while pending', waiting.waiting === true);

  const probeOut = await run('ffprobe', [
    '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', mkvPath,
  ]);
  const probeJson = JSON.parse(probeOut);
  const video = probeJson.streams?.find((s) => s.codec_type === 'video');
  const audio = probeJson.streams?.find((s) => s.codec_type === 'audio');
  const probe = {
    container: 'matroska',
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
  };
  const plan = planCompatibility(probe);
  record('probe plans remux for h264+aac mkv', plan.strategy === 'remux', plan.strategy);

  const { mkdir } = await import('node:fs/promises');
  await mkdir(cacheDir, { recursive: true });

  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', mkvPath,
    '-map', '0:v:0?', '-c:v', 'copy',
    '-map', '0:a:0?', '-c:a', 'copy',
    '-f', 'hls', '-hls_time', '1', '-hls_playlist_type', 'event',
    '-hls_flags', 'independent_segments+program_date_time',
    '-hls_segment_type', 'fmp4',
    '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_segment_filename', join(cacheDir, 'seg_%05d.m4s'),
    join(cacheDir, 'index.m3u8'),
  ].flat());

  const manifest = await readFile(join(cacheDir, 'index.m3u8'), 'utf8');
  record('hls manifest generated', manifest.includes('#EXTM3U'));

  const readyItem = {
    ...afterAdd.now,
    kind: 'hls',
    prepareStatus: PREPARE_STATUS.READY,
    playbackUrl: `/api/theater/media/${prepareId}/index.m3u8`,
  };
  const play = resolvedPlayback(readyItem);
  record('ready item resolves to hls engine', play.engine === 'hls' && !play.waiting);

  server.close();
} catch (err) {
  record('smoke run', false, err.message);
} finally {
  await rm(root, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${results.length} media compatibility smoke checks passed.`);
