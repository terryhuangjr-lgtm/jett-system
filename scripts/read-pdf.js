const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const pdfPath = process.argv[2];

if (!pdfPath) {
  console.error('Usage: node read-pdf.js <pdf-file-path>');
  process.exit(1);
}

const dataBuffer = fs.readFileSync(pdfPath);

PDFParse(dataBuffer).then(function(data) {
  console.log(data.text);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
