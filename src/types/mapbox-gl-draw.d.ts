declare module '@mapbox/mapbox-gl-draw' {
  import { IControl, Map } from 'maplibre-gl';

  export interface DrawOptions {
    displayControlsDefault?: boolean;
    controls?: {
      point?: boolean;
      line_string?: boolean;
      polygon?: boolean;
      trash?: boolean;
      combine_features?: boolean;
      uncombine_features?: boolean;
    };
    styles?: any[];
    modes?: any;
    defaultMode?: string;
    userProperties?: boolean;
  }

  export default class MapboxDraw implements IControl {
    constructor(options?: DrawOptions);
    
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
    
    changeMode(mode: string, options?: any): void;
    add(feature: GeoJSON.Feature | GeoJSON.FeatureCollection): string[];
    set(featureCollection: GeoJSON.FeatureCollection): string[];
    delete(featureIds: string | string[]): this;
    deleteAll(): this;
    get(featureId: string): GeoJSON.Feature | undefined;
    getAll(): GeoJSON.FeatureCollection;
    getSelected(): GeoJSON.FeatureCollection;
    getSelectedIds(): string[];
    setFeatureProperty(featureId: string, property: string, value: any): this;
    trash(): this;
    combineFeatures(): this;
    uncombineFeatures(): this;
  }
}
