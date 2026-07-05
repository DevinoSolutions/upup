import { Injectable, signal } from '@angular/core'
import { loadGoogleIdentityServices } from '@upup/core/internal'

/**
 * Angular port of useLoadGAPI.ts (svelte composable).
 *
 * Loads the Google Identity Services script. SSR-safe: load is deferred until
 * the caller triggers it (call load() from ngOnInit, never from a constructor).
 */
@Injectable()
export class LoadGapiService {
    readonly gisLoaded = signal(false)

    load(): void {
        loadGoogleIdentityServices()
            .then(() => {
                this.gisLoaded.set(true)
            })
            .catch(() => {
                /* silently ignore — caller checks gisLoaded */
            })
    }
}
