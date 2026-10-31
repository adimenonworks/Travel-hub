import { lazy, Suspense, type ComponentProps } from 'react';
import s from './shared.module.css';

// The map library (Leaflet) is big, so it only downloads when a page actually shows a map.
const LazyMapView = lazy(() => import('./MapView').then((m) => ({ default: m.MapView })));

/** A map that loads on demand; until then it keeps its space so the page doesn't jump. */
export function MapView(props: ComponentProps<typeof LazyMapView>) {
  return (
    <Suspense fallback={<div className={s.mapLoading} style={{ height: props.height ?? 280 }} aria-hidden="true" />}>
      <LazyMapView {...props} />
    </Suspense>
  );
}
