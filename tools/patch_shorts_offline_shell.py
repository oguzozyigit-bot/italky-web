from pathlib import Path

path = Path('pages/hosgeldiniz.html')
s = path.read_text(encoding='utf-8')

marker = '''  </script>\n  <style>'''
registration = '''  </script>\n  <script>\n    try{\n      if('serviceWorker' in navigator){\n        window.addEventListener('load',()=>{\n          navigator.serviceWorker.register('/shorts-shell-sw.js',{scope:'/'}).catch(()=>{});\n        },{once:true});\n      }\n    }catch{}\n  </script>\n  <style>'''
if "shorts-shell-sw.js" not in s:
    if marker not in s:
        raise SystemExit('service worker registration insertion point not found')
    s = s.replace(marker, registration, 1)

old_imports = '''    import {\n      supabase,\n      waitForSupabaseSession,\n      removeSupabaseSessionBackup\n    } from '/js/supabase_client.js';\n    import { buildFromItalkyUrl } from '/js/icany_bridge.js';\n\n    const frame=document.getElementById('shortsFrame');'''
new_imports = '''    let authModulesPromise=null;\n    async function loadAuthModules(){\n      if(!authModulesPromise){\n        authModulesPromise=Promise.all([\n          import('/js/supabase_client.js'),\n          import('/js/icany_bridge.js')\n        ]).then(([auth,bridge])=>({\n          supabase:auth.supabase,\n          waitForSupabaseSession:auth.waitForSupabaseSession,\n          removeSupabaseSessionBackup:auth.removeSupabaseSessionBackup,\n          buildFromItalkyUrl:bridge.buildFromItalkyUrl\n        }));\n      }\n      return authModulesPromise;\n    }\n\n    const frame=document.getElementById('shortsFrame');'''
if old_imports in s:
    s = s.replace(old_imports, new_imports, 1)
elif 'let authModulesPromise=null;' not in s:
    raise SystemExit('static auth imports target not found')

old_logout = '''      try{ removeSupabaseSessionBackup(); }catch{}\n      try{ await supabase.auth.signOut({scope:'local'}); }catch{}\n      try{ await supabase.auth.signOut(); }catch{}\n      try{ localStorage.removeItem('italky_supabase_session_backup'); }catch{}\n      try{ sessionStorage.clear(); }catch{}'''
new_logout = '''      let auth=null;\n      try{ auth=await loadAuthModules(); }catch{}\n      try{ auth?.removeSupabaseSessionBackup?.(); }catch{}\n      try{ await auth?.supabase?.auth?.signOut?.({scope:'local'}); }catch{}\n      try{ await auth?.supabase?.auth?.signOut?.(); }catch{}\n      try{ localStorage.removeItem('italky_supabase_session_backup'); }catch{}\n      try{ sessionStorage.clear(); }catch{}'''
if old_logout in s:
    s = s.replace(old_logout, new_logout, 1)
elif 'let auth=null;' not in s:
    raise SystemExit('logout patch target not found')

old_load = '''    async function loadShorts(){\n      playStartupTone('start');\n      try{\n        const session=await waitForSupabaseSession({timeoutMs:4500,intervalMs:180,restoreFromBackup:true});\n        const token=String(session?.access_token||'').trim();\n        if(splashText)splashText.textContent=token?'Oturum bağlanıyor…':'Shorts açılıyor…';\n        frame.src=token?buildFromItalkyUrl('/hosgeldiniz',token):publicShortsUrl();\n      }catch(error){\n        console.warn('[hosgeldiniz_shell] session read failed',error);\n        frame.src=publicShortsUrl();\n      }\n    }'''
new_load = '''    async function loadShorts(){\n      playStartupTone('start');\n\n      if(typeof navigator!=='undefined' && navigator.onLine===false){\n        if(splashText)splashText.textContent='Kaydedilmiş Shorts açılıyor…';\n        frame.src=publicShortsUrl();\n        return;\n      }\n\n      try{\n        const {waitForSupabaseSession,buildFromItalkyUrl}=await loadAuthModules();\n        const session=await waitForSupabaseSession({timeoutMs:4500,intervalMs:180,restoreFromBackup:true});\n        const token=String(session?.access_token||'').trim();\n        if(splashText)splashText.textContent=token?'Oturum bağlanıyor…':'Shorts açılıyor…';\n        frame.src=token?buildFromItalkyUrl('/hosgeldiniz',token):publicShortsUrl();\n      }catch(error){\n        console.warn('[hosgeldiniz_shell] session read failed',error);\n        if(splashText)splashText.textContent='Kaydedilmiş Shorts açılıyor…';\n        frame.src=publicShortsUrl();\n      }\n    }'''
if old_load in s:
    s = s.replace(old_load, new_load, 1)
elif "Kaydedilmiş Shorts açılıyor" not in s:
    raise SystemExit('loadShorts patch target not found')

path.write_text(s, encoding='utf-8')
print('offline Shorts shell patch applied')
