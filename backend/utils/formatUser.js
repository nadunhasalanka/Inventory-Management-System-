const mongoose = require('mongoose');

function normalizeLocation(raw) {
  if (!raw) return { id: null, name: null, type: null };

  // When populated, raw is an object; otherwise it may just be an ObjectId string
  if (raw instanceof mongoose.Types.ObjectId || typeof raw === 'string') {
    return { id: raw.toString(), name: null, type: null };
  }

  const id = raw._id ? raw._id.toString() : null;
  return {
    id,
    name: raw.name || null,
    type: raw.type || null,
  };
}

module.exports = function formatUser(userDoc) {
  if (!userDoc) return null;
  const source = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const location = normalizeLocation(source.active_location_id);
  const first = source.first_name || '';
  const last = source.last_name || '';
  const displayName = `${first} ${last}`.trim() || source.username || source.email;

  return {
    id: source._id ? source._id.toString() : undefined,
    role: source.role,
    email: source.email,
    username: source.username,
    first_name: source.first_name,
    last_name: source.last_name,
    name: displayName,
    active_location_id: location.id,
    active_location: location.id
      ? {
          id: location.id,
          name: location.name,
          type: location.type,
        }
      : null,
  };
};
