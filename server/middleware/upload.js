'use strict';

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { nanoid } = require('nanoid');
const config = require('../config');
const { HttpError } = require('./error');

fs.mkdirSync(config.uploads.dir, { recursive: true });

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || '';
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  },
});

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

module.exports = { upload, photoUrl };
