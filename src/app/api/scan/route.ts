import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

// 1. GLOBAL FIXES (TypeScript Safe)
// We cast global to 'any' immediately to avoid "Property does not exist" or "Implicit any" errors
if (!(global as any).DOMMatrix) {
  // @ts-ignore
  (global as any).DOMMatrix = class {};
}
if (!(global as any).Canvas) {
   // @ts-ignore
   (global as any).Canvas = {};
}

// 2. REQUIRED SECTIONS LIST
const REQUIRED_SECTIONS = [
  { label: 'Chapter 1: Introduction', keywords: ['chapter 1', 'chapter i', 'introduction'] },
  { label: 'Background of the Study', keywords: ['background of the study'] },
  { label: 'Theoretical Framework', keywords: ['theoretical framework'] },
  { label: 'Conceptual Framework (IPO)', keywords: ['conceptual framework', 'input process output', 'ipo'] },
  { label: 'Statement of the Problem', keywords: ['statement of the problem'] },
  { label: 'Objectives of the Study', keywords: ['objectives of the study'] },
  { label: 'Scope and Delimitations', keywords: ['scope and delimitations', 'scope and delimitation'] },
  { label: 'Significance of the Study', keywords: ['significance of the study'] },
  { label: 'Definition of Terms', keywords: ['definition of terms'] },
  { label: 'Chapter 2: Review of Related Lit', keywords: ['chapter 2', 'chapter ii', 'review of related literature'] },
  { label: 'Foreign Literature', keywords: ['foreign literature'] },
  { label: 'Local Literature', keywords: ['local literature'] },
  { label: 'Review of Related Studies', keywords: ['review of related studies'] },
  { label: 'Foreign Studies', keywords: ['foreign studies'] },
  { label: 'Local Studies', keywords: ['local studies'] },
  { label: 'Synthesis', keywords: ['synthesis'] },
  { label: 'Chapter 3: Methodology', keywords: ['chapter 3', 'chapter iii', 'methodology'] },
  { label: 'Research Design', keywords: ['research design', 'type of research'] },
  { label: 'Project Design / Architecture', keywords: ['project design', 'system architecture'] },
  { label: 'Activity / Sequence Diagram', keywords: ['activity diagram', 'sequence diagram'] },
  { label: 'Use Case Diagram', keywords: ['use case diagram'] },
  { label: 'Class Diagram', keywords: ['class diagram'] },
  { label: 'Hardware/Software Specs', keywords: ['hardware specification', 'software specification', 'hardware requirements'] },
  { label: 'Development Method (Agile/Scrum)', keywords: ['agile', 'scrum', 'mobile web development'] },
  { label: 'Algorithm', keywords: ['algorithm'] },
  { label: 'Software Evaluation (ISO)', keywords: ['software evaluation', 'iso'] },
  { label: 'Testing Methods (Alpha/Beta)', keywords: ['testing method', 'alpha and beta'] },
  { label: 'White Box / Black Box Testing', keywords: ['white box', 'black box'] },
  { label: 'Data Gathering Procedure', keywords: ['data gathering procedure'] },
  { label: 'Respondents / Sampling', keywords: ['respondents', 'sampling technique'] },
  { label: 'Statistical Treatment', keywords: ['statistical treatment'] },
];

const BAD_HABITS = [
    { type: 'First Person (Avoid)', words: [' i ', ' we ', ' my ', ' our ', ' us ', ' me '] },
    { type: 'Absolute Term (Avoid)', words: [' always ', ' never ', ' proven ', ' perfect ', ' definitely ', ' obviously '] },
    { type: 'Informal (Avoid)', words: [' huge ', ' amazing ', ' stuff ', ' things ', ' a lot ', ' gonna ', ' wanna '] }
];

export async function POST(req: Request) {
  try {
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    let pages: string[] = [];
    let fullText = '';

    // 3. EXTRACT TEXT WITH PAGE TRACKING
    try {
      if (file.type === 'application/pdf') {
        // Custom render to separate pages
        const options = {
            pagerender: function(pageData: any) {
                return pageData.getTextContent()
                .then(function(textContent: any) {
                    let lastY, text = '';
                    for (let item of textContent.items) {
                        if (lastY == item.transform[5] || !lastY){
                            text += item.str;
                        } else {
                            text += '\n' + item.str; // Preserve line breaks
                        }
                        lastY = item.transform[5];
                    }
                    return text + "#####PAGE_SPLIT#####"; // Inject custom delimiter
                });
            }
        };
        const data = await pdf(buffer, options);
        // Split by our custom delimiter to get array of pages
        pages = data.text.split("#####PAGE_SPLIT#####");
        fullText = data.text.replace(/#####PAGE_SPLIT#####/g, " "); // Clean full text for structure check
      } 
      else if (file.name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        fullText = result.value;
        pages = [fullText]; // DOCX usually comes as one big block, hard to paginate
      } else {
        return NextResponse.json({ error: "Invalid file type. Use PDF or DOCX" }, { status: 400 });
      }
    } catch (parseError: any) {
      console.error("Parsing Error:", parseError);
      return NextResponse.json({ error: "Could not read text." }, { status: 500 });
    }

    const lowerFullText = fullText.toLowerCase();
    
    // --- 4. STRUCTURE ANALYSIS ---
    const found: string[] = [];
    const missing: string[] = [];
    REQUIRED_SECTIONS.forEach((section) => {
      const exists = section.keywords.some((k) => lowerFullText.includes(k));
      if (exists) found.push(section.label);
      else missing.push(section.label);
    });
    const structureScore = Math.round((found.length / REQUIRED_SECTIONS.length) * 100);

    // --- 5. TONE POLICE (With Page/Line Location) ---
    // We scan page by page to find location
    const styleIssues: { word: string, type: string, locations: string[] }[] = [];
    
    BAD_HABITS.forEach(habit => {
        habit.words.forEach(word => {
            const locations: string[] = [];
            
            pages.forEach((pageText, pageIndex) => {
                const lines = pageText.split('\n');
                lines.forEach((line, lineIndex) => {
                    if (line.toLowerCase().includes(word)) {
                        // Limit to 5 occurrences per word to prevent flooding
                        if(locations.length < 5) {
                            locations.push(`Page ${pageIndex + 1}, Line ${lineIndex + 1}`);
                        }
                    }
                });
            });

            if (locations.length > 0) {
                styleIssues.push({ 
                    word: word.trim(), 
                    type: habit.type, 
                    locations 
                });
            }
        });
    });

    // --- 6. CITATION DETECTIVE (With Page Location) ---
    const citationRegex = /\(([A-Za-z\s&]+),\s?\d{4}\)/g;
    
    // Find where citations appear in the text
    const foundCitations: { name: string, full: string, locations: string[] }[] = [];
    
    // First, gather all citations
    const uniqueCitationsMap = new Map<string, { full: string, locations: string[] }>();

    pages.forEach((pageText, pageIndex) => {
         const lines = pageText.split('\n');
         lines.forEach((line, lineIndex) => {
             let match;
             // Reset regex state for each line
             const regex = new RegExp(citationRegex); 
             while ((match = regex.exec(line)) !== null) {
                 const fullCitation = match[0]; // (Smith, 2020)
                 const authorName = match[1].split(',')[0].trim(); // Smith
                 
                 const location = `Page ${pageIndex + 1}, Line ${lineIndex + 1}`;
                 
                 if (!uniqueCitationsMap.has(authorName)) {
                     uniqueCitationsMap.set(authorName, { full: fullCitation, locations: [location] });
                 } else {
                     const entry = uniqueCitationsMap.get(authorName);
                     if (entry && entry.locations.length < 3) {
                         entry.locations.push(location);
                     }
                 }
             }
         });
    });

    // Extract Reference Section
    const refIndex = Math.max(lowerFullText.lastIndexOf('references'), lowerFullText.lastIndexOf('bibliography'));
    const referenceSection = refIndex !== -1 ? lowerFullText.slice(refIndex) : "";

    // Check which ones are missing
    const missingCitations: { text: string, locations: string[] }[] = [];

    uniqueCitationsMap.forEach((value, key) => {
        // loose check: is the author name in the reference section?
        if (!referenceSection.includes(key.toLowerCase())) {
            missingCitations.push({
                text: value.full,
                locations: value.locations
            });
        }
    });

 // ... existing code ...

   // --- 7. READABILITY ANALYSIS (Flesch-Kincaid) ---
    const totalSentences = fullText.split(/[.!?]+/).length || 1;
    const totalWords = fullText.split(/\s+/).length || 1;
    
    // approximate syllable count
    const countSyllables = (word: string) => {
        word = word.toLowerCase();
        if(word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        return word.match(/[aeiouy]{1,2}/g)?.length || 1;
    };
    
    const totalSyllables = fullText.split(/\s+/).reduce((acc, word) => acc + countSyllables(word), 0);
    
    const wordsPerSentence = totalWords / totalSentences;
    const syllablesPerWord = totalSyllables / totalWords;
    
    // Flesch-Kincaid Grade Level
    let gradeLevel = (0.39 * wordsPerSentence) + (11.8 * syllablesPerWord) - 15.59;
    gradeLevel = Math.max(0, Math.min(25, gradeLevel)); 

    // ... existing code (Readability etc.) ...

    // --- 8. ACRONYM AUDITOR ---
    // Find all words with 3+ Uppercase letters (e.g., "SaaS", "IOT")
    const acronymMatches = fullText.match(/\b[A-Z]{3,}\b/g) || [];
    const uniqueAcronyms = [...new Set(acronymMatches)];
    
    // Find definitions: look for pattern " (ACRONYM)"
    // This implies the definition preceded it: "Software as a Service (SaaS)"
    const definedAcronyms = new Set<string>();
    const definitionRegex = /\(([A-Z]{3,})\)/g;
    let defMatch;
    while ((defMatch = definitionRegex.exec(fullText)) !== null) {
        definedAcronyms.add(defMatch[1]);
    }

    // Identify undefined ones
    // We filter out common words like "THE" or "AND" just in case, though 3+ letters helps
    const commonIgnored = ['THE', 'AND', 'FOR', 'NOT', 'BUT', 'CAN', 'ANY', 'ALL'];
    const undefinedAcronyms = uniqueAcronyms.filter(acr => 
        !definedAcronyms.has(acr) && !commonIgnored.includes(acr)
    ).slice(0, 10); // Top 10 only to save space

    // --- 9. FIGURE & TABLE CHECKER ---
    // Heuristic: Captions usually start a line. Mentions are inside sentences.
    const figuresFound = new Set<string>();
    const figuresMentioned = new Set<string>();
    
    pages.forEach(page => {
        const lines = page.split('\n');
        lines.forEach(line => {
            const trimLine = line.trim();
            
            // Detect Captions (Start of line)
            // Matches: "Figure 1", "Fig. 1", "Table 1"
            const captionMatch = trimLine.match(/^(Figure|Fig\.|Table)\s+(\d+)/i);
            if (captionMatch) {
                // Normalize key: "figure-1", "table-2"
                const type = captionMatch[1].toLowerCase().startsWith('t') ? 'table' : 'figure';
                figuresFound.add(`${type}-${captionMatch[2]}`);
            }

            // Detect Mentions (Anywhere in text)
            // Matches: "in Figure 1", "see Table 2"
            const mentionRegex = /(?:in|see|refer to|shown in)\s+(Figure|Fig\.|Table)\s+(\d+)/gi;
            let mention;
            while ((mention = mentionRegex.exec(line)) !== null) {
                const type = mention[1].toLowerCase().startsWith('t') ? 'table' : 'figure';
                figuresMentioned.add(`${type}-${mention[2]}`);
            }
        });
    });

    // Find Orphans (Mentioned but no Caption found)
    const orphans: string[] = [];
    figuresMentioned.forEach(ref => {
        if (!figuresFound.has(ref)) {
            // Convert "figure-1" back to "Figure 1" for display
            const [type, num] = ref.split('-');
            orphans.push(`${type.charAt(0).toUpperCase() + type.slice(1)} ${num}`);
        }
    });

    // Add these 2 new objects to your return JSON:
    return NextResponse.json({
      // ... existing fields ...
      acronyms: {
        defined: Array.from(definedAcronyms),
        undefined: undefinedAcronyms
      },
      figures: {
        count: figuresFound.size,
        orphans: orphans
      },
      // ... existing fields ...
      score: structureScore, 
      readability: { // ... existing readability ... 
          gradeLevel: Math.round(gradeLevel * 10) / 10,
          stats: { sentences: totalSentences, words: totalWords }
      },
      found, missing, styleIssues, citationAnalysis: { totalCitations: uniqueCitationsMap.size, missingRefs: missingCitations }, wordCount: totalWords, fileName: file.name
    });

    return NextResponse.json({
      score: structureScore,
      readability: {
          gradeLevel: Math.round(gradeLevel * 10) / 10, // Round to 1 decimal
          stats: {
             sentences: totalSentences,
             words: totalWords,
             complexWords: 0 // placeholder if you want to expand later
          }
      },
      found,
      missing,
      styleIssues, 
      citationAnalysis: {
        totalCitations: uniqueCitationsMap.size,
        missingRefs: missingCitations 
      },
      wordCount: totalWords,
      fileName: file.name
    });
// ...

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
