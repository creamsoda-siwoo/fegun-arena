'use client';

import { useEffect, useRef } from 'react';

/**
 * React shell for the game. The markup is rendered once by React; the three.js
 * engine (src/game) is loaded on the client only and drives the DOM imperatively.
 */
export default function FegunArena() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import('@/game/engine').then(({ startGame }) => {
      if (!cancelled && rootRef.current) stop = startGame(rootRef.current);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div ref={rootRef}>
      <div id="stage" />

      <div id="hud" hidden>
        <div className="bars">
          <div className="side l">
            <img className="pf" id="pf0" alt="" />
            <div className="info">
              <div className="nmrow"><b id="nm0">카이토</b><span id="tag0">1P</span></div>
              <div className="hpbar"><i className="lag" id="lag0" /><i className="hp" id="hp0" /></div>
              <div className="wins" id="wins0"><i /><i /></div>
            </div>
          </div>
          <div className="timer" id="timer">99</div>
          <div className="side r">
            <img className="pf" id="pf1" alt="" />
            <div className="info">
              <div className="nmrow"><b id="nm1">유키</b><span id="tag1">CPU</span></div>
              <div className="hpbar"><i className="lag" id="lag1" /><i className="hp" id="hp1" /></div>
              <div className="wins" id="wins1"><i /><i /></div>
            </div>
          </div>
        </div>
        <button className="pausebtn" id="pauseBtn">일시정지<span className="kb-only"> · ESC</span></button>
        <div className="combo l" id="combo0" />
        <div className="combo r" id="combo1" />
        <div className="ex l" id="ex0">
          <div className="exlbl"><span>기력</span><b id="exn0">0</b></div>
          <div className="exbar"><i id="exf0" /></div>
        </div>
        <div className="ex r" id="ex1">
          <div className="exlbl"><b id="exn1">0</b><span>기력</span></div>
          <div className="exbar"><i id="exf1" /></div>
        </div>
      </div>

      <div id="dim" />
      <div id="ult"><span id="ultWho">KAITO</span><b id="ultName">홍련 폭염참</b></div>
      <div id="announce" />

      <section id="menu" className="screen">
        <div className="menu-inner">
          <p className="eyebrow">ANIME 3D FIGHTING</p>
          <h1 className="logo"><span>FEGUN</span><span>ARENA</span></h1>
          <p className="tag">여섯 명의 영웅, 하나의 링. 콤보로 기력을 모아 필살기와 궁극기로 승부를 내세요. 3판 2선승제입니다.</p>
          <div className="menu-btns">
            <button className="btn" data-mode="cpu">1P vs CPU</button>
            <button className="btn alt" data-mode="pvp">1P vs 2P 로컬 대전</button>
          </div>
          <div className="diff" role="group" aria-label="CPU 난이도">
            <span>CPU 난이도</span>
            <button data-lv="0">쉬움</button>
            <button data-lv="1" className="on">보통</button>
            <button data-lv="2">어려움</button>
          </div>
          <div className="keys">
            <b /><b>1P</b><b className="k2">2P</b>
            <span>이동 · 점프</span><span><kbd>A</kbd><kbd>D</kbd> · <kbd>W</kbd></span><span className="k2"><kbd>←</kbd><kbd>→</kbd> · <kbd>↑</kbd></span>
            <span>가드</span><span><kbd>S</kbd></span><span className="k2"><kbd>↓</kbd></span>
            <span>약공격 (3연타)</span><span><kbd>J</kbd></span><span className="k2"><kbd>,</kbd> / <kbd>Num1</kbd></span>
            <span>강공격</span><span><kbd>K</kbd></span><span className="k2"><kbd>.</kbd> / <kbd>Num2</kbd></span>
            <span>필살기 · 기력 25</span><span><kbd>L</kbd></span><span className="k2"><kbd>/</kbd> / <kbd>Num3</kbd></span>
            <span>궁극기 · 기력 100</span><span><kbd>U</kbd></span><span className="k2"><kbd>&apos;</kbd> / <kbd>Num0</kbd></span>
          </div>
          <p className="note">팁: 약공격이 맞으면 바로 필살기나 궁극기로 이어서 캔슬할 수 있어요. 휴대폰에서는 화면 버튼으로 조작합니다.</p>
        </div>
      </section>

      <section id="select" className="screen" hidden>
        <div className="sel-head">
          <button className="ghost" id="selBack">← 메뉴</button>
          <h2>캐릭터 선택</h2>
          <p id="selHint">1P 캐릭터를 고르세요</p>
        </div>
        <div className="sel-bottom">
          <div className="slots">
            <button className="slot s1" id="slot0"><img alt="" /><div><b>1P</b><span>—</span></div></button>
            <div className="vs">VS</div>
            <button className="slot s2" id="slot1"><img alt="" /><div><b>CPU</b><span>—</span></div></button>
          </div>
          <div className="roster" id="roster" />
          <button className="btn go" id="startBtn" disabled>전투 시작</button>
        </div>
      </section>

      <section id="pause" className="screen" hidden>
        <h2>PAUSE</h2>
        <div className="col">
          <button className="btn" id="resumeBtn">계속하기</button>
          <button className="btn alt" id="pauseMenuBtn">메인 메뉴</button>
        </div>
      </section>

      <section id="result" className="screen" hidden>
        <div className="who" id="resWho">1P 승리</div>
        <img id="resImg" alt="" />
        <h2 id="resName">카이토</h2>
        <q id="resQuote" />
        <div className="col">
          <button className="btn" id="rematchBtn">재대결</button>
          <button className="btn alt" id="reselectBtn">캐릭터 다시 고르기</button>
          <button className="ghost" id="resMenuBtn">메인 메뉴</button>
        </div>
      </section>

      <div id="touch" hidden>
        <div className="pad">
          <span /><button className="tb" data-k="up">▲</button><span />
          <button className="tb" data-k="left">◀</button>
          <button className="tb" data-k="down">가드</button>
          <button className="tb" data-k="right">▶</button>
        </div>
        <div className="pad btns">
          <button className="tb" data-k="light">약</button>
          <button className="tb" data-k="heavy">강</button>
          <button className="tb" data-k="special">필살</button>
          <button className="tb u" data-k="ult">궁극</button>
        </div>
      </div>
    </div>
  );
}
