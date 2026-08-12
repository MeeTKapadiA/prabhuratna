import { todayLocalDate } from './calcService';

export async function exportToExcel(data, fileName = 'report') {
  if (!data || !Array.isArray(data) || data.length === 0) {
    alert('No data available to export');
    return;
  }

  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('DataReport');

  const keys = Object.keys(data[0]);
  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.max(12, String(key).length + 4)
  }));

  data.forEach((row) => {
    const normalized = {};
    keys.forEach((key) => {
      const value = row[key];
      normalized[key] = value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    });
    worksheet.addRow(normalized);
  });

  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}_${todayLocalDate()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
