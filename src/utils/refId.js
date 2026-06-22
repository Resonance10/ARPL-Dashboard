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

  const serial = String(maxSerial + 1).padStart(2, '0');
  return `${prefix}${serial}`;
};
