import fs from "node:fs";

const sourcePath = new URL("../public/site-preview/site.css", import.meta.url);
const outputPath = new URL("../public/site-preview/site.min.css", import.meta.url);

function minifyCss(input) {
  let stripped = "";
  let quote = null;
  let escaped = false;
  let comment = false;

  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    const n = input[i + 1];

    if (comment) {
      if (c === "*" && n === "/") {
        comment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      stripped += c;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }

    if (c === "'" || c === '"') {
      quote = c;
      stripped += c;
      continue;
    }

    if (c === "/" && n === "*") {
      comment = true;
      i += 1;
      continue;
    }

    stripped += c;
  }

  const punctuation = new Set(["{", "}", ":", ";", ",", ">", "~", "(", ")"]);
  let output = "";
  quote = null;
  escaped = false;

  for (let i = 0; i < stripped.length; i += 1) {
    const c = stripped[i];

    if (quote) {
      output += c;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }

    if (c === "'" || c === '"') {
      quote = c;
      output += c;
      continue;
    }

    if (/\\s/.test(c)) {
      let j = i + 1;
      while (j < stripped.length && /\\s/.test(stripped[j])) j += 1;
      const previous = output[output.length - 1] || "";
      const next = stripped[j] || "";
      if (!previous || !next || punctuation.has(previous) || punctuation.has(next)) {
        i = j - 1;
        continue;
      }
      output += " ";
      i = j - 1;
      continue;
    }

    if (punctuation.has(c)) {
      if (output.endsWith(" ")) output = output.slice(0, -1);
      if (c === "}" && output.endsWith(";")) output = output.slice(0, -1);
      output += c;
      continue;
    }

    output += c;
  }

  return output.trim();
}

const source = fs.readFileSync(sourcePath, "utf8");
const minified = minifyCss(source);

if (!minified.includes("--gx3-gold:#D5AE58")) {
  throw new Error("WEB-DS V3 token missing after CSS minification.");
}
if ((minified.match(/{/g) || []).length !== (minified.match(/}/g) || []).length) {
  throw new Error("Generated CSS has unbalanced braces.");
}

fs.writeFileSync(outputPath, minified + "\n", "utf8");
console.log(`site.css: ${Buffer.byteLength(source)} bytes`);
console.log(`site.min.css: ${Buffer.byteLength(minified)} bytes`);
