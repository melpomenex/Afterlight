import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREPARE_STATUS,
  extensionNeedsPrepare,
  planCompatibility,
  prepareCacheKey,
  probeDirectPlayable,
  resolvedPlayback,
  pathExtension,
} from '../shared/mediaModel.js';
import { classifySource } from '../shared/theaterModel.js';

test('pathExtension reads extension before query string', () => {
  assert.equal(pathExtension('https://cdn.example/movie.mkv?token=abc'), 'mkv');
});

test('classifySource accepts mkv and marks needsPrepare', () => {
  const c = classifySource('https://example.com/film.mkv');
  assert.equal(c.kind, 'file');
  assert.equal(c.needsPrepare, true);
});

test('classifySource keeps mp4 as direct file', () => {
  const c = classifySource('https://example.com/clip.mp4');
  assert.equal(c.kind, 'file');
  assert.equal(c.needsPrepare, false);
});

test('extensionNeedsPrepare flags mkv not mp4', () => {
  assert.equal(extensionNeedsPrepare('https://x/a.mkv'), true);
  assert.equal(extensionNeedsPrepare('https://x/a.mp4'), false);
});

test('planCompatibility chooses remux for h264+aac in mkv', () => {
  const plan = planCompatibility({
    container: 'matroska',
    videoCodec: 'h264',
    audioCodec: 'aac',
  });
  assert.equal(plan.strategy, 'remux');
  assert.equal(plan.outputKind, 'hls');
});

test('planCompatibility chooses transcode_audio for incompatible audio', () => {
  const plan = planCompatibility({
    container: 'matroska',
    videoCodec: 'h264',
    audioCodec: 'dts',
  });
  assert.equal(plan.strategy, 'transcode_audio');
  assert.equal(plan.videoCopy, true);
  assert.equal(plan.transcodeAudio, true);
});

test('planCompatibility chooses transcode_full for incompatible video', () => {
  const plan = planCompatibility({
    container: 'matroska',
    videoCodec: 'hevc',
    audioCodec: 'aac',
  });
  assert.equal(plan.strategy, 'transcode_full');
});

test('probeDirectPlayable accepts mp4 h264', () => {
  assert.equal(
    probeDirectPlayable({ container: 'mp4', videoCodec: 'h264', audioCodec: 'aac', sourceUrl: 'https://x/a.mp4' }),
    true,
  );
});

test('prepareCacheKey is stable for same inputs', () => {
  const probe = { container: 'matroska', videoCodec: 'h264', audioCodec: 'aac' };
  const plan = planCompatibility(probe);
  const a = prepareCacheKey('https://example.com/a.mkv', probe, plan);
  const b = prepareCacheKey('https://example.com/a.mkv', probe, plan);
  assert.equal(a, b);
});

test('resolvedPlayback waits while prepare pending', () => {
  const r = resolvedPlayback({
    kind: 'file',
    url: 'https://example.com/a.mkv',
    prepareStatus: PREPARE_STATUS.PENDING,
  });
  assert.equal(r.waiting, true);
  assert.equal(r.url, null);
});

test('resolvedPlayback uses playbackUrl when ready', () => {
  const r = resolvedPlayback({
    kind: 'hls',
    url: 'https://example.com/a.mkv',
    playbackUrl: '/api/theater/media/med_abc/index.m3u8',
    prepareStatus: PREPARE_STATUS.READY,
  });
  assert.equal(r.waiting, false);
  assert.equal(r.engine, 'hls');
  assert.equal(r.url, '/api/theater/media/med_abc/index.m3u8');
});

test('resolvedPlayback routes twitch items to the twitch engine, never direct', () => {
  for (const twitchType of ['channel', 'video', 'clip']) {
    const r = resolvedPlayback({
      kind: 'twitch',
      twitchType,
      twitchId: twitchType === 'clip' ? 'SomeClip-slug' : '40464143',
      url: 'https://www.twitch.tv/example',
    });
    assert.equal(r.waiting, false);
    assert.equal(r.engine, 'twitch');
    assert.equal(r.url, 'https://www.twitch.tv/example');
  }
});
