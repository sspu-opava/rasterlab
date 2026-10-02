export interface RGBAColor { r: number; g: number; b: number; a: number }
export interface Point { x: number; y: number }
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'add';
export interface EffectInstance {
  id: string;
  effectId: string;
  enabled: boolean;
  parameters: Record<string, string | number | boolean | null>;
  inputs: Record<string, string>;
}
export interface LayerBase {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  position: Point;
  scale: Point;
  rotation: number;
  blendMode: BlendMode;
  effects: EffectInstance[];
  maskId?: string;
}
export interface RasterLayer extends LayerBase { type: 'raster'; assetId: string }
export interface GroupLayer extends LayerBase { type: 'group'; children: LayerNode[] }
export interface GeneratedLayer extends LayerBase {
  type: 'generated'; generatorId: string; parameters: Record<string, string | number | boolean>;
}
export interface AdjustmentLayer extends LayerBase { type: 'adjustment'; inputs: string[] }
export interface MaskLayer extends LayerBase { type: 'mask'; assetId: string }
export type LayerNode = RasterLayer | GroupLayer | GeneratedLayer | AdjustmentLayer | MaskLayer;
export interface RasterDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: LayerNode[];
  background: RGBAColor;
  createdAt: string;
  modifiedAt: string;
}
