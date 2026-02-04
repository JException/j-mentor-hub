import ThesisScanner from '../../components/ThesisScanner';

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900">Document Scanner</h1>
            <p className="text-slate-500">Version 1.0 - Testing Phase</p>
        </div>
        <ThesisScanner />
      </div>
    </div>
  );
}