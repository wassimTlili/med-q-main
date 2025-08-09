const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Parse CSV manually (simple parser)
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

async function importSpecialties(csvFile) {
  console.log('📊 Importing specialties from CSV...');
  
  const csvText = fs.readFileSync(csvFile, 'utf-8');
  const { headers, rows } = parseCSV(csvText);
  
  console.log('Headers found:', headers);
  console.log(`Rows to import: ${rows.length}`);
  
  // Get first niveau for default
  const defaultNiveau = await prisma.niveau.findFirst();
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      // Find niveau by name if provided
      let niveauId = defaultNiveau?.id;
      if (row.niveau) {
        const niveau = await prisma.niveau.findFirst({
          where: { name: { contains: row.niveau, mode: 'insensitive' } }
        });
        if (niveau) niveauId = niveau.id;
      }
      
      const specialty = await prisma.specialty.create({
        data: {
          name: row.name || row.Name,
          description: row.description || row.Description || '',
          niveauId: niveauId,
          isFree: (row.isFree || row.free || '').toLowerCase() === 'true'
        }
      });
      
      console.log(`✅ ${specialty.name}`);
      imported++;
    } catch (error) {
      console.log(`❌ Error with row:`, row, error.message);
      errors++;
    }
  }
  
  console.log(`\n🎉 Import complete: ${imported} imported, ${errors} errors`);
}

async function importLectures(csvFile) {
  console.log('📚 Importing lectures from CSV...');
  
  const csvText = fs.readFileSync(csvFile, 'utf-8');
  const { headers, rows } = parseCSV(csvText);
  
  console.log('Headers found:', headers);
  console.log(`Rows to import: ${rows.length}`);
  
  let imported = 0;
  let errors = 0;
  
  for (const row of rows) {
    try {
      // Find specialty by name
      let specialtyId = null;
      if (row.specialty || row.Specialty) {
        const specialty = await prisma.specialty.findFirst({
          where: { name: { contains: row.specialty || row.Specialty, mode: 'insensitive' } }
        });
        if (specialty) specialtyId = specialty.id;
      }
      
      if (!specialtyId) {
        console.log(`❌ Specialty not found for: ${row.specialty || row.Specialty}`);
        errors++;
        continue;
      }
      
      const lecture = await prisma.lecture.create({
        data: {
          title: row.title || row.Title,
          description: row.description || row.Description || '',
          specialtyId: specialtyId,
          isFree: (row.isFree || row.free || '').toLowerCase() === 'true'
        }
      });
      
      console.log(`✅ ${lecture.title}`);
      imported++;
    } catch (error) {
      console.log(`❌ Error with row:`, row, error.message);
      errors++;
    }
  }
  
  console.log(`\n🎉 Import complete: ${imported} imported, ${errors} errors`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
📋 CSV Import Tool

Usage: node import-csv.js <type> <file.csv>

Types:
  specialties - Import specialties (columns: name, description, niveau, isFree)
  lectures    - Import lectures (columns: title, description, specialty, isFree)

Examples:
  node import-csv.js specialties data.csv
  node import-csv.js lectures courses.csv
    `);
    return;
  }
  
  const [type, csvFile] = args;
  
  if (!fs.existsSync(csvFile)) {
    console.log(`❌ File not found: ${csvFile}`);
    return;
  }
  
  try {
    switch (type) {
      case 'specialties':
        await importSpecialties(csvFile);
        break;
      case 'lectures':
        await importLectures(csvFile);
        break;
      default:
        console.log(`❌ Unknown type: ${type}`);
    }
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
