const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] || '';
    });
    return row;
  });
}

async function importQCM() {
  try {
    console.log('📚 Starting QCM import...');
    
    const csvContent = fs.readFileSync('data\\PCEM 2 Sample  - qcm.csv', 'utf-8');
    const questions = parseCSV(csvContent);
    
    console.log(`Found ${questions.length} questions to import`);
    
    // Get PCEM2 niveau
    let niveau = await prisma.niveau.findFirst({
      where: { name: { contains: 'PCEM' } }
    });
    
    if (!niveau) {
      niveau = await prisma.niveau.create({
        data: { name: 'PCEM2', order: 2 }
      });
      console.log('✅ Created PCEM2 niveau');
    }
    
    let imported = 0;
    let skipped = 0;
    
    for (const q of questions) {
      try {
        // Skip empty rows
        if (!q.matiere || !q.cours || !q['texte de la question']) {
          skipped++;
          continue;
        }

        // Get or create specialty
        let specialty = await prisma.specialty.findFirst({
          where: { name: q.matiere.trim() }
        });
        
        if (!specialty) {
          specialty = await prisma.specialty.create({
            data: {
              name: q.matiere.trim(),
              description: `Spécialité ${q.matiere.trim()}`,
              niveauId: niveau.id,
              isFree: true
            }
          });
          console.log(`  ✅ Created specialty: ${specialty.name}`);
        }
        
        // Get or create lecture
        let lecture = await prisma.lecture.findFirst({
          where: { 
            title: q.cours.trim(),
            specialtyId: specialty.id
          }
        });
        
        if (!lecture) {
          lecture = await prisma.lecture.create({
            data: {
              title: q.cours.trim(),
              description: `Cours: ${q.cours.trim()}`,
              specialtyId: specialty.id,
              isFree: true
            }
          });
        }
        
        // Check if question exists
        const questionText = q['texte de la question'].trim();
        const existingQuestion = await prisma.question.findFirst({
          where: {
            text: questionText,
            lectureId: lecture.id
          }
        });
        
        if (existingQuestion) {
          skipped++;
          continue;
        }
        
        // Create question options - handle CSV columns properly
        const options = [
          q['option A'],
          q['option B'], 
          q['option C'],
          q['option D'],
          q['option E']
        ].filter(opt => opt && opt.trim() && opt.trim() !== '');
        
        // Parse correct answers (A, B, C, D, E -> "0", "1", "2", "3", "4")
        let correctAnswers = [];
        if (q.reponse && q.reponse.trim() && 
            q.reponse !== 'Pas de réponse' && 
            q.reponse !== 'Pas de reponse' &&
            q.reponse !== 'Aucune réponse n\'est juste' &&
            q.reponse !== 'Aucune réponse n\' est juste.') {
          
          correctAnswers = q.reponse.trim().split('').map(letter => {
            const index = letter.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, etc.
            return index >= 0 && index < options.length ? index.toString() : null;
          }).filter(i => i !== null);
        }
        
        await prisma.question.create({
          data: {
            text: questionText,
            type: 'MCQ',
            options: options,
            correctAnswers: correctAnswers,
            explanation: q.source ? q.source.trim() : '',
            lectureId: lecture.id
          }
        });
        
        imported++;
        if (imported % 50 === 0) {
          console.log(`  📝 ${imported} questions imported...`);
        }
        
      } catch (error) {
        console.error(`❌ Error importing question ${imported + skipped + 1}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Import complete!`);
    console.log(`  ✅ Imported: ${imported} questions`);
    console.log(`  ⏭️  Skipped: ${skipped} duplicates`);
    
    const totalQuestions = await prisma.question.count();
    console.log(`\n📊 Total questions in database: ${totalQuestions}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importQCM();
