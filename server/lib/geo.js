'use strict';

/** A lat/lng pair, or null when either half is missing. */
function coords(lat, lng) {
  return lat != null && lng != null ? { lat, lng } : null;
}

module.exports = { coords };
