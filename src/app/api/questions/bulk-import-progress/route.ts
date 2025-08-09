import { NextRequest, NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '@/lib/auth-middleware';

// Store active imports with their progress
const activeImports = new Map();

// Function to extract image URLs from text and clean the text
function extractImageUrlAndCleanText(text: string): { cleanedText: string; mediaUrl: string | null; mediaType: string | null } {
  // Regular expression to match URLs that start with http or https and end with common image extensions
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp|tiff|ico))(\s|$)/gi;
  
  let cleanedText = text;
  let mediaUrl: string | null = null;
  let mediaType: string | null = null;
  
  const match = imageUrlRegex.exec(text);
  if (match) {
    mediaUrl = match[1];
    cleanedText = text.replace(match[0], '').trim();
    
    // Determine media type based on file extension
    const extension = mediaUrl.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        mediaType = 'image/jpeg';
        break;
      case 'png':
        mediaType = 'image/png';
        break;
      case 'gif':
        mediaType = 'image/gif';
        break;
      case 'webp':
        mediaType = 'image/webp';
        break;
      case 'svg':
        mediaType = 'image/svg+xml';
        break;
      case 'bmp':
        mediaType = 'image/bmp';
        break;
      case 'tiff':
        mediaType = 'image/tiff';
        break;
      case 'ico':
        mediaType = 'image/x-icon';
        break;
      default:
        mediaType = 'image';
    }
  }
  
  return { cleanedText, mediaUrl, mediaType };
}

// Function to parse MCQ options from Excel columns
function parseMCQOptions(rowData: any): { options: string[], correctAnswers: string[] } {
  const options: string[] = [];
  const correctAnswers: string[] = [];
  
  // Check for options A through E
  for (let i = 0; i < 5; i++) {
    const optionKey = `option ${String.fromCharCode(65 + i)}`; // A, B, C, D, E
    const optionValue = rowData[optionKey];
    if (optionValue && typeof optionValue === 'string' && optionValue.trim()) {
      options.push(optionValue.trim());
    } else if (optionValue && typeof optionValue !== 'string') {
      // Convert non-string values to string
      const stringValue = String(optionValue).trim();
      if (stringValue) {
        options.push(stringValue);
      }
    }
  }
  
  // Parse correct answer (e.g., "A, C, E" or "A" or "A,C,E")
  if (rowData['reponse']) {
    const answerStr = String(rowData['reponse']).toUpperCase();
    const answers = answerStr.split(/[,\s]+/).filter((a: string) => a.trim());
    
    answers.forEach((answer: string) => {
      const index = answer.charCodeAt(0) - 65; // Convert A=0, B=1, etc.
      if (index >= 0 && index < options.length) {
        correctAnswers.push(index.toString());
      }
    });
  }
  
  return { options, correctAnswers };
}

// Function to update progress for an import session
function updateProgress(importId: string, progress: number, message: string, log?: string) {
  const current = activeImports.get(importId) || { progress: 0, message: '', logs: [] };
  activeImports.set(importId, {
    ...current,
    progress,
    message,
    logs: log ? [...current.logs, log] : current.logs
  });
}

async function processFile(file: File, importId: string) {
  try {
    updateProgress(importId, 5, 'Reading Excel file...');
    
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer);
    
    const importStats = {
      total: 0,
      imported: 0,
      failed: 0,
      createdSpecialties: 0,
      createdLectures: 0,
      questionsWithImages: 0,
      createdCases: 0
    };

    const createdSpecialties = new Map();
    const createdLectures = new Map();
    const createdCases = new Map(); // Track cases by lectureId + caseNumber

    // Process each sheet
    const sheets = ['qcm', 'qroc', 'cas_qcm', 'cas_qroc'];
    
    for (const sheetName of sheets) {
      if (!workbook.Sheets[sheetName]) {
        updateProgress(importId, 10, `Sheet '${sheetName}' not found, skipping...`);
        continue;
      }

      updateProgress(importId, 15, `Processing sheet: ${sheetName}...`);
      
      const sheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length < 2) {
        updateProgress(importId, 20, `Sheet '${sheetName}' is empty, skipping...`);
        continue;
      }

      // Skip header row
      const dataRows = jsonData.slice(1);
      importStats.total += dataRows.length;

      updateProgress(importId, 25, `Found ${dataRows.length} rows in ${sheetName}...`);

      // Process each row
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const progress = 25 + (i / dataRows.length) * 60;
        updateProgress(importId, progress, `Processing row ${i + 1} in ${sheetName}...`);

        try {
          // Convert row to object with column headers
          const headers = jsonData[0] as string[];
          const rowData: any = {};
          headers.forEach((header: string, index: number) => {
            rowData[header] = (row as any[])[index];
          });

          // Find or create specialty and lecture
          const specialtyName = rowData['matiere'];
          const lectureTitle = rowData['cours'];

          if (!specialtyName || !lectureTitle) {
            throw new Error('Missing specialty or lecture information');
          }

          // Find or create specialty
          let specialty = createdSpecialties.get(specialtyName);
          if (!specialty) {
            specialty = await prisma.specialty.findFirst({
              where: { name: specialtyName }
            });
            
            if (!specialty) {
              specialty = await prisma.specialty.create({
                data: { name: specialtyName }
              });
              importStats.createdSpecialties++;
              updateProgress(importId, progress, `Created specialty: ${specialtyName}`, `✅ Created specialty: ${specialtyName}`);
            }
            createdSpecialties.set(specialtyName, specialty);
          }

          // Find or create lecture
          const lectureKey = `${specialty.id}_${lectureTitle}`;
          let lecture = createdLectures.get(lectureKey);
          if (!lecture) {
            lecture = await prisma.lecture.findFirst({
              where: { 
                specialtyId: specialty.id,
                title: lectureTitle
              }
            });
            
            if (!lecture) {
              lecture = await prisma.lecture.create({
                data: {
                  specialtyId: specialty.id,
                  title: lectureTitle
                }
              });
              importStats.createdLectures++;
              updateProgress(importId, progress, `Created lecture: ${lectureTitle}`, `✅ Created lecture: ${lectureTitle}`);
            }
            createdLectures.set(lectureKey, lecture);
          }

          // Handle clinical cases
          let caseNumber = null;
          let caseText = null;
          let caseQuestionNumber = null;

          if (sheetName === 'cas_qcm' || sheetName === 'cas_qroc') {
            caseNumber = parseInt(rowData['cas n']) || null;
            caseText = rowData['texte du cas'] || null;
            caseQuestionNumber = parseInt(rowData['question n']) || null;

            if (caseNumber && caseText) {
              // Check if this case already exists in our tracking
              const caseKey = `${lecture.id}_${caseNumber}`;
              if (!createdCases.has(caseKey)) {
                createdCases.set(caseKey, { caseNumber, caseText });
                importStats.createdCases++;
                updateProgress(importId, progress, `Created case ${caseNumber}`, `✅ Created clinical case ${caseNumber}: ${caseText.substring(0, 50)}...`);
              }
            }
          }

          // Extract image URL from question text - use correct column name
          const questionTextColumn = sheetName === 'cas_qcm' || sheetName === 'cas_qroc' ? 'texte de question' : 'texte de la question';
          const { cleanedText, mediaUrl, mediaType } = extractImageUrlAndCleanText(rowData[questionTextColumn]);
          if (mediaUrl) {
            importStats.questionsWithImages++;
            updateProgress(importId, progress, `Extracted image from question`, `🖼️ Extracted image: ${mediaUrl}`);
          }

          // Prepare question data based on sheet type
          let questionData: any = {
            lectureId: lecture.id,
            text: cleanedText,
            courseReminder: null,
            number: parseInt(rowData['question n']) || null,
            session: rowData['source'],
            mediaUrl: mediaUrl,
            mediaType: mediaType
          };

          // Set question type and specific fields
          switch (sheetName) {
            case 'qcm':
              const { options, correctAnswers } = parseMCQOptions(rowData);
              questionData.type = 'mcq';
              questionData.options = options;
              questionData.correctAnswers = correctAnswers;
              break;

            case 'qroc':
              questionData.type = 'qroc';
              questionData.correctAnswers = [rowData['reponse']];
              break;

            case 'cas_qcm':
              const casQcmOptions = parseMCQOptions(rowData);
              questionData.type = 'clinic_mcq';
              questionData.options = casQcmOptions.options;
              questionData.correctAnswers = casQcmOptions.correctAnswers;
              questionData.caseNumber = caseNumber;
              questionData.caseText = caseText;
              questionData.caseQuestionNumber = caseQuestionNumber;
              break;

            case 'cas_qroc':
              questionData.type = 'clinic_croq';
              questionData.correctAnswers = [rowData['reponse']];
              questionData.caseNumber = caseNumber;
              questionData.caseText = caseText;
              questionData.caseQuestionNumber = caseQuestionNumber;
              break;
          }

          // Create the question
          await prisma.question.create({
            data: questionData
          });

          importStats.imported++;
          updateProgress(importId, progress, `Imported question ${i + 1}`, `✅ Imported ${sheetName} question: ${cleanedText.substring(0, 50)}...`);

        } catch (error) {
          importStats.failed++;
          const errorMsg = `❌ Row ${i + 1} in ${sheetName}: ${(error as Error).message}`;
          updateProgress(importId, progress, `Error in row ${i + 1}`, errorMsg);
          console.error(`Error processing row ${i + 1} in ${sheetName}:`, error);
        }
      }
    }

    // Update final stats
    activeImports.set(importId, {
      ...activeImports.get(importId),
      stats: importStats
    });

    updateProgress(importId, 100, 'Import completed!', `🎉 Import completed! Total: ${importStats.total}, Imported: ${importStats.imported}, Failed: ${importStats.failed}, Created: ${importStats.createdSpecialties} specialties, ${importStats.createdLectures} lectures, ${importStats.createdCases} cases, ${importStats.questionsWithImages} questions with images`);

  } catch (error) {
    console.error('File processing error:', error);
    updateProgress(importId, 0, 'Import failed', `❌ Import failed: ${(error as Error).message}`);
  }
}

async function postHandler(request: AuthenticatedRequest) {
  try {
    console.log('POST handler called');
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', file ? { name: file.name, size: file.size } : 'No file');
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Creating import session with ID:', importId);
    
    // Initialize import session
    const initialSession = {
      progress: 0,
      message: 'Starting import...',
      logs: [],
      stats: {
        total: 0,
        imported: 0,
        failed: 0,
        createdSpecialties: 0,
        createdLectures: 0,
        questionsWithImages: 0,
        createdCases: 0
      }
    };
    
    activeImports.set(importId, initialSession);

    console.log('Import session created. Total active imports:', activeImports.size);
    console.log('Session data:', activeImports.get(importId));

    // Process file in background
    console.log('Starting file processing in background');
    processFile(file, importId);

    console.log('Returning importId:', importId);
    return NextResponse.json({ importId });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

async function getHandler(request: AuthenticatedRequest) {
  try {
    console.log('GET handler called');
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get('importId');

    console.log('GET request for importId:', importId);
    console.log('Total active imports:', activeImports.size);
    console.log('Available import IDs:', Array.from(activeImports.keys()));

    if (!importId) {
      console.log('No importId provided');
      return NextResponse.json({ error: 'Import ID required' }, { status: 400 });
    }

    const importData = activeImports.get(importId);
    console.log('Import data found:', importData ? 'Yes' : 'No');
    
    if (!importData) {
      console.log('Import session not found for ID:', importId);
      console.log('Current active imports:', Array.from(activeImports.entries()));
      return NextResponse.json({ error: 'Import not found' }, { status: 404 });
    }

    console.log('Found import data for ID:', importId, 'Progress:', importData.progress);
    
    // Check if this is an SSE request (EventSource)
    const acceptHeader = request.headers.get('accept');
    console.log('Accept header:', acceptHeader);
    
    if (acceptHeader && acceptHeader.includes('text/event-stream')) {
      console.log('SSE request detected');
      // Return SSE response
      const stream = new ReadableStream({
        start(controller) {
          const sendEvent = (data: any) => {
            const eventData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
          };

          // Send initial data
          sendEvent(importData);

          // Set up polling to send updates
          const interval = setInterval(() => {
            const currentData = activeImports.get(importId);
            if (currentData) {
              sendEvent(currentData);
              
              // Close stream if import is complete
              if (currentData.progress >= 100) {
                clearInterval(interval);
                controller.close();
              }
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 1000);

          // Clean up on close
          return () => {
            clearInterval(interval);
          };
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    console.log('Returning JSON response');
    // Regular JSON response
    return NextResponse.json(importData);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Failed to get progress' }, { status: 500 });
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

// Test endpoint to verify route is working
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
} 