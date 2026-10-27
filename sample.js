// A six-round heavyweight sparring session. It is loaded the first time
// someone opens the app so they see a full analysis straight away.

export const SAMPLE_META = {
  sessionType: 'sparring',
  stance: 'orthodox',
  weightClass: 'Heavyweight',
  restSec: '60',
  goal: 'Keep my output up in the late rounds',
  opponent: 'Taller southpaw who likes to counter',
};

export const SAMPLE_ROUNDS = [
  { duration: '3:00', thrown: '62', head: '16', body: '4', missed: '', avgHr: '158', maxHr: '171', breaths: '34', defence: '22', position: 'centre' },
  { duration: '3:00', thrown: '58', head: '15', body: '3', missed: '', avgHr: '163', maxHr: '175', breaths: '36', defence: '25', position: 'centre' },
  { duration: '3:00', thrown: '51', head: '12', body: '3', missed: '', avgHr: '167', maxHr: '178', breaths: '39', defence: '28', position: 'mixed' },
  { duration: '3:00', thrown: '47', head: '11', body: '2', missed: '', avgHr: '170', maxHr: '181', breaths: '41', defence: '31', position: 'mixed' },
  { duration: '3:00', thrown: '39', head: '8', body: '2', missed: '', avgHr: '172', maxHr: '183', breaths: '44', defence: '36', position: 'ropes' },
  { duration: '3:00', thrown: '35', head: '7', body: '1', missed: '', avgHr: '174', maxHr: '184', breaths: '46', defence: '38', position: 'ropes' },
];
