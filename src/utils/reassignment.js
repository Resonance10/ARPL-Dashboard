export const getReassignedInfo = (req) => {
  if (!req) return null;
  if (req.isReassigned && req.reassignedTo) {
    return { username: req.reassignedTo, role: req.reassignedRole };
  }
  if (req.history && req.history.length > 0) {
    const lastEntry = req.history[req.history.length - 1];
    if (lastEntry && (lastEntry.action === 'Request Reassigned' || lastEntry.action === 'Record Reassigned')) {
      if (lastEntry.reassignedTo) {
        return { username: lastEntry.reassignedTo, role: lastEntry.reassignedRole };
      }
      const match = lastEntry.remarks?.match(/(?:reassigned to|specifically to)\s+(\S+)\s*\(([^)]+)\)/i);
      if (match) {
        return { username: match[1], role: match[2] };
      }
    }
  }
  return null;
};
