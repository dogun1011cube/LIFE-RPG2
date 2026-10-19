import { describe, expect, it } from 'vitest';
import { matchRules } from '../OrionRules';
import { createInitialState } from '../../game/initialState';
import { simulate } from '../../game/simulation/civilization';
import { executeCommand } from '../../game/commands';
import type { GameState } from '../../game/types';

function ctxFor(game: GameState) {
  const { state, report } = simulate(game, 0.25, { playerX: 0, playerZ: 0 });
  return { game: state, report, player: { x: 0, z: 0 } };
}

function withGenerator() {
  const s = createInitialState();
  const r = executeCommand({ ...s, inventory: { ...s.inventory, iron: 50, copper: 50 } }, { type: 'placeBuilding', building: 'power_generator', x: 10, z: 10, rotation: 0 });
  if (!r.ok) throw new Error(r.reason);
  return r.state;
}

describe('ORION rule-based assistant', () => {
  it('explains missing power using real numbers', () => {
    const answer = matchRules(ctxFor(createInitialState()), '전력이 왜 부족해?');
    expect(answer).toContain('발전기가 하나도 없습니다');
    expect(answer).toContain('0 kW');
  });

  it('reports generation and surplus from the live report', () => {
    const answer = matchRules(ctxFor(withGenerator()), 'power status');
    expect(answer).toContain('현재 발전량 10 kW');
    expect(answer).toContain('전력은 충분합니다');
  });

  it('lists the real cost and missing resources for another laboratory', () => {
    const answer = matchRules(ctxFor(createInitialState()), '연구소를 하나 더 지으려면 뭐가 필요해?');
    expect(answer).toContain('철광석 15');
    expect(answer).toContain('부족한 자원');
  });

  it('recommends an available technology and states why it cannot start', () => {
    const answer = matchRules(ctxFor(createInitialState()), '다음에 뭘 연구할까?');
    expect(answer).toMatch(/추천 연구: '/);
    expect(answer).toContain('현재 시작 불가');
  });

  it('walks through automation steps reflecting progress', () => {
    const s = createInitialState();
    const game = { ...s, research: { completed: ['basic_semiconductors'], active: null } };
    const answer = matchRules(ctxFor(game), '자동 채굴은 어떻게 해?');
    expect(answer).toContain("✔ 1. '기초 반도체 제조' 연구");
    expect(answer).toContain("다음 할 일: '자동 채굴' 연구");
  });

  it('gives combat preparation from player stats', () => {
    const answer = matchRules(ctxFor(createInitialState()), '다음 적을 어떻게 대비해?');
    expect(answer).toContain('공격력 12');
    expect(answer).toContain('가장 가까운 적');
  });

  it('summarises civilization status and falls back politely', () => {
    expect(matchRules(ctxFor(withGenerator()), '문명 현황 보여줘')).toContain('설비 2개');
    expect(matchRules(ctxFor(createInitialState()), 'asdfgh')).toContain('규칙 기반 분석 모드');
  });
});
