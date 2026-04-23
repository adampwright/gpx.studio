<script lang="ts">
    import GPXLayers from '$lib/components/map/gpx-layer/GPXLayers.svelte';
    import ElevationProfile from '$lib/components/elevation-profile/ElevationProfile.svelte';
    import FileList from '$lib/components/file-list/FileList.svelte';
    import GPXStatistics from '$lib/components/GPXStatistics.svelte';
    import Map from '$lib/components/map/Map.svelte';
    import Menu from '$lib/components/Menu.svelte';
    import Toolbar from '$lib/components/toolbar/Toolbar.svelte';
    import StreetViewControl from '$lib/components/map/street-view-control/StreetViewControl.svelte';
    import LayerControl from '$lib/components/map/layer-control/LayerControl.svelte';
    import CoordinatesPopup from '$lib/components/map/CoordinatesPopup.svelte';
    import Resizer from '$lib/components/Resizer.svelte';
    import { Toaster } from '$lib/components/ui/sonner';
    import { i18n } from '$lib/i18n.svelte';
    import { settings } from '$lib/logic/settings';
    import RouteLibrary from '$lib/components/RouteLibrary.svelte';
    import RouteStats from '$lib/components/RouteStats.svelte';
    import { selection } from '$lib/logic/selection';
    import { onDestroy, onMount } from 'svelte';
    import { gpxStatistics, hoveredPoint, slicedGPXStatistics } from '$lib/logic/statistics';
    import { db } from '$lib/db';
    import { fileStateCollection } from '$lib/logic/file-state';

    const {
        elevationProfile,
        bottomPanelSize,
        rightPanelSize,
        additionalDatasets,
        elevationFill,
    } = settings;

    let bottomPanelWidth: number | undefined = $state();
    let bottomPanelOrientation = $derived(
        bottomPanelWidth && bottomPanelWidth >= 540 && $elevationProfile ? 'horizontal' : 'vertical'
    );

    onMount(() => {
        settings.connectToDatabase(db);
        fileStateCollection.connectToDatabase(db);
    });

    onDestroy(() => {
        settings.disconnectFromDatabase();
        fileStateCollection.disconnectFromDatabase();
    });
</script>

<div class="fixed mt-[100%] -z-10 text-transparent">
    <h1>{i18n._('metadata.home_title')} — {i18n._('metadata.app_title')}</h1>
    <p>{i18n._('metadata.description')}</p>
    <h2>{i18n._('toolbar.routing.tooltip')}</h2>
    <p>{i18n._('toolbar.routing.help_no_file')}</p>
    <p>{i18n._('toolbar.routing.help')}</p>
    <h3>{i18n._('toolbar.routing.reverse.button')}</h3>
    <p>{i18n._('toolbar.routing.reverse.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.route_back_to_start.button')}</h3>
    <p>{i18n._('toolbar.routing.route_back_to_start.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.round_trip.button')}</h3>
    <p>{i18n._('toolbar.routing.round_trip.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.start_loop_here')}</h3>
    <h2>{i18n._('toolbar.scissors.tooltip')}</h2>
    <p>{i18n._('toolbar.scissors.help')}</p>
    <h2>{i18n._('toolbar.time.tooltip')}</h2>
    <p>{i18n._('toolbar.time.help')}</p>
    <h2>{i18n._('toolbar.merge.tooltip')}</h2>
    <h3>{i18n._('toolbar.merge.merge_traces')}</h3>
    <p>{i18n._('toolbar.merge.help_merge_traces')}</p>
    <h3>{i18n._('toolbar.merge.merge_contents')}</h3>
    <p>{i18n._('toolbar.merge.help_merge_contents')}</p>
    <h2>{i18n._('toolbar.elevation.button')}</h2>
    <p>{i18n._('toolbar.elevation.help')}</p>
    <h2>{i18n._('toolbar.waypoint.tooltip')}</h2>
    <p>{i18n._('toolbar.waypoint.help')}</p>
    <h2>{i18n._('toolbar.reduce.tooltip')}</h2>
    <p>{i18n._('toolbar.reduce.help')}</p>
    <h2>{i18n._('toolbar.clean.tooltip')}</h2>
    <p>{i18n._('toolbar.clean.help')}</p>
    <h2>
        {i18n._('gpx.files')}, {i18n._('gpx.tracks')}, {i18n._('gpx.segments')}, {i18n._(
            'gpx.waypoints'
        )}
    </h2>
</div>

<div class="fixed flex flex-row w-dvw h-dvh">
    <div class="flex flex-col grow h-full min-w-0">
        <div class="grow relative">
            <Menu />
            <div
                class="absolute top-0 bottom-0 left-0 z-20 flex flex-col justify-center pointer-events-none"
            >
                <Toolbar />
            </div>
            <Map class="h-full" />
            <StreetViewControl />
            <LayerControl />
            <GPXLayers />
            <CoordinatesPopup />
            <Toaster richColors />
        </div>
        {#if $elevationProfile}
            <Resizer
                orientation="row"
                bind:after={$bottomPanelSize}
                minAfter={100}
                maxAfter={300}
            />
        {/if}
        <div
            bind:offsetWidth={bottomPanelWidth}
            class="flex {bottomPanelOrientation == 'vertical'
                ? 'flex-col'
                : 'flex-row py-2'} gap-1 px-4"
            style={$elevationProfile ? `height: ${$bottomPanelSize}px` : ''}
        >
            <GPXStatistics
                {gpxStatistics}
                {slicedGPXStatistics}
                orientation={bottomPanelOrientation == 'horizontal' ? 'vertical' : 'horizontal'}
            />
            {#if $elevationProfile}
                <ElevationProfile
                    {gpxStatistics}
                    {slicedGPXStatistics}
                    {hoveredPoint}
                    {additionalDatasets}
                    {elevationFill}
                />
            {/if}
        </div>
    </div>
    <Resizer orientation="col" bind:after={$rightPanelSize} minAfter={100} maxAfter={400} />
    <div style="width: {$rightPanelSize}px" class="overflow-hidden">
        <RouteLibrary />
    </div>
</div>

<style lang="postcss">
    @reference "tailwindcss";

    div :global(.toaster.group) {
        @apply absolute;
        @apply right-2;
        --offset: 50px !important;
    }
</style>
