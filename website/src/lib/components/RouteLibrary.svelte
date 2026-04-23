<script lang="ts">
    import { onMount } from 'svelte';
    import { fileActions, loadFile } from '$lib/logic/file-actions';
    import { fileActionManager } from '$lib/logic/file-action-manager';
    import { fileStateCollection } from '$lib/logic/file-state';
    import { db } from '$lib/db';
    import type { GPXFile } from 'gpx';

    type RouteRow = {
        filename: string;
        relative_path: string;
        route_name: string;
        start_address: string;
        distance_miles: string;
        terrain: string;
    };

    type CityGroup = {
        name: string;
        routes: RouteRow[];
        open: boolean;
    };

    type StateGroup = {
        name: string;
        cities: CityGroup[];
        open: boolean;
    };

    const STORAGE_KEY = 'route-library-selected';

    const STATE_ABBREVIATIONS: Record<string, string> = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
        'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
        'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
        'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
        'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
        'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
        'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
        'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
        'DC': 'District of Columbia',
    };

    const CANONICAL_STATES: Record<string, string> = {
        ...Object.entries(STATE_ABBREVIATIONS).reduce((acc, [abbr, name]) => {
            acc[abbr.toUpperCase()] = name;
            acc[name] = name;
            return acc;
        }, {} as Record<string, string>),
    };

    function normalizeStateName(state: string): string {
        const trimmed = state.trim().toUpperCase();
        return CANONICAL_STATES[trimmed] || state.trim();
    }

    let groups: StateGroup[] = [];
    let loaded = false;
    let loading = false;
    let loadingRoute: string | null = null;
    let checkedRoutes = new Set<string>();
    let loadedRouteIds = new Map<string, string>();
    let routeCount = 0;
    let loadedCount = 0;

    function normalizeLocation(route: RouteRow) {
        const address = (route.start_address || '').trim();
        const pathParts = route.relative_path?.split('/').filter(Boolean) ?? [];
        let state = pathParts[0] ?? 'Unknown';
        let city = 'Unknown';

        if (address) {
            const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
            if (parts.length >= 3) {
                // Full address: "123 Main St, Los Angeles, CA"
                const rawState = parts[parts.length - 2].trim();
                state = normalizeStateName(rawState.split(' ')[0] || state);
                city = parts[parts.length - 3].trim() || city;
            } else if (parts.length === 2) {
                // City, state: "Los Angeles, CA"
                const rawState = parts[parts.length - 1].trim();
                state = normalizeStateName(rawState.split(' ')[0] || state);
                city = parts[0].trim() || city;
            } else if (parts.length === 1) {
                // Single part: either "736R+4G Big Bear Lake" or just "Some City"
                const codeMatch = address.match(/^([A-Z0-9]+\+[A-Z0-9]+)\s+(.+)$/i);
                if (codeMatch) {
                    // Plus code format: extract the city part after the code
                    city = codeMatch[2].trim();
                } else {
                    // No plus code, treat whole thing as city if it looks reasonable
                    city = address;
                }
            }
        }

        // Fallback to path-based city if still unknown
        if (city === 'Unknown' && pathParts.length >= 2) {
            city = pathParts[1];
        }

        state = normalizeStateName(state);
        return { state, city };
    }

    function buildGroups(rows: RouteRow[]) {
        const stateMap = new Map<string, Map<string, CityGroup>>();

        for (const route of rows) {
            const { state, city } = normalizeLocation(route);
            if (!stateMap.has(state)) {
                stateMap.set(state, new Map());
            }
            const cityMap = stateMap.get(state)!;
            if (!cityMap.has(city)) {
                cityMap.set(city, { name: city, routes: [], open: false });
            }
            cityMap.get(city)!.routes.push(route);
        }

        const result: StateGroup[] = [];
        for (const [state, cityMap] of stateMap) {
            const cities = Array.from(cityMap.values()).map((city) => ({ ...city }));
            cities.sort((a, b) => a.name.localeCompare(b.name));
            result.push({ name: state, cities, open: false });
        }
        result.sort((a, b) => a.name.localeCompare(b.name));

        return result;
    }

    function encodeGpxApiPath(relativePath: string) {
        return relativePath.split('/').map(encodeURIComponent).join('/');
    }

    async function loadRoute(route: RouteRow, force = false) {
        if (!force && (checkedRoutes.has(route.filename) || loadingRoute)) return;
        loadingRoute = route.filename;
        try {
            const url = `/api/gpx/${encodeGpxApiPath(route.relative_path)}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.warn('Failed to fetch GPX', route.relative_path, response.status);
                return;
            }
            const blob = await response.blob();
            const file = await loadFile(new File([blob], route.filename));
            if (file) {
                const ids = await fileActions.addMultiple([file]);
                if (ids.length > 0) {
                    loadedRouteIds.set(route.filename, ids[0]);
                    checkedRoutes.add(route.filename);
                    loadedCount = checkedRoutes.size;
                }
            }
        } catch (error) {
            console.error('Error loading route', route.filename, error);
        } finally {
            loadingRoute = null;
        }
    }

    async function unloadRoute(route: RouteRow) {
        const fileId = loadedRouteIds.get(route.filename);
        if (!fileId) {
            checkedRoutes.delete(route.filename);
            loadedCount = checkedRoutes.size;
            persistSelectedRoutes();
            return;
        }

        await fileActionManager.applyGlobal((draft) => {
            draft.delete(fileId);
        });

        loadedRouteIds.delete(route.filename);
        checkedRoutes.delete(route.filename);
        loadedCount = checkedRoutes.size;
        persistSelectedRoutes();
    }

    async function toggleRoute(route: RouteRow, checked: boolean) {
        if (checked) {
            await loadRoute(route);
            persistSelectedRoutes();
        } else {
            await unloadRoute(route);
        }
    }

    function persistSelectedRoutes() {
        const list = Array.from(checkedRoutes.values());
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function getPersistedSelection(): Set<string> {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return new Set();
            const list = JSON.parse(raw) as string[];
            return new Set(list.filter((item) => typeof item === 'string'));
        } catch {
            return new Set();
        }
    }

    function isRouteChecked(route: RouteRow) {
        return checkedRoutes.has(route.filename);
    }

    function isCityChecked(city: CityGroup) {
        return city.routes.every((route) => checkedRoutes.has(route.filename));
    }

    function isStateChecked(state: StateGroup) {
        return state.cities.every((city) => isCityChecked(city));
    }

    async function toggleCity(city: CityGroup, checked: boolean) {
        for (const route of city.routes) {
            await toggleRoute(route, checked);
        }
    }

    async function toggleState(state: StateGroup, checked: boolean) {
        for (const city of state.cities) {
            for (const route of city.routes) {
                await toggleRoute(route, checked);
            }
        }
    }

    async function toggleAll(checked: boolean) {
        for (const state of groups) {
            await toggleState(state, checked);
        }
    }

    onMount(async () => {
        loading = true;
        try {
            fileStateCollection.connectToDatabase(db);
            const rows: RouteRow[] = await fetch('/api/routes').then((r) => r.json());
            groups = buildGroups(rows);
            routeCount = rows.length;

            const persisted = getPersistedSelection();
            checkedRoutes = persisted;
            await fileActionManager.applyGlobal((draft) => {
                draft.clear();
            });
            for (const route of rows) {
                if (checkedRoutes.has(route.filename)) {
                    await loadRoute(route, true);
                }
            }
        } catch (error) {
            console.error('Failed to load route metadata', error);
        } finally {
            loadedCount = checkedRoutes.size;
            loading = false;
        }
    });
</script>

<div class="route-library flex flex-col h-full bg-slate-950 text-slate-100">
    <div class="flex items-center justify-between mb-3 px-3">
        <div>
            <div class="text-sm font-semibold">Route library</div>
            <div class="text-xs text-slate-400">{loadedCount} loaded of {routeCount} routes</div>
        </div>
        <button
            class="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs hover:bg-slate-100"
            on:click={() => toggleAll(true)}
            disabled={loading}
        >
            Load all
        </button>
    </div>
    {#if loading}
        <div class="px-3 text-sm text-slate-500">Loading route metadata…</div>
    {:else if groups.length === 0}
        <div class="px-3 text-sm text-slate-500">No routes available.</div>
    {:else}
        <div class="overflow-y-auto px-2 pb-4">
            {#each groups as state}
                <div class="mb-3 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-sm">
                    <label class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={isStateChecked(state)}
                                on:change={(event) => toggleState(state, event.currentTarget.checked)}
                            />
                            <span class="font-semibold">{state.name}</span>
                            <span class="text-xs text-slate-500">{state.cities.reduce((sum, city) => sum + city.routes.length, 0)} routes</span>
                        </div>
                        <button
                            class="text-xs text-slate-500 hover:text-slate-700"
                            type="button"
                            on:click={() => (state.open = !state.open)}
                        >
                            {state.open ? 'Hide' : 'Show'} cities
                        </button>
                    </label>
                    {#if state.open}
                        <div class="mt-3 space-y-3">
                            {#each state.cities as city}
                                <div class="rounded-lg border border-slate-700 bg-slate-900 p-2">
                                    <label class="flex items-center justify-between gap-2">
                                        <div class="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={isCityChecked(city)}
                                                on:change={(event) => toggleCity(city, event.currentTarget.checked)}
                                            />
                                            <span class="font-medium">{city.name}</span>
                                            <span class="text-xs text-slate-500">{city.routes.length} routes</span>
                                        </div>
                                        <button
                                            class="text-xs text-slate-500 hover:text-slate-700"
                                            type="button"
                                            on:click={() => (city.open = !city.open)}
                                        >
                                            {city.open ? 'Hide' : 'Show'} routes
                                        </button>
                                    </label>
                                    {#if city.open}
                                        <div class="mt-2 space-y-1 pl-6">
                                            {#each city.routes as route}
                                                <label class="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm">
                                                    <div class="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={isRouteChecked(route)}
                                                            on:change={(event) => toggleRoute(route, event.currentTarget.checked)}
                                                        />
                                                        <div class="truncate">
                                                            <div class="font-medium truncate">{route.route_name || route.filename}</div>
                                                            <div class="text-xs text-slate-500 truncate">{route.distance_miles} mi · {route.terrain || 'unknown'}</div>
                                                        </div>
                                                    </div>
                                                    <div class="text-right text-xs text-slate-500">
                                                        {loadingRoute === route.filename ? 'Loading…' : route.filename}
                                                    </div>
                                                </label>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .route-library {
        min-height: 0;
    }
</style>
