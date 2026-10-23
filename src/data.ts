import axesJson from '../data/axes.json';
import animalsJson from '../data/animals.json';
import questionsJson from '../data/questions.json';
import uiJson from '../data/ui.json';
import type { AxisId, GroupId, Question } from './types';

export type SideDef = {
  code: string;
  label: string;
  strength: string;
  weakness: string;
  tip: string;
  /** ★ あなたの力（太字の一文） */
  strengthLead: string;
  /** 介護の場面で書いた強み */
  scene: string;
  /** 強みがのびた先 */
  future: string;
  growth: { day1: string; month1: string; month3: string; goal: string };
  typeName?: string;
  /** 入口に出す型の一文（E 軸のみ） */
  typeSentence?: string;
}

export type AxisDef = {
  id: AxisId;
  name: string;
  trait: string;
  /** 軸を見分けるアイコン（絵文字） */
  icon: string;
  left: SideDef;
  right: SideDef;
}

export type GroupDef = {
  id: GroupId;
  name: string;
  /** A 軸と B 軸のコード（例 LT） */
  axes: string;
  summary: string;
  colorName: 'coral' | 'yellow' | 'mint' | 'lavender';
}

export type AnimalDef = {
  code: string;
  group: GroupId;
  name: string;
  image: string;
  catch: string;
  /** 入口のひとこと（強みだけ） */
  oneLiner: string;
  leader: { strength: string; habit: string; hint: string };
  follower: { strength: string; instruction: string; encouragement: string };
}

export const axes = axesJson.axes as unknown as AxisDef[];
export const balanceRange = axesJson.balanceRange as unknown as readonly [number, number];
export const groups = animalsJson.groups as unknown as GroupDef[];
export const animals = animalsJson.animals as unknown as AnimalDef[];
export const questions = questionsJson.questions as Question[];
export const scaleLabels = questionsJson.scale.labels;
export const questionSetVersion = questionsJson.version;
export const ui = uiJson;

export function findAnimal(code: string): AnimalDef {
  const animal = animals.find((a) => a.code === code);
  if (!animal) throw new Error(`動物が見つかりません: ${code}`);
  return animal;
}
