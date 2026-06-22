const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');
const {
  NOTE_PRINT_LAYOUT,
  getNoteFilePath,
  isValidNairaDenomination,
} = require('../constants/nairaNotes');
const { buildVerificationUrl } = require('./verificationUrl');

const PUBLIC_DIR = path.join(process.cwd(), 'public');

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildSerialSvg = (width, height, serialNumber, layout) => {
  const safeSerial = escapeXml(serialNumber);
  const topFontSize = Math.round(width * layout.serialTop.fontSize);
  const bottomFontSize = Math.round(width * layout.serialBottom.fontSize);
  const topX = Math.round(width * layout.serialTop.x);
  const topY = Math.round(height * layout.serialTop.y + topFontSize);
  const bottomX = Math.round(width * layout.serialBottom.x);
  const bottomY = Math.round(height * layout.serialBottom.y + bottomFontSize);

  const textStyle =
    'font-family="Courier New, monospace" font-weight="bold" fill="#1a1a2e"';

  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${topX - 4}" y="${topY - topFontSize - 2}" width="${safeSerial.length * topFontSize * 0.62 + 8}" height="${topFontSize + 6}" fill="rgba(255,255,255,0.75)" rx="2"/>
      <text x="${topX}" y="${topY}" font-size="${topFontSize}" ${textStyle}>${safeSerial}</text>
      <rect x="${bottomX - 4}" y="${bottomY - bottomFontSize - 2}" width="${safeSerial.length * bottomFontSize * 0.62 + 8}" height="${bottomFontSize + 6}" fill="rgba(255,255,255,0.75)" rx="2"/>
      <text x="${bottomX}" y="${bottomY}" font-size="${bottomFontSize}" ${textStyle}>${safeSerial}</text>
    </svg>
  `);
};

const composePrintableNote = async ({ denomination, serialNumber, qrCodeData, qrCodePayload }) => {
  const denom = Number(denomination);

  if (!isValidNairaDenomination(denom)) {
    throw new Error(`Invalid Naira denomination: ${denomination}`);
  }

  const payload =
    qrCodePayload ||
    (() => {
      try {
        const parsed = JSON.parse(qrCodeData || '{}');
        return parsed.verificationUrl || buildVerificationUrl(serialNumber);
      } catch {
        return buildVerificationUrl(serialNumber);
      }
    })();

  const noteFile = getNoteFilePath(denom);
  const notePath = path.join(PUBLIC_DIR, noteFile);
  const layout = NOTE_PRINT_LAYOUT[denom];

  const noteMeta = await sharp(notePath).metadata();
  const { width, height } = noteMeta;

  const qrSize = Math.round(width * layout.qr.size);
  const qrLeft = Math.round(width * layout.qr.x);
  const qrTop = Math.round(height * layout.qr.y);

  const qrBuffer = await QRCode.toBuffer(payload, {
    type: 'png',
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  });

  const qrWithBorder = await sharp({
    create: {
      width: qrSize + 8,
      height: qrSize + 8,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: qrBuffer, top: 4, left: 4 }])
    .png()
    .toBuffer();

  const serialSvg = buildSerialSvg(width, height, serialNumber, layout);

  const composited = await sharp(notePath)
    .composite([
      { input: qrWithBorder, top: qrTop, left: qrLeft },
      { input: serialSvg, top: 0, left: 0 },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  const base64 = composited.toString('base64');

  return {
    buffer: composited,
    dataUrl: `data:image/jpeg;base64,${base64}`,
    mimeType: 'image/jpeg',
    noteAsset: noteFile,
  };
};

module.exports = { composePrintableNote };
