export type AxisId = 'A' | 'B' | 'C' | 'D' | 'E';
export type Side = 'left' | 'right';
export type Answer = 1 | 2 | 3 | 4 | 5;
export type GroupId = 'drive' | 'unite' | 'craft' | 'care';

export type Question = {
  id: string;
  axis: AxisId;
  direction: Side;
  text: string;
}

export type AxisScore = {
  axis: AxisId;
  /** 0〜100。右側に寄るほど大きい */
  rightness: number;
  side: Side;
  /** 寄っている側の％（四捨五入） */
  percent: number;
  balanced: boolean;
}

export type Diagnosis = {
  scores: Record<AxisId, AxisScore>;
  /** A〜D 軸のコード（例 LTFK） */
  animalCode: string;
  /** E 軸のコード（D または M） */
  typeCode: string;
  /** 例 LTFK-D */
  fullCode: string;
  groupId: GroupId;
}
