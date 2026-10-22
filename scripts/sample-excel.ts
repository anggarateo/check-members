/** Create data/sample-members.xlsx so you can try the import. */
import ExcelJS from "exceljs";

const names = [
  "Budi Santoso", "Budi Hartono", "Siti Aminah", "Ahmad Fauzi", "Dewi Lestari",
  "Rina Wulandari", "Agus Salim", "Putri Ayu Ningsih", "Muhammad Rizky", "Andi Pratama",
  "Budi",
];

async function main() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Members");
  ws.addRow(["No", "Name", "Batch"]);
  names.forEach((n, i) => ws.addRow([i + 1, n, 2020 + (i % 4)]));
  await wb.xlsx.writeFile("data/sample-members.xlsx");
  console.log(`data/sample-members.xlsx created (${names.length} members).`);
}

main();
