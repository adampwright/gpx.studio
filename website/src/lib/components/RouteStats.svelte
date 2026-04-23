<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    interface Props {
        routeData: Record<string, any> | null;
        visibleStats: Set<string>;
    }

    let { routeData, visibleStats = $bindable(new Set(['distance_miles', 'elevation_gain_ft', 'terrain', 'est_time_easy'])) }: Props = $props();

    const dispatch = createEventDispatcher();

    function toggleStat(stat: string) {
        if (visibleStats.has(stat)) {
            visibleStats.delete(stat);
        } else {
            visibleStats.add(stat);
        }
        dispatch('statsChanged', { visibleStats });
    }

    // Key stats to display with nice labels
    const statDefinitions = [
        { key: 'distance_miles', label: 'Distance', unit: 'mi', format: (v: any) => parseFloat(v).toFixed(1) },
        { key: 'elevation_gain_ft', label: 'Elevation Gain', unit: 'ft', format: (v: any) => Math.round(v) },
        { key: 'elevation_loss_ft', label: 'Elevation Loss', unit: 'ft', format: (v: any) => Math.round(v) },
        { key: 'terrain', label: 'Terrain', unit: '', format: (v: any) => v },
        { key: 'est_time_easy', label: 'Est. Time (Easy)', unit: '', format: (v: any) => v },
        { key: 'est_time_race', label: 'Est. Time (Race)', unit: '', format: (v: any) => v },
        { key: 'climb_per_mile_ft', label: 'Climb/Mile', unit: 'ft', format: (v: any) => Math.round(v) },
        { key: 'runnable_ascent_pct', label: 'Runnable Ascent', unit: '%', format: (v: any) => Math.round(v) },
        { key: 'trp_rating', label: 'TRP Rating', unit: '', format: (v: any) => v || 'N/A' },
        { key: 'trp_difficulty', label: 'TRP Difficulty', unit: '', format: (v: any) => v || 'N/A' },
    ];
</script>

{#if routeData}
    <div class="route-stats-panel p-3 border-t border-gray-200 bg-gray-50">
        <h3 class="text-sm font-semibold mb-2 text-gray-800">Route Details</h3>

        <div class="space-y-2">
            {#each statDefinitions as stat}
                {#if visibleStats.has(stat.key) && routeData[stat.key]}
                    <div class="flex items-center justify-between text-xs">
                        <span class="text-gray-600">{stat.label}:</span>
                        <span class="font-medium text-gray-900">
                            {stat.format(routeData[stat.key])}{stat.unit}
                        </span>
                    </div>
                {/if}
            {/each}
        </div>

        <div class="mt-3 pt-2 border-t border-gray-200">
            <h4 class="text-xs font-medium mb-2 text-gray-700">Show Stats:</h4>
            <div class="grid grid-cols-2 gap-1">
                {#each statDefinitions as stat}
                    <label class="flex items-center text-xs">
                        <input
                            type="checkbox"
                            checked={visibleStats.has(stat.key)}
                            onchange={() => toggleStat(stat.key)}
                            class="mr-1 h-3 w-3"
                        />
                        <span class="text-gray-600 truncate">{stat.label}</span>
                    </label>
                {/each}
            </div>
        </div>
    </div>
{/if}

<style>
    .route-stats-panel {
        max-height: 400px;
        overflow-y: auto;
    }
</style>