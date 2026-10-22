/**
 * Import members from an Excel file (.xlsx).
 *
 *   npm run import -- data/members.xlsx
 *   npm run import -- data/members.xlsx --sheet "Sheet1" --column "Full Name"
 *   npm run import -- data/members.xlsx --replace    # delete members that are not in the file
 *
 * The first row is the header. The name column is found automatically (header "name"),
 * or set it with --column.
 */
import ExcelJS from "exceljs";
import { parseArgs } from "node:util";
import { normalizeName } from "../src/lib/normalize";
import { createPool } from "./_env";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    sheet: { type: "string" },
    column: { type: "string" },
    replace: { type: "boolean", default: false },
  },
});

const file = positionals[0];
if (!file) {
  console.error("Usage: npm run import -- <file.xlsx> [--sheet name] [--column header] [--replace]");
  process.exit(1);
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text);
    if ("result" in value) return String(value.result ?? "");
  }
  return String(value);
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const ws = values.sheet ? wb.getWorksheet(values.sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`Sheet "${values.sheet}" not found`);

  const header = ws.getRow(1);
  const target = (values.column ?? "name").trim().toLowerCase();
  let nameColumn = 0;
  header.eachCell((cell, col) => {
    if (!nameColumn && cellText(cell.value).trim().toLowerCase() === target) nameColumn = col;
  });
  if (!nameColumn) throw new Error(`Header column "${values.column ?? "name"}" not found in row 1`);

  const unique = new Map<string, string>(); // search_name -> display name
  let empty = 0;
  const duplicates: string[] = [];

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const name = cellText(row.getCell(nameColumn).value).replace(/\s+/g, " ").trim();
    const key = normalizeName(name);
    if (!key) return void empty++;
    if (unique.has(key)) duplicates.push(`row ${rowNumber}: ${name}`);
    else unique.set(key, name);
  });

  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const keys = [...unique.keys()];
    const names = [...unique.values()];

    // One query for all rows; safe for thousands of members.
    const result = await client.query(
      `INSERT INTO members (name, search_name)
       SELECT * FROM unnest($1::text[], $2::text[])
       ON CONFLICT (search_name) DO UPDATE
         SET name = EXCLUDED.name, updated_at = now()
         WHERE members.name IS DISTINCT FROM EXCLUDED.name`,
      [names, keys],
    );

    let deleted = 0;
    if (values.replace) {
      const del = await client.query("DELETE FROM members WHERE NOT (search_name = ANY($1::text[]))", [keys]);
      deleted = del.rowCount ?? 0;
    }
    await client.query("COMMIT");

    console.log(`Sheet "${ws.name}", column ${nameColumn}`);
    console.log(`  ${unique.size} unique names read, ${result.rowCount} added/updated`);
    if (values.replace) console.log(`  ${deleted} members deleted because they are not in the file`);
    if (empty) console.log(`  ${empty} empty rows skipped`);
    if (duplicates.length) {
      console.log(`  ${duplicates.length} duplicates skipped:`);
      duplicates.slice(0, 20).forEach((d) => console.log(`    - ${d}`));
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Import failed:", err.message);
  process.exit(1);
});
