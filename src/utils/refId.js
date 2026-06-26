export const generateRefId = (type, existingItems) => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  const prefix = `${type}${month}${year}`;

  const sameMonthItems = existingItems.filter(item =>
    item.refId && item.refId.startsWith(prefix)
  );

  let maxSerial = 0;
  sameMonthItems.forEach(item => {
    const serialPart = item.refId.substring(prefix.length);
    const serialNum = parseInt(serialPart, 10);
    if (!isNaN(serialNum) && serialNum > maxSerial) {
      maxSerial = serialNum;
    }
  });

  // Guard against collisions: if a concurrently-created item already holds the
  // next serial (e.g. polled in from another client), keep advancing until the
  // generated id is genuinely unique within the current item set.
  const existingIds = new Set(existingItems.map(item => item.refId).filter(Boolean));
  let nextSerial = maxSerial + 1;
  let candidate = `${prefix}${String(nextSerial).padStart(2, '0')}`;
  while (existingIds.has(candidate)) {
    nextSerial += 1;
    candidate = `${prefix}${String(nextSerial).padStart(2, '0')}`;
  }
  return candidate;
};
