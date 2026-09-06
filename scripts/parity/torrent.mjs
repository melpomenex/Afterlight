/**
 * Parity fixtures for shared/torrentModel.js and server/torrents.js
 * (parseRange only — everything else in torrents.js is engine I/O).
 */

import {
  normalizeTorrentStatus,
  orderFilesForPicker,
  parseMagnet,
  sanitizeTorrentPick,
} from '../../shared/torrentModel.js';
import { parseRange } from '../../server/torrents.js';
import { recordCall } from './harness.mjs';

function build() {
  const cases = [];

  // parseMagnet: hex, base32, hostile inputs
  const magnets = [
    ['magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Sintel'],
    ['magnet:?xt=urn:btih:0123456789ABCDEF0123456789ABCDEF01234567'],
    ['magnet:?xt=urn:btih:MFRGGDFCMYTDE2LQGJTGKNBZGY4TQNJRGUZTANJZMU3DKOBVGY3A===='],
    ['magnet:?dn=name-only', null],
    ['magnet:?xt=urn:sha1:0123456789abcdef0123456789abcdef01234567', null],
    ['magnet:?xt=urn:btih:zzzzzzzz', null],
    ['magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef0123456', null],
    ['magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef012345677', null],
    ['http://example.com/torrent', null],
    ['', null],
    ['magnet:?xt=urn:btih:31472420a066a10ecb72230bb8cc536c1449c47b&tr=http://tracker/a&tr=http://tracker/b'],
  ];
  // Recorded from the real JS — no hand-authored expectations.
  for (const [url] of magnets) {
    cases.push(recordCall({ id: `magnet/${url.slice(12, 40).replace(/[^\w.-]+/g, '_') || 'empty'}`, fn: parseMagnet, args: [url] }));
  }

  // sanitizeTorrentPick boundaries (integer coercion, null/absent hazards)
  const picks = [
    ['valid', { fileIndex: 1, filePath: 'a/movie.mp4', fileBytes: 1024 }],
    ['fileIndex-at-1e6', { fileIndex: 1_000_000, filePath: 'a/movie.mp4', fileBytes: 0 }],
    ['fileIndex-over-1e6', { fileIndex: 1_000_001, filePath: 'a/movie.mp4', fileBytes: 0 }],
    ['fileIndex-float', { fileIndex: 1.5, filePath: 'a/movie.mp4', fileBytes: 0 }],
    ['fileIndex-string', { fileIndex: '2', filePath: 'a/movie.mp4', fileBytes: 5 }],
    ['fileIndex-negative', { fileIndex: -1, filePath: 'a/movie.mp4', fileBytes: 5 }],
    ['fileIndex-missing', { filePath: 'a/movie.mp4', fileBytes: 5 }],
    ['fileIndex-null', { fileIndex: null, filePath: 'a/movie.mp4', fileBytes: 5 }],
    ['fileBytes-float', { fileIndex: 0, filePath: 'a/movie.mp4', fileBytes: 12.5 }],
    ['fileBytes-negative', { fileIndex: 0, filePath: 'a/movie.mp4', fileBytes: -1 }],
    ['fileBytes-nan-string', { fileIndex: 0, filePath: 'a/movie.mp4', fileBytes: 'big' }],
    ['path-too-long', { fileIndex: 0, filePath: 'x'.repeat(513) + '.mp4', fileBytes: 5 }],
    ['path-512-ok', { fileIndex: 0, filePath: 'd/' + 'x'.repeat(502) + '.mp4', fileBytes: 5 }],
    ['path-whitespace-trim', { fileIndex: 0, filePath: '  a/movie.mp4  ', fileBytes: 5 }],
    ['path-non-video', { fileIndex: 0, filePath: 'a/readme.txt', fileBytes: 5 }],
    ['empty-object', {}],
  ];
  for (const [name, raw] of picks) {
    cases.push(recordCall({ id: `pick/${name}`, fn: sanitizeTorrentPick, args: [raw] }));
  }

  // orderFilesForPicker: stability, playable-first, cap
  const fileSets = [
    ['tie-bytes-stable', [
      { index: 0, path: 'a/s1.mp4', bytes: 100, playable: false },
      { index: 1, path: 'a/s2.webm', bytes: 100, playable: true },
      { index: 2, path: 'a/s3.mkv', bytes: 100, playable: false },
      { index: 3, path: 'a/s4.mp4', bytes: 100, playable: true },
    ]],
    ['junk-and-sort', [
      { index: 2, path: 'b/small.mp4', bytes: 10 },
      { index: 0, path: 'b/big.mkv', bytes: 9_000_000 },
      { index: -1, path: 'b/neg.mp4', bytes: 5 },
      { path: 'b/noidx.txt', bytes: 5 },
      { index: 1, path: 'b/mid.ogv', bytes: 5_000 },
      { index: 3, path: 'b/nanbytes.mp4', bytes: Number.NaN },
    ]],
    ['cap-60', Array.from({ length: 70 }, (_, i) => ({ index: i, path: `f/f${i}.mp4`, bytes: 1000 - i }))],
    ['empty', []],
  ];
  for (const [name, files] of fileSets) {
    cases.push(recordCall({ id: `picker/${name}`, fn: orderFilesForPicker, args: [files] }));
  }

  // normalizeTorrentStatus (string/number coercion, lowercase-only infohash)
  const statuses = [
    ['valid', { infohash: '0123456789abcdef0123456789abcdef01234567', progress: 0.5, peers: 3, downloaded: 1024, ready: true }],
    ['uppercase-infohash', { infohash: '0123456789ABCDEF0123456789ABCDEF01234567', progress: 0.5, peers: 3, downloaded: 1024, ready: true }],
    ['progress-clamps', { infohash: '0123456789abcdef0123456789abcdef01234567', progress: 1.5, peers: 0, downloaded: 0, ready: false }],
    ['progress-negative', { infohash: '0123456789abcdef0123456789abcdef01234567', progress: -1, peers: 0, downloaded: 0, ready: false }],
    ['progress-string', { infohash: '0123456789abcdef0123456789abcdef01234567', progress: '0.25', peers: '2', downloaded: '64', ready: 1 }],
    ['missing-fields', { infohash: '0123456789abcdef0123456789abcdef01234567' }],
    ['junk', { infohash: 'nope' }],
  ];
  for (const [name, raw] of statuses) {
    cases.push(recordCall({ id: `status/${name}`, fn: normalizeTorrentStatus, args: [raw] }));
  }

  // parseRange (server/torrents.js)
  const ranges = [
    ['0-99', 'bytes=0-99', 1000],
    ['open-end', 'bytes=500-', 1000],
    ['suffix', 'bytes=-200', 1000],
    ['suffix-oversize', 'bytes=-5000', 1000],
    ['full', 'bytes=0-', 1000],
    ['exceeds-total', 'bytes=0-5000', 1000],
    ['start-past-total', 'bytes=2000-3000', 1000],
    ['malformed', 'bytes=1-2-3', 1000],
    ['not-bytes', 'items=0-1', 1000],
    ['reversed', 'bytes=50-10', 1000],
    ['empty', 'bytes=-', 1000],
    ['whitespace', ' bytes=0-9 ', 1000],
    ['absent', null, 1000],
    ['zero-total', 'bytes=0-1', 0],
  ];
  for (const [name, header, total] of ranges) {
    cases.push(recordCall({ id: `range/${name}`, fn: parseRange, args: [header, total] }));
  }

  return cases;
}

export const torrentCases = build();
export const torrentHazards = {
  'base32-bitops': ['magnet/*'],
  'number-coercion': ['pick/*', 'status/*'],
  'null-undefined-absent': ['pick/*', 'status/missing-fields'],
  'sorting-stability': ['picker/*'],
  'int-float-fields': ['pick/fileBytes-float', 'status/*'],
  'error-strings': ['range/*'],
};
