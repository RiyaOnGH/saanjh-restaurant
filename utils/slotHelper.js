function pad(n) {
  return String(n).padStart(2, '0');
}

function timeLabel(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

function localDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function generateReservationId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SJ-${num}`;
}

function getAllSlots(openHour = 11, lastSeating = 21, slotMinutes = 60) {
  const list = [];
  for (let m = openHour * 60; m <= lastSeating * 60; m += slotMinutes) {
    list.push(m);
  }
  return list;
}

function isSlotInPast(dateStr, slotMin) {
  const now = new Date();
  const todayStr = localDateString(now);
  if (dateStr < todayStr) return true;
  if (dateStr === todayStr) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    // 30 minute advance notice requirement
    return slotMin < currentMinutes + 30;
  }
  return false;
}

module.exports = {
  pad,
  timeLabel,
  localDateString,
  generateReservationId,
  getAllSlots,
  isSlotInPast,
};
