export type Column = { key: string; label: string };

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export async function exportCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: Column[],
) {
  const { default: Papa } = await import("papaparse");
  const csv = Papa.unparse({
    fields: columns.map((c) => c.label),
    data: rows.map((row) => columns.map((c) => toCellValue(row[c.key]))),
  });
  triggerDownload(filename, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

export async function exportXlsx(
  filename: string,
  rows: Record<string, unknown>[],
  columns: Column[],
  sheetName = "Sheet1",
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 20 }));
  for (const row of rows) {
    sheet.addRow(columns.reduce((acc, c) => ({ ...acc, [c.key]: toCellValue(row[c.key]) }), {}));
  }
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    filename,
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
}

export async function downloadTemplate(filename: string, columns: Column[], example: Record<string, unknown>) {
  await exportCsv(filename, [example], columns);
}

export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");

  if (isCsv) {
    const { default: Papa } = await import("papaparse");
    const text = await file.text();
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  }

  const { default: ExcelJS } = await import("exceljs");
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) record[header] = String(cell.value ?? "").trim();
    });
    if (Object.values(record).some((v) => v !== "")) rows.push(record);
  });

  return rows;
}
