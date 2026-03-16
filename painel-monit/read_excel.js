const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Lista de Concorrentes.xlsx');
console.log('Reading:', filePath);
try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);
  console.log('Columns:', Object.keys(data[0] || {}));
  console.log('First Row:', data[0]);
} catch (err) {
  console.error('Error reading excel:', err.message);
}
