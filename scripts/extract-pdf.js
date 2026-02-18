const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Usage: node extract-pdf.js <pdf-file>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

const parser = new PDFParse();
parser.parse(dataBuffer).then(data => {
  console.log(data.text);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
