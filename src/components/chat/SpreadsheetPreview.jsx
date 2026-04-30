import { TableIcon } from 'lucide-react';

export default function SpreadsheetPreview({ spreadsheet, onClick }) {
  const data = (() => { try { return JSON.parse(spreadsheet.data || '[]'); } catch { return []; } })();
  const previewRows = data.slice(0, 6);
  const previewCols = Math.min((previewRows[0]?.length || 0), 8);

  return (
    <div
      onClick={onClick}
      className="mt-2 w-full rounded-lg border border-[hsl(225,9%,20%)] bg-[hsl(220,8%,16%)] overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[hsl(225,9%,15%)]">
        <TableIcon className="h-3.5 w-3.5 text-green-400" />
        <span className="text-xs font-semibold text-green-400">{spreadsheet.title || 'Spreadsheet'}</span>
        <span className="text-[10px] text-[hsl(220,7%,45%)] ml-auto">
          {spreadsheet.num_rows || 20} × {spreadsheet.num_cols || 10} · Click to edit
        </span>
      </div>

      {/* Preview grid */}
      <div className="overflow-hidden">
        {previewRows.length > 0 ? (
          <table className="w-full text-[10px] border-collapse">
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-[hsl(220,8%,17%)]' : 'bg-[hsl(220,8%,15%)]'}>
                  {Array.from({ length: previewCols }).map((_, ci) => (
                    <td
                      key={ci}
                      className="border border-[hsl(225,9%,13%)] px-1.5 py-0.5 text-[hsl(220,7%,70%)] max-w-[80px] truncate"
                    >
                      {row[ci] ?? ''}
                    </td>
                  ))}
                  {data[0]?.length > 8 && ri === 0 && <td className="px-1.5 py-0.5 text-[hsl(220,7%,40%)]">...</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-4 text-center text-[10px] text-[hsl(220,7%,40%)]">Empty spreadsheet — click to open</div>
        )}
        {data.length > 6 && (
          <div className="text-center text-[10px] text-[hsl(220,7%,40%)] py-1 border-t border-[hsl(225,9%,13%)]">
            +{data.length - 6} more rows
          </div>
        )}
      </div>
    </div>
  );
}