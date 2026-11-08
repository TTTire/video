// 出镜层脸轨：scripts/aroll_face.py 按 src/*/aroll-face.json 生成，别手改
import type {FaceKey} from './aroll';
import ai04 from '../ai04/aroll-face.json';

export const FACE_TRACKS: Record<string, FaceKey[]> = {
  Ai04: ai04.keys as FaceKey[],
};
