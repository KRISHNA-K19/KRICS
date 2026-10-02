const ActivityEvent = require('../models/ActivityEvent');

const recordActivity = async ({ userId, type, entityType, entityId, metadata }) => {
  try {
    if (!userId) return;
    const event = new ActivityEvent({
      user: userId,
      type,
      entityType,
      entityId,
      metadata
    });
    await event.save();
    return event;
  } catch (err) {
    console.error('[ActivityService] Error logging event:', err.message);
  }
};

const logActivity = async (userId, type, description) => {
  return recordActivity({
    userId,
    type,
    metadata: { description }
  });
};

module.exports = {
  recordActivity,
  logActivity
};
