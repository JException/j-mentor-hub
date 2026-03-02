import React from 'react';

export default function GradingReport({ group, evaluation }: any) {
  return (
    <div className="print-only p-8 bg-white text-black font-serif" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* HEADER - Mimics the spreadsheet top section */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold uppercase">Oral Defense Group Grade Sheet</h1>
        <p className="text-sm italic">Project Management for CS - SE</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div><strong>GROUP NAME:</strong> {group.groupName}</div>
        <div><strong>DATE:</strong> {group.defense.date}</div>
        <div className="col-span-2"><strong>THESIS TITLE:</strong> {group.thesisTitle}</div>
      </div>

      {/* THE TABLE - Mimics the spreadsheet grid */}
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 w-1/2">CRITERIA AND WEIGHT</th>
            <th className="border border-black p-2">SCORE (1-5)</th>
            <th className="border border-black p-2">WEIGHTED</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2">Background of the Study (x1)</td>
            <td className="border border-black p-2 text-center">{evaluation.scores.paperRaw.background}</td>
            <td className="border border-black p-2 text-center">{evaluation.scores.paperRaw.background * 1}</td>
          </tr>
          <tr>
            <td className="border border-black p-2">Objectives (x2)</td>
            <td className="border border-black p-2 text-center">{evaluation.scores.paperRaw.objectives}</td>
            <td className="border border-black p-2 text-center">{evaluation.scores.paperRaw.objectives * 2}</td>
          </tr>
          {/* Add all other rows from your CSV here */}
        </tbody>
        <tfoot>
          <tr className="font-bold">
            <td className="border border-black p-2 text-right">TOTAL DOCUMENTATION (65 pts)</td>
            <td colSpan={2} className="border border-black p-2 text-center">{evaluation.scores.paperCalculated}</td>
          </tr>
        </tfoot>
      </table>

      {/* COMMENTS SECTION */}
      <div className="mt-8">
        <h3 className="font-bold border-b border-black mb-2">COMMENTS:</h3>
        <div className="p-4 border border-dashed border-gray-400 min-h-[100px]">
          {evaluation.comments.map((c: string, i: number) => (
            <p key={i} className="mb-1">• {c}</p>
          ))}
        </div>
      </div>

      <div className="mt-12 flex justify-between">
        <div className="text-center">
          <div className="border-b border-black w-48 mb-1"></div>
          <p className="text-xs uppercase font-bold">Panelist Signature</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold uppercase">{evaluation.evaluator}</p>
          <p className="text-[10px]">Printed from Hubble System</p>
        </div>
      </div>
    </div>
  );
}