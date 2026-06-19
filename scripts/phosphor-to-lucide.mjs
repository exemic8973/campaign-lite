import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const map = {
  ChartBar: 'BarChart3',
  Users: 'Users',
  Stack: 'Layers',
  Megaphone: 'Megaphone',
  FileText: 'FileText',
  Gear: 'Settings',
  SignOut: 'LogOut',
  Sun: 'Sun',
  Moon: 'Moon',
  User: 'User',
  MagnifyingGlass: 'Search',
  Upload: 'Upload',
  Plus: 'Plus',
  Trash: 'Trash2',
  CaretLeft: 'ChevronLeft',
  CaretRight: 'ChevronRight',
  Funnel: 'Filter',
  Code: 'Code',
  Envelope: 'Mail',
  GoogleLogo: 'Chrome',
  PaperPlaneTilt: 'Send',
  EnvelopeOpen: 'MailOpen',
  CursorClick: 'MousePointerClick',
  Warning: 'AlertTriangle',
  Prohibit: 'Ban',
  ArrowLeft: 'ArrowLeft',
  Database: 'Database',
  Key: 'Key',
  X: 'X',
  Check: 'Check',
  CaretDown: 'ChevronDown',
};

const files = globSync('src/**/*.{ts,tsx}');
let totalFiles = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  // Replace import
  content = content.replace(
    /import\s+\{([^}]+)\}\s+from\s+["']@phosphor-icons\/react["']/g,
    (match, names) => {
      const mapped = names.split(',').map(n => {
        const trimmed = n.trim();
        const lucide = map[trimmed] || trimmed;
        return `  ${lucide}`;
      }).join(',\n');
      return `import {\n${mapped}\n} from "lucide-react"`;
    }
  );

  if (content !== original) {
    writeFileSync(file, content);
    totalFiles++;
    console.log(`Updated: ${file}`);
  }
}

console.log(`\nDone. Updated ${totalFiles} files.`);
