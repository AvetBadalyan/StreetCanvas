/* Throwaway: classify .js files as JSX or plain using esbuild's parser. */
const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".js")) out.push(p);
  }
  return out;
};

const files = walk("src");
const jsx = [];
const plain = [];

for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  try {
    esbuild.transformSync(code, { loader: "js" });
    plain.push(file);
  } catch {
    jsx.push(file);
  }
}

const norm = (p) => p.split(path.sep).join("/");

console.log(`JSX files (rename to .jsx): ${jsx.length}`);
console.log(`plain JS (keep .js):        ${plain.length}`);
console.log("\nplain files:");
plain.forEach((f) => console.log("  " + norm(f)));

fs.writeFileSync(".jsx-list.txt", jsx.map(norm).join("\n") + "\n");
