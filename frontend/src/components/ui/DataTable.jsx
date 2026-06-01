export default function DataTable({ columns, rows, keyField = 'id', empty = 'No records found' }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className="px-4 py-3">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row[keyField] || index} className="text-slate-700 dark:text-slate-200">
                {columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-4 py-3">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

