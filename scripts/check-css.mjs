import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Two CSS mistakes that fail silently, so this gate catches them instead.
//
// 1. A comment that swallows rules. Deleting a selector but leaving its body
//    after an opened comment hides every rule down to the next '*/'. That is
//    how the reduced-motion reset went missing (J1). A comment body holding a
//    '{' is almost always that.
// 2. A CSS-module class that does not exist. styles.metaSmall on a class the
//    module never defines renders as a missing class attribute with no error
//    anywhere (J2). Every styles.name and styles['name'] a .tsx file reads must
//    appear as .name in the module it imports.
//
// Dynamic lookups (styles[variable]) cannot be checked and are skipped.

const failures = [];
let moduleImports = 0;
let references = 0;

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');
const lineOf = (source, index) => source.slice(0, index).split('\n').length;

const files = walk('src');

for (const file of files.filter((f) => f.endsWith('.css'))) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\/\*[\s\S]*?\*\//g)) {
    if (match[0].includes('{')) {
      failures.push(
        `${file}:${lineOf(source, match.index)}: a comment holds a '{', so it may be hiding rules (it closes on line ${lineOf(source, match.index + match[0].length)})`,
      );
    }
  }
}

const moduleClasses = new Map();
function classesIn(path) {
  if (!moduleClasses.has(path)) {
    const css = stripComments(readFileSync(path, 'utf8'));
    moduleClasses.set(path, new Set([...css.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)].map((m) => m[1])));
  }
  return moduleClasses.get(path);
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const file of files.filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))) {
  const source = readFileSync(file, 'utf8');
  const importPattern = /^import\s+(\w+)\s+from\s+(['"])([^'"]+\.module\.css)\2;?\s*$/gm;
  const imports = [...source.matchAll(importPattern)];
  if (!imports.length) continue;
  const body = source.replace(importPattern, '');

  for (const [, name, , specifier] of imports) {
    moduleImports++;
    const cssPath = specifier.startsWith('@/')
      ? join('src', specifier.slice(2))
      : join(dirname(file), specifier);
    if (!existsSync(cssPath)) {
      failures.push(`${file}: imports ${specifier}, which does not exist`);
      continue;
    }
    const defined = classesIn(cssPath);
    const used = new Set();
    const ident = escape(name);
    for (const match of body.matchAll(new RegExp(`(?<![\\w.$])${ident}\\.([A-Za-z_$][\\w$]*)`, 'g'))) {
      used.add(match[1]);
    }
    for (const match of body.matchAll(new RegExp(`(?<![\\w.$])${ident}\\[\\s*(['"\`])([^'"\`$]+)\\1\\s*\\]`, 'g'))) {
      used.add(match[2]);
    }
    for (const className of used) {
      if (defined.has(className)) references++;
      else failures.push(`${file}: ${name}.${className} is not a class in ${cssPath}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `CSS check passed: no comment hides a rule, and ${references} class references across ${moduleImports} module imports resolve.`,
  );
}
