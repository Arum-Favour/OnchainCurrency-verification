export const NAIRA_DENOMINATIONS = [50, 100, 200, 500, 1000];

export const NAIRA_NOTE_ASSETS = {
  50: '/Notes_50.jpeg',
  100: '/Notes_100.jpeg',
  200: '/Notes_200.jpeg',
  500: '/Notes_500.jpeg',
  1000: '/Notes_1000.jpeg',
};

export const isValidNairaDenomination = (denomination) =>
  NAIRA_DENOMINATIONS.includes(Number(denomination));

export const getNoteAsset = (denomination) =>
  NAIRA_NOTE_ASSETS[Number(denomination)] || null;
