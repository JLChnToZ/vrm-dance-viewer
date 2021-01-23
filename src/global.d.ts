declare module "mmd-parser" {
  export const CharsetEncoder: any;
  export class Parser {
    parsePmd(buffer: ArrayBufferLike, leftToRight?: boolean): any;
    parsePmx(buffer: ArrayBufferLike, leftToRight?: boolean): any;
    parseVmd(buffer: ArrayBufferLike, leftToRight?: boolean): VmdFile;
    parseVpd(buffer: ArrayBufferLike, leftToRight?: boolean): any;
    mergeVmds(vmds: VmdFile[]): VmdFile;
    leftToRightModel(model: any): any;
    leftToRightVmd(vmd: any): any;
    leftToRightVpd(vpd: any): any;
  }

  export interface VmdFile {
    metadata: {
      coordinateSystem: string;
      magic: string;
      name: string;
      motionCount: number;
      morphCount: number;
      cameraCount: number;
    };
    motions: {
      boneName: string;
      frameNum: number;
      position: number[];
      rotation: number[];
      interpolation: number[];
    }[];
    morphs: {
      morphName: string;
      frameNum: number;
      weight: number;
    }[];
    cameras: {
      frameNum: number;
      distance: number;
      position: number[];
      rotation: number[];
      interpolation: number[];
      fov: number;
      perspective: number;
    }[];
  }
}
