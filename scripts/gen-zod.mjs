// Turunkan skema zod dari contract/openapi.json supaya aturan validasi di
// form sama persis dengan aturan server (SCRUM-109). Jalankan lewat
// `npm run gen:zod` setiap kali contract disalin ulang dari server.
//
// Sengaja kecil: hanya kata kunci JSON Schema yang dipakai contract kita
// yang didukung. Kata kunci lain membuat skrip gagal, supaya aturan baru
// dari server tidak diam-diam terlewat di sisi klien.

import { readFileSync, writeFileSync } from "node:fs";

const CONTRACT = "contract/openapi.json";
const OUTPUT = "src/lib/generated/caseSchema.ts";
const ROOTS = ["CaseWrite"];

const SUPPORTED = new Set([
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "anyOf",
  "$ref",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "minItems",
  // Hanya dokumentasi, tidak memengaruhi validasi.
  "title",
  "description",
]);

const schemas = JSON.parse(readFileSync(CONTRACT, "utf8")).components.schemas;

function refName(ref) {
  return ref.replace("#/components/schemas/", "");
}

function assertSupported(schema, where) {
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED.has(key)) {
      throw new Error(`${where}: kata kunci "${key}" belum didukung gen-zod`);
    }
  }
}

function number(value) {
  // JSON Schema dari Pydantic menulis batas integer sebagai float (9999.0).
  return String(Number(value));
}

function expression(schema, where) {
  assertSupported(schema, where);

  if (schema.$ref) return `${refName(schema.$ref)}Schema`;

  if (schema.anyOf) {
    const branches = schema.anyOf.filter((branch) => branch.type !== "null");
    const nullable = branches.length < schema.anyOf.length;
    if (branches.length !== 1) throw new Error(`${where}: anyOf hanya boleh satu tipe plus null`);
    const inner = expression(branches[0], where);
    return nullable ? `${inner}.nullable()` : inner;
  }

  if (schema.enum) return `z.enum(${JSON.stringify(schema.enum)})`;

  switch (schema.type) {
    case "string": {
      let out = "z.string()";
      if (schema.minLength !== undefined) out += `.min(${schema.minLength})`;
      if (schema.maxLength !== undefined) out += `.max(${schema.maxLength})`;
      if (schema.pattern !== undefined) out += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
      return out;
    }
    case "integer": {
      let out = "z.number().int()";
      if (schema.minimum !== undefined) out += `.min(${number(schema.minimum)})`;
      if (schema.maximum !== undefined) out += `.max(${number(schema.maximum)})`;
      return out;
    }
    case "array": {
      let out = `z.array(${expression(schema.items, `${where}[]`)})`;
      if (schema.minItems !== undefined) out += `.min(${schema.minItems})`;
      return out;
    }
    case "object": {
      const required = new Set(schema.required ?? []);
      const fields = Object.entries(schema.properties ?? {}).map(([name, property]) => {
        const inner = expression(property, `${where}.${name}`);
        return `  ${name}: ${required.has(name) ? inner : `${inner}.optional()`},`;
      });
      return `z.object({\n${fields.join("\n")}\n})`;
    }
    default:
      throw new Error(`${where}: tipe "${schema.type}" belum didukung gen-zod`);
  }
}

// Skema yang dirujuk harus ditulis lebih dulu dari yang merujuknya.
const ordered = [];
function visit(name) {
  if (ordered.includes(name)) return;
  const schema = schemas[name];
  if (!schema) throw new Error(`Skema ${name} tidak ada di ${CONTRACT}`);
  JSON.stringify(schema, (key, value) => {
    if (key === "$ref") visit(refName(value));
    return value;
  });
  ordered.push(name);
}
ROOTS.forEach(visit);

const body = ordered
  .map((name) => `export const ${name}Schema = ${expression(schemas[name], name)};`)
  .join("\n\n");

writeFileSync(
  OUTPUT,
  `// Dibuat oleh scripts/gen-zod.mjs dari ${CONTRACT}. Jangan diedit manual.\n\nimport { z } from "zod";\n\n${body}\n`,
);
console.log(`gen-zod: ${ordered.join(", ")} -> ${OUTPUT}`);
