from pathlib import Path

path = Path('js/global_access.js')
text = path.read_text(encoding='utf-8')
original = text

text = text.replace(
    'import { supabase } from "/js/supabase_client.js";',
    'import { supabase, waitForSupabaseSession } from "/js/supabase_client.js";',
    1,
)

old = '''async function getSessionOrNull() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}
'''
new = '''async function getSessionOrNull() {
  try {
    return await waitForSupabaseSession({
      timeoutMs: 4500,
      intervalMs: 180,
      restoreFromBackup: true
    });
  } catch {
    return null;
  }
}
'''
if old not in text:
    raise SystemExit('getSessionOrNull block not found')
text = text.replace(old, new, 1)

if text == original:
    raise SystemExit('No changes produced')

path.write_text(text, encoding='utf-8')
print('Patched global_access.js to wait for persisted Supabase session')
