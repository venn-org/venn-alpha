/**
 * Bulk-replace supabase.auth.getUser() calls with getCurrentUserId() from lib/auth.
 *
 * Run with: node scripts/migrate-auth-calls.js
 *
 * This script handles two patterns:
 * 1. const { data: { user } } = await supabase.auth.getUser();  → user.id becomes uid
 * 2. const { data: authData } = await supabase.auth.getUser();   → authData?.user?.id becomes uid
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Files that need updating (from grep results)
const files = [
  // Onboarding
  'app/(onboarding)/name.jsx',
  'app/(onboarding)/birthday.jsx',
  'app/(onboarding)/gender.jsx',
  'app/(onboarding)/pronouns.jsx',
  'app/(onboarding)/lifestyle.jsx',
  'app/(onboarding)/account-type.jsx',
  'app/(onboarding)/photos.jsx',
  'app/(onboarding)/preferences.jsx',
  'app/(onboarding)/notifications.jsx',
  // Tabs
  'app/(tabs)/_layout.jsx',
  'app/(tabs)/feed.jsx',
  'app/(tabs)/standouts.jsx',
  'app/(tabs)/likes.jsx',
  'app/(tabs)/messages.jsx',
  'app/(tabs)/chat.jsx',
  'app/(tabs)/notifications.jsx',
  'app/(tabs)/profile.jsx',
  // Components
  'components/ReportSheet.jsx',
  'components/PreferencesSheet.jsx',
];

let totalReplacements = 0;

for (const relPath of files) {
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    console.log(`SKIP (not found): ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf-8');
  const original = content;
  let replacements = 0;

  // Add import for getCurrentUserId if not already present
  const needsImport = content.includes('supabase.auth');
  if (needsImport && !content.includes('getCurrentUserId')) {
    // Add import at the top (after existing imports)
    const lastImportIdx = content.lastIndexOf("import ");
    if (lastImportIdx !== -1) {
      const lineEnd = content.indexOf('\n', lastImportIdx);
      content = content.slice(0, lineEnd + 1)
        + "import { getCurrentUserId } from '../../lib/auth';\n"
        + content.slice(lineEnd + 1);
      // Fix relative path for components (one level up, not two)
      if (relPath.startsWith('components/')) {
        content = content.replace("from '../../lib/auth'", "from '../lib/auth'");
      }
    }
  }

  // Pattern 1: const { data: { user } } = await supabase.auth.getUser();
  // Replace with: const uid = getCurrentUserId();
  // Then replace user.id with uid
  content = content.replace(
    /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);/g,
    () => { replacements++; return 'const uid = getCurrentUserId();'; }
  );

  // Pattern 2: const { data: authData } = await supabase.auth.getUser();
  // Replace with: const uid = getCurrentUserId();
  content = content.replace(
    /const \{ data: authData \} = await supabase\.auth\.getUser\(\);/g,
    () => { replacements++; return 'const uid = getCurrentUserId();'; }
  );

  // Pattern 3: const { data: { user } } = await supabase.auth.getUser()
  // (without semicolon — found in some chained calls)
  content = content.replace(
    /const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\)/g,
    () => { replacements++; return 'const uid = getCurrentUserId()'; }
  );

  // Replace user.id references (that came from pattern 1)
  content = content.replace(/user\.id/g, 'uid');

  // Replace authData?.user?.id references (that came from pattern 2)
  content = content.replace(/authData\?\.user\?\.id/g, 'uid');

  // Replace supabase.auth.signOut() with signOutUser()
  if (content.includes('supabase.auth.signOut()')) {
    content = content.replace(/supabase\.auth\.signOut\(\)/g, 'signOutUser()');
    // Add signOutUser import
    if (content.includes("from '../../lib/auth'")) {
      content = content.replace(
        "import { getCurrentUserId } from '../../lib/auth'",
        "import { getCurrentUserId, signOutUser } from '../../lib/auth'"
      );
    } else if (content.includes("from '../lib/auth'")) {
      content = content.replace(
        "import { getCurrentUserId } from '../lib/auth'",
        "import { getCurrentUserId, signOutUser } from '../lib/auth'"
      );
    }
    replacements++;
  }

  // Handle: (await supabase.auth.getUser()).data?.user?.id
  content = content.replace(
    /\(await supabase\.auth\.getUser\(\)\)\.data\?\.user\?\.id/g,
    () => { replacements++; return 'getCurrentUserId()'; }
  );

  if (content !== original) {
    fs.writeFileSync(absPath, content, 'utf-8');
    totalReplacements += replacements;
    console.log(`UPDATED: ${relPath} (${replacements} replacements)`);
  } else {
    console.log(`NO CHANGE: ${relPath}`);
  }
}

console.log(`\nDone. Total replacements: ${totalReplacements}`);
