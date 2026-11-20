// Habbten Client Code Shield — protects client bundle & DevTools inspection without altering visible UI

export function initClientShield(): void
{
    if(typeof window === 'undefined') return;

    // Optional owner-only dev bypass via ?shield=0 or localStorage
    try
    {
        const params = new URLSearchParams(window.location.search);
        if(params.get('shield') === '0')
        {
            localStorage.setItem('habbten_shield_off', '1');
            return;
        }
        if(params.get('shield') === '1')
        {
            localStorage.removeItem('habbten_shield_off');
        }
        if(localStorage.getItem('habbten_shield_off') === '1') return;
    }
    catch
    {
        // ignore storage errors
    }

    // 1. Neuter React DevTools hook so component tree, props & hooks cannot be inspected
    try
    {
        const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if(hook && typeof hook === 'object')
        {
            for(const key of Object.keys(hook))
            {
                try
                {
                    hook[key] = typeof hook[key] === 'function' ? (() => undefined) : null;
                }
                catch
                {
                    // read-only property
                }
            }
        }
        else
        {
            Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
                configurable: false,
                enumerable: false,
                get: () => ({
                    isDisabled: true,
                    supportsFiber: true,
                    inject: () => 0,
                    onCommitFiberRoot: () => undefined,
                    onCommitFiberUnmount: () => undefined
                })
            });
        }
    }
    catch
    {
        // ignore
    }

    // 2. Remove any leftover script tags from DOM inspection once booted
    try
    {
        window.addEventListener('load', () =>
        {
            document.querySelectorAll('script').forEach(el => el.remove());
        }, { once: true });
    }
    catch
    {
        // ignore
    }

    // 3. Block context menu ("Inspeccionar" / "Ver código fuente") outside text inputs
    document.addEventListener('contextmenu', (e: MouseEvent) =>
    {
        const target = e.target as HTMLElement | null;
        if(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
        {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
    }, true);

    // 4. Block DevTools & View-Source keyboard shortcuts (Win/Linux & macOS)
    document.addEventListener('keydown', (e: KeyboardEvent) =>
    {
        const key = (e.key || '').toLowerCase();
        const ctrlOrMeta = e.ctrlKey || e.metaKey;

        if(
            e.key === 'F12'
            || (ctrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c' || key === 'k'))
            || (ctrlOrMeta && (key === 'u' || key === 's'))
            || (e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c' || key === 'u'))
        )
        {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // 5. Console Shield — clean warning banner + silence runtime console output
    try
    {
        const con = (window as any)['con' + 'sole'];
        if(con)
        {
            if(typeof con.clear === 'function') con.clear();
            if(typeof con.log === 'function')
            {
                con.log(
                    '%c🛡️ HABBTEN SHIELD',
                    'color:#ffffff;background:#0f172a;border:2px solid #38bdf8;border-radius:6px;padding:6px 14px;font-size:18px;font-weight:900;'
                );
                con.log(
                    '%cEsta zona está protegida. Nunca pegues código aquí ni compartas tus cookies/tokens.',
                    'color:#e2e8f0;font-size:12px;font-weight:600;'
                );
            }

            const noop = () => undefined;
            const methods = [ 'log', 'info', 'debug', 'warn', 'table', 'dir', 'dirxml', 'trace', 'group', 'groupCollapsed' ];
            for(const m of methods)
            {
                try
                {
                    con[m] = noop;
                }
                catch
                {
                    // ignore
                }
            }
        }
    }
    catch
    {
        // ignore
    }

    // 6. Silent Anti-Debugger trap (0ms overhead while DevTools is closed; traps Sources/Debugger if forced open)
    try
    {
        const trap = new Function('de' + 'bugger');
        window.setInterval(() =>
        {
            try
            {
                trap();
            }
            catch
            {
                // ignore
            }
        }, 700);
    }
    catch
    {
        // ignore
    }
}

