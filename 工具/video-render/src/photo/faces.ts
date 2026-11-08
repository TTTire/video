// 出镜层脸轨：scripts/aroll_face.py 按 src/*/aroll-face.json 生成，别手改
import type {FaceKey} from './aroll';
import ep9 from '../ep9/aroll-face.json';

export const FACE_TRACKS: Record<string, FaceKey[]> = {
  Ep9: ep9.keys as FaceKey[],
};
