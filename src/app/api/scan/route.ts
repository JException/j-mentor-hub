import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

// 1. GLOBAL FIXES (TypeScript Safe)
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

    // 3. EXTRACT TEXT
    if (file.type === 'application/pdf') {
        const options = {
            pagerender: function(pageData: any) {
                return pageData.getTextContent().then(function(textContent: any) {
                    let lastY, text = '';
                    for (let item of textContent.items) {
                        if (lastY == item.transform[5] || !lastY) text += item.str;
                        else text += '\n' + item.str;
                        lastY = item.transform[5];
                    }
                    return text + "#####PAGE_SPLIT#####";
                });
            }
        };
        const data = await pdf(buffer, options);
        pages = data.text.split("#####PAGE_SPLIT#####");
        fullText = data.text.replace(/#####PAGE_SPLIT#####/g, " ");
    } else if (file.name.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        fullText = result.value;
        pages = [fullText];
    }

    const lowerFullText = fullText.toLowerCase();
    
    // --- 4. STRUCTURE ANALYSIS ---
    const found: string[] = [];
    const missing: string[] = [];
    REQUIRED_SECTIONS.forEach((section) => {
      if (section.keywords.some((k) => lowerFullText.includes(k))) found.push(section.label);
      else missing.push(section.label);
    });
    const structureScore = Math.round((found.length / REQUIRED_SECTIONS.length) * 100);

    // --- 5. TONE POLICE ---
    const styleIssues: any[] = [];
    BAD_HABITS.forEach(habit => {
        habit.words.forEach(word => {
            const locations: string[] = [];
            pages.forEach((pageText, pIdx) => {
                if (pageText.toLowerCase().includes(word) && locations.length < 5) {
                    locations.push(`Page ${pIdx + 1}`);
                }
            });
            if (locations.length > 0) styleIssues.push({ word: word.trim(), type: habit.type, locations });
        });
    });

    // --- 6. CITATION DETECTIVE ---
    const citationRegex = /\(([A-Za-z\s&]+),\s?\d{4}\)/g;
    const uniqueCitationsMap = new Map<string, { full: string, locations: string[] }>();
    pages.forEach((pageText, pageIndex) => {
        let match;
        const regex = new RegExp(citationRegex); 
        while ((match = regex.exec(pageText)) !== null) {
            const authorName = match[1].split(',')[0].trim();
            if (!uniqueCitationsMap.has(authorName)) {
                uniqueCitationsMap.set(authorName, { full: match[0], locations: [`Page ${pageIndex + 1}`] });
            }
        }
    });

    const refIndex = Math.max(lowerFullText.lastIndexOf('references'), lowerFullText.lastIndexOf('bibliography'));
    const referenceSection = refIndex !== -1 ? lowerFullText.slice(refIndex) : "";
    const missingCitations: any[] = [];
    uniqueCitationsMap.forEach((value, key) => {
        if (!referenceSection.includes(key.toLowerCase())) {
            missingCitations.push({ text: value.full, locations: value.locations });
        }
    });

    // --- 7. REFERENCE RECENCY (New) ---
    const yearRegex = /\b(19|20)\d{2}\b/g;
    const yearsFound = referenceSection.match(yearRegex)?.map(Number) || [];
    const currentYear = 2026;
    const last5Years = yearsFound.filter(y => y >= currentYear - 5 && y <= currentYear).length;
    const percentageRecent = yearsFound.length > 0 ? Math.round((last5Years / yearsFound.length) * 100) : 0;

    // --- 8. READABILITY ---
    const totalSentences = fullText.split(/[.!?]+/).length || 1;
    const totalWords = fullText.split(/\s+/).length || 1;
    const gradeLevel = Math.max(0, Math.min(25, (0.39 * (totalWords / totalSentences)) + 10));

    // --- 9. ACRONYMS & FIGURES ---
    const acronymMatches = fullText.match(/\b[A-Z]{3,}\b/g) || [];
    const definedAcronyms = Array.from(new Set(fullText.match(/\(([A-Z]{3,})\)/g)?.map(m => m.replace(/[()]/g, "")) || []));
    const undefinedAcronyms = [...new Set(acronymMatches)].filter(a => !definedAcronyms.includes(a)).slice(0, 10);

    const figuresFound = (fullText.match(/^(Figure|Fig\.|Table)\s+(\d+)/gim) || []).length;

    // --- 10. PANEL READINESS SCORE (New) ---
    const readinessFactors = [
        {
            label: "Structure",
            score: structureScore,
            status: structureScore > 85 ? 'pass' : 'warning',
            message: structureScore > 85 ? "Required sections detected." : "Missing critical chapters."
        },
        {
            label: "Citations",
            score: missingCitations.length === 0 ? 100 : 50,
            status: missingCitations.length === 0 ? 'pass' : 'fail',
            message: missingCitations.length === 0 ? "All sources documented." : "Unsynced citations found."
        },
        {
            label: "Recency",
            score: percentageRecent,
            status: percentageRecent > 60 ? 'pass' : 'warning',
            message: percentageRecent > 60 ? "Literature is current." : "Old sources detected."
        }
    ];
    const overallReadiness = Math.round(readinessFactors.reduce((acc, f) => acc + f.score, 0) / 3);

    // --- FINAL CONSOLIDATED RETURN ---
    return NextResponse.json({
        fileName: file.name,
        wordCount: totalWords,
        score: structureScore,
        found,
        missing,
        styleIssues,
        readability: {
            gradeLevel: Math.round(gradeLevel * 10) / 10,
            stats: { sentences: totalSentences, words: totalWords }
        },
        citationAnalysis: {
            totalCitations: uniqueCitationsMap.size,
            missingRefs: missingCitations
        },
        acronyms: {
            defined: definedAcronyms,
            undefined: undefinedAcronyms
        },
        figures: {
            count: figuresFound,
            orphans: [] 
        },
        referenceRecency: {
            total: yearsFound.length,
            last5Years,
            older: yearsFound.length - last5Years,
            percentageRecent,
            yearsFound: yearsFound.slice(0, 20) // Send sample
        },
        readinessScore: {
            overall: overallReadiness,
            factors: readinessFactors
        }
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}