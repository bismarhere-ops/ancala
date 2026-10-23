'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { nanoid } = require('nanoid');
const config = require('../config');
const { HttpError } = require('./error');

fs.mkdirSync(config.uploads.dir, { recursive: true });

// The saved extension comes from this table, never from the client's
// filename: a ".html" or ".svg" name must not decide how the file is served.
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};
const ALLOWED_MIME = new Set(Object.keys(MIME_EXT));
const ALLOWED_EXT = new Set(Object.values(MIME_EXT));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${nanoid(8)}${MIME_EXT[file.mimetype]}`),
});

/** True when the file's first bytes match its declared image type. */
function hasImageSignature(filePath, mimetype) {
  const buf = Buffer.alloc(12);
  let fd;
  try {
    fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buf, 0, 12, 0);
  } catch {
    return false;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  switch (mimetype) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP';
    case 'image/heic':
      return buf.toString('latin1', 4, 8) === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(buf.toString('latin1', 8, 12));
    default:
      return false;
  }
}

/** Deletes uploaded files (used when a report is rejected). */
function removeFiles(files) {
  for (const f of files || []) {
    try {
      fs.unlinkSync(f.path);
    } catch {
      /* already gone */
    }
  }
}

/** Headers for serving /uploads: never executable, never sniffed. */
function setUploadHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
}

/** Only image files we wrote ourselves are served from /uploads. */
function isServableUpload(urlPath) {
  return /^\/[0-9]+-[A-Za-z0-9_-]{8}\.[a-z]+$/.test(urlPath) && ALLOWED_EXT.has(path.extname(urlPath));
}

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new HttpError(415, `Unsupported image type: ${file.mimetype}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.uploads.maxMb * 1024 * 1024,
    files: 4,
  },
});

function photoUrl(filename) {
  return `/uploads/${filename}`;
}

module.exports = { upload, photoUrl, hasImageSignature, removeFiles, setUploadHeaders, isServableUpload };
