import { matchRules, type OrionContext } from './OrionRules';

/**
 * ORION assistant provider boundary.
 *
 * The shipped provider is RuleBasedOrion: deterministic rules that read live game
 * state. It needs no network access or API keys.
 *
 * To add an optional language-model backend later, implement OrionProvider with a
 * class that POSTs { query, snapshot } to YOUR OWN server endpoint (e.g. /api/orion);
 * that server holds the API key and calls the model. Never call a model API directly
 * from the browser or embed keys in client code. No such provider is included or
 * claimed to work in this build.
 */
export interface OrionProvider {
  readonly id: string;
  readonly label: string;
  respond(query: string, ctx: OrionContext): Promise<string>;
}

export class RuleBasedOrion implements OrionProvider {
  readonly id = 'rules';
  readonly label = '규칙 기반 분석 모드 (외부 AI 미연결)';
  async respond(query: string, ctx: OrionContext) {
    return matchRules(ctx, query);
  }
}

export const SUGGESTED_QUESTIONS = [
  '전력이 왜 부족해?',
  '다음에 뭘 연구할까?',
  '자동 채굴은 어떻게 해?',
  '연구소를 하나 더 지으려면 뭐가 필요해?',
  '다음 적을 어떻게 대비해?',
  '문명 현황 보여줘',
  '지금 임무는 뭐야?',
];

export const orion: OrionProvider = new RuleBasedOrion();
