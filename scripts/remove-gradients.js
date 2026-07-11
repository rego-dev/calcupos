const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', 'src');
const exts = ['.tsx', '.ts', '.js', '.jsx'];
let filesModified = 0;

// Only match class tokens that begin at a class-list boundary (whitespace, quote,
// backtick, brace or paren). This prevents matching substrings inside identifiers
// (e.g. the "to-" inside "photo-blue"). An optional Tailwind variant chain
// (dark:, hover:, group-hover:, md:, ...) is consumed together with the token so
// nothing like a dangling "dark:" is left behind.
const BOUNDARY = "(?<=[\\s\"'`{(])";
const VARIANT = '(?:[\\w-]+:)*';

const COLORS =
  'transparent|current|white|black|amber|zinc|slate|stone|gray|neutral|' +
  'red|orange|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|' +
  'purple|fuchsia|pink|rose';

function replaceGradients(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  content = content
    // gradient direction utilities: bg-gradient-to-r, hover:bg-gradient-to-br, ...
    .replace(new RegExp(BOUNDARY + VARIANT + 'bg-gradient-to-[a-z]{1,3}\\b', 'g'), '')
    // gradient color stops
    .replace(new RegExp(BOUNDARY + VARIANT + 'from-[^\\s"\'`]+', 'g'), '')
    .replace(new RegExp(BOUNDARY + VARIANT + 'via-[^\\s"\'`]+', 'g'), '')
    .replace(new RegExp(BOUNDARY + VARIANT + 'to-(?:' + COLORS + ')[^\\s"\'`]*', 'g'), '')
    // text gradients -> solid amber so text stays visible
    .replace(new RegExp(BOUNDARY + VARIANT + 'bg-clip-text\\b', 'g'), '')
    .replace(new RegExp(BOUNDARY + VARIANT + 'text-transparent\\b', 'g'), 'text-amber-500')
    // named brand gradient -> solid amber
    .replace(new RegExp(BOUNDARY + VARIANT + 'bg-gradient-brand\\b', 'g'), 'bg-amber-500')
    // inline CSS gradients
    .replace(/linear-gradient\([^)]*\)/g, '')
    .replace(/radial-gradient\([^)]*\)/g, '')
    // Tidy up ONLY the inside of double-quoted className strings (collapse the
    // gaps left by removed tokens). This never touches newlines or indentation
    // because a JS double-quoted string literal cannot contain a raw newline.
    .replace(/className="([^"\n]*)"/g, (m, cls) => `className="${cls.replace(/\s{2,}/g, ' ').trim()}"`);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    filesModified++;
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (exts.includes(path.extname(entry.name))) {
      replaceGradients(fullPath);
    }
  }
}

walk(rootDir);
console.log(`Gradient cleanup completed. Files modified: ${filesModified}`);
