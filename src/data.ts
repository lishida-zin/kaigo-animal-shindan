import axesJson from '../data/axes.json';
import animalsJson from '../data/animals.json';
import questionsJson from '../data/questions.json';
import type { AxisId, GroupId, Question } from './types';

export interface SideDef {
  code: string;
  label: string;
  strength: string;
  weakness: string;
  tip: string;
  typeName?: string;
}

export interface AxisDef {
  id: AxisId;
  name: string;
  trait: string;
  left: SideDef;
  right: SideDef;
}

export interface GroupDef {
  id: GroupId;
  name: string;
  /** A 軸と B 軸のコード（例 LT） */
  axes: string;
  summary: string;
}

export interface AnimalDef {
  code: string;
  group: GroupId;
  name: string;
  image: string;
  catch: string;
}

export const axes = axesJson.axes as AxisDef[];
export const balanceRange = axesJson.balanceRange as unknown as readonly [number, number];
export const groups = animalsJson.groups as GroupDef[];
export const animals = animalsJson.animals as AnimalDef[];
export const questions = questionsJson.questions as Question[];
export const scaleLabels = questionsJson.scale.labels;
export const questionSetVersion = questionsJson.version;

export function findAnimal(code: string): AnimalDef {
  const animal = animals.find((a) => a.code === code);
  if (!animal) throw new Error(`動物が見つかりません: ${code}`);
  return animal;
}
