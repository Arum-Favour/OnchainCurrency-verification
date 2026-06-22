const NAIRA_DENOMINATIONS = [50, 100, 200, 500, 1000];

const NAIRA_NOTE_FILES = {
  50: 'Notes_50.jpeg',
  100: 'Notes_100.jpeg',
  200: 'Notes_200.jpeg',
  500: 'Notes_500.jpeg',
  1000: 'Notes_1000.jpeg',
};

// Overlay positions as fractions of note width/height (tuned for specimen note layout)
const NOTE_PRINT_LAYOUT = {
  50: {
    serialTop: { x: 0.58, y: 0.035, fontSize: 0.028 },
    serialBottom: { x: 0.06, y: 0.91, fontSize: 0.028 },
    qr: { x: 0.72, y: 0.54, size: 0.12 },
  },
  100: {
    serialTop: { x: 0.58, y: 0.035, fontSize: 0.028 },
    serialBottom: { x: 0.06, y: 0.91, fontSize: 0.028 },
    qr: { x: 0.72, y: 0.54, size: 0.12 },
  },
  200: {
    serialTop: { x: 0.58, y: 0.035, fontSize: 0.028 },
    serialBottom: { x: 0.06, y: 0.91, fontSize: 0.028 },
    qr: { x: 0.72, y: 0.54, size: 0.12 },
  },
  500: {
    serialTop: { x: 0.58, y: 0.035, fontSize: 0.028 },
    serialBottom: { x: 0.06, y: 0.91, fontSize: 0.028 },
    qr: { x: 0.72, y: 0.54, size: 0.12 },
  },
  1000: {
    serialTop: { x: 0.58, y: 0.035, fontSize: 0.028 },
    serialBottom: { x: 0.06, y: 0.91, fontSize: 0.028 },
    qr: { x: 0.72, y: 0.54, size: 0.12 },
  },
};

const isValidNairaDenomination = (denomination) =>
  NAIRA_DENOMINATIONS.includes(Number(denomination));

const getNoteFilePath = (denomination) => NAIRA_NOTE_FILES[Number(denomination)];

const getNotePublicPath = (denomination) =>
  `/${NAIRA_NOTE_FILES[Number(denomination)]}`;

module.exports = {
  NAIRA_DENOMINATIONS,
  NAIRA_NOTE_FILES,
  NOTE_PRINT_LAYOUT,
  isValidNairaDenomination,
  getNoteFilePath,
  getNotePublicPath,
};
