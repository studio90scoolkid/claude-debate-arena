// @ts-check
(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  // ===== i18n =====
  const LANG = document.documentElement.getAttribute('data-lang') || 'en';

  const I18N = {
    en: {
      checking: 'CHECKING...',
      connected: 'CONNECTED',
      disconnected: 'DISCONNECTED',
      notConnected: 'NOT CONNECTED!',
      topicPlaceholder: 'Enter debate topic... (e.g. Will AI replace human jobs?)',
      persona: 'PERSONA:',
      model: 'MODEL:',
      pro: 'Pro (FOR)',
      neutral: 'Neutral',
      con: 'Con (AGAINST)',
      provider: 'PROVIDER:',
      modelHaiku: 'Haiku (Fast)',
      modelSonnet: 'Sonnet (Balanced)',
      modelOpus: 'Opus (Powerful)',
      modelGeminiFlash: 'Gemini 2.5 Flash',
      modelGeminiPro: 'Gemini 2.5 Pro',
      startBattle: 'Start Battle',
      pause: 'Pause',
      resume: 'Resume',
      stop: 'Stop',
      ready: 'READY',
      battle: 'BATTLE!',
      paused: 'PAUSED',
      stopped: 'STOPPED',
      messages: 'MESSAGES: 0',
      welcomeTitle: '⚔ CLAUDE TALK ⚔',
      welcomeDesc: 'Enter a topic and press ▶ to begin an all-out debate between two AI agents!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'FOR', neutral: 'NEUTRAL', con: 'AGAINST' },
      character: 'CHARACTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Seek Consensus',
      showSummary: 'Show Summary',
      allowConcession: 'Allow Concession',
      consensusReached: 'CONSENSUS REACHED — Both agents have found common ground.',
      debateStopped: 'DEBATE ENDED — The debate has been stopped.',
      concessionMessage: 'CONCESSION — {conceder} has conceded defeat to {winner}.',
      consensusGaugeLabel: 'CONSENSUS',
      moderatorSummary: 'SUMMARY',
      summaryLoading: 'Preparing a summary...',
      modeGeneral: 'General Mode',
      modeCode: 'Code Mode (codebase-aware)',
      topicPlaceholderCode: 'Enter code topic... (e.g. Is our auth implementation secure?)',
    },
    ko: {
      checking: '확인 중...',
      connected: '연결됨',
      disconnected: '연결 안됨',
      notConnected: '연결 안됨!',
      topicPlaceholder: '토론 주제를 입력하세요... (예: AI가 인간의 일자리를 대체할 것인가?)',
      persona: '페르소나:',
      model: '모델:',
      pro: '찬성 (PRO)',
      neutral: '중립 (NEUTRAL)',
      con: '반대 (CON)',
      provider: '제공자:',
      modelHaiku: 'Haiku (빠름)',
      modelSonnet: 'Sonnet (균형)',
      modelOpus: 'Opus (강력)',
      modelGeminiFlash: 'Gemini 2.5 Flash',
      modelGeminiPro: 'Gemini 2.5 Pro',
      startBattle: '토론 시작',
      pause: '일시정지',
      resume: '재개',
      stop: '중지',
      ready: '대기',
      battle: '토론 중!',
      paused: '일시정지',
      stopped: '중지됨',
      messages: '메시지: 0',
      welcomeTitle: '⚔ AI 토론 아레나 ⚔',
      welcomeDesc: '토론 주제를 입력하고 ▶ 버튼을 눌러 두 AI 에이전트의 끝장 토론을 시작하세요!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: '찬성', neutral: '중립', con: '반대' },
      character: '캐릭터:',
      charMaskDude: '마스크 듀드', charNinjaFrog: '닌자 프로그', charPinkMan: '핑크맨', charVirtualGuy: '버추얼 가이',
      seekConsensus: '합의점 찾기',
      showSummary: '토론 요약',
      allowConcession: '패배 인정 허용',
      consensusReached: '합의 도달 — 양측이 공통점을 찾았습니다.',
      debateStopped: '토론 종료 — 토론이 중단되었습니다.',
      concessionMessage: '패배 인정 — {conceder}이(가) {winner}에게 패배를 인정했습니다.',
      consensusGaugeLabel: '합의도',
      moderatorSummary: '토론 요약',
      summaryLoading: '토론을 요약하고 있습니다...',
      modeGeneral: '일반 모드',
      modeCode: '코드 모드 (코드베이스 분석)',
      topicPlaceholderCode: '코드 주제를 입력하세요... (예: 우리 인증 구현이 안전한가?)',
    },
    ja: {
      checking: '確認中...',
      connected: '接続済み',
      disconnected: '未接続',
      notConnected: '未接続！',
      topicPlaceholder: '討論テーマを入力... (例: AIは人間の仕事を代替するか？)',
      persona: 'ペルソナ:',
      model: 'モデル:',
      pro: '賛成 (PRO)',
      neutral: '中立 (NEUTRAL)',
      con: '反対 (CON)',
      modelHaiku: 'Haiku (高速)',
      modelSonnet: 'Sonnet (バランス)',
      modelOpus: 'Opus (高性能)',
      startBattle: 'バトル開始',
      pause: '一時停止',
      resume: '再開',
      stop: '停止',
      ready: '待機',
      battle: 'バトル中！',
      paused: '一時停止中',
      stopped: '停止',
      messages: 'メッセージ: 0',
      welcomeTitle: '⚔ AI ディベートアリーナ ⚔',
      welcomeDesc: 'テーマを入力してバトル開始を押すと、2つのAIエージェントが徹底討論を始めます！',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: '賛成', neutral: '中立', con: '反対' },
      character: 'キャラ:',
      charMaskDude: 'マスクデュード', charNinjaFrog: 'ニンジャフロッグ', charPinkMan: 'ピンクマン', charVirtualGuy: 'バーチャルガイ',
      seekConsensus: '合意を目指す',
      showSummary: 'まとめを表示',
      allowConcession: '敗北を認める',
      consensusReached: '合意に達しました — 両者が共通点を見つけました。',
      debateStopped: '討論終了 — 討論が中断されました。',
      concessionMessage: '敗北宣言 — {conceder}が{winner}に敗北を認めました。',
      consensusGaugeLabel: '合意度',
      modeGeneral: '一般モード',
      modeCode: 'コードモード (コードベース分析)',
      topicPlaceholderCode: 'コードの話題を入力... (例: 認証の実装は安全か？)',
    },
    zh: {
      checking: '检查中...',
      connected: '已连接',
      disconnected: '未连接',
      notConnected: '未连接！',
      topicPlaceholder: '输入辩论主题... (例: AI是否会取代人类工作？)',
      persona: '角色:',
      model: '模型:',
      pro: '赞成 (PRO)',
      neutral: '中立 (NEUTRAL)',
      con: '反对 (CON)',
      modelHaiku: 'Haiku (快速)',
      modelSonnet: 'Sonnet (均衡)',
      modelOpus: 'Opus (强大)',
      startBattle: '开始辩论',
      pause: '暂停',
      resume: '继续',
      stop: '停止',
      ready: '就绪',
      battle: '辩论中！',
      paused: '已暂停',
      stopped: '已停止',
      messages: '消息: 0',
      welcomeTitle: '⚔ AI 辩论竞技场 ⚔',
      welcomeDesc: '输入主题并点击开始辩论，让两个AI代理展开激烈辩论！',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: '赞成', neutral: '中立', con: '反对' },
      character: '角色:',
      charMaskDude: '面具侠', charNinjaFrog: '忍者蛙', charPinkMan: '粉红人', charVirtualGuy: '虚拟侠',
      seekConsensus: '寻求共识',
      showSummary: '显示总结',
      allowConcession: '允许认输',
      consensusReached: '达成共识 — 双方找到了共同点。',
      debateStopped: '辩论结束 — 辩论已被中止。',
      concessionMessage: '认输 — {conceder}向{winner}认输了。',
      consensusGaugeLabel: '共识度',
    },
    // === European Languages ===
    de: {
      checking: 'PRÜFE...', connected: 'VERBUNDEN', disconnected: 'GETRENNT', notConnected: 'NICHT VERBUNDEN!',
      topicPlaceholder: 'Debattenthema eingeben... (z.B. Wird KI menschliche Arbeitsplätze ersetzen?)',
      persona: 'PERSONA:', model: 'MODELL:',
      pro: 'Dafür (PRO)', neutral: 'Neutral', con: 'Dagegen (CON)',
      modelHaiku: 'Haiku (Schnell)', modelSonnet: 'Sonnet (Ausgewogen)', modelOpus: 'Opus (Leistungsstark)',
      startBattle: 'Debatte starten', pause: 'Pause', resume: 'Fortsetzen', stop: 'Stopp',
      ready: 'BEREIT', battle: 'DEBATTE!', paused: 'PAUSIERT', stopped: 'GESTOPPT',
      messages: 'NACHRICHTEN: 0',
      welcomeTitle: '⚔ KI DEBATT-ARENA ⚔',
      welcomeDesc: 'Geben Sie ein Thema ein und starten Sie eine Debatte zwischen zwei KI-Agenten!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'DAFÜR', neutral: 'NEUTRAL', con: 'DAGEGEN' },
      character: 'CHARAKTER:',
      charMaskDude: 'Maskentyp', charNinjaFrog: 'Ninja-Frosch', charPinkMan: 'Pinkmann', charVirtualGuy: 'Virtueller Typ',
      seekConsensus: 'Konsens suchen',
      showSummary: 'Zusammenfassung',
      consensusReached: 'KONSENS ERREICHT — Beide Seiten haben Gemeinsamkeiten gefunden.',
      debateStopped: 'DEBATTE BEENDET — Die Debatte wurde abgebrochen.',
      consensusGaugeLabel: 'KONSENS',
    },
    fr: {
      checking: 'VÉRIFICATION...', connected: 'CONNECTÉ', disconnected: 'DÉCONNECTÉ', notConnected: 'NON CONNECTÉ !',
      topicPlaceholder: 'Entrez un sujet de débat... (ex: L\'IA remplacera-t-elle les emplois humains ?)',
      persona: 'PERSONA :', model: 'MODÈLE :',
      pro: 'Pour (PRO)', neutral: 'Neutre', con: 'Contre (CON)',
      modelHaiku: 'Haiku (Rapide)', modelSonnet: 'Sonnet (Équilibré)', modelOpus: 'Opus (Puissant)',
      startBattle: 'Lancer le débat', pause: 'Pause', resume: 'Reprendre', stop: 'Arrêt',
      ready: 'PRÊT', battle: 'DÉBAT !', paused: 'EN PAUSE', stopped: 'ARRÊTÉ',
      messages: 'MESSAGES : 0',
      welcomeTitle: '⚔ ARÈNE DE DÉBAT IA ⚔',
      welcomeDesc: 'Entrez un sujet et lancez un débat entre deux agents IA !',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'POUR', neutral: 'NEUTRE', con: 'CONTRE' },
      character: 'PERSONNAGE :',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Chercher un consensus',
      showSummary: 'Résumé',
      consensusReached: 'CONSENSUS ATTEINT — Les deux agents ont trouvé un terrain d\'entente.',
      debateStopped: 'DÉBAT TERMINÉ — Le débat a été arrêté.',
      consensusGaugeLabel: 'CONSENSUS',
    },
    es: {
      checking: 'VERIFICANDO...', connected: 'CONECTADO', disconnected: 'DESCONECTADO', notConnected: '¡NO CONECTADO!',
      topicPlaceholder: 'Ingrese un tema de debate... (ej: ¿La IA reemplazará los empleos humanos?)',
      persona: 'PERSONA:', model: 'MODELO:',
      pro: 'A favor (PRO)', neutral: 'Neutral', con: 'En contra (CON)',
      modelHaiku: 'Haiku (Rápido)', modelSonnet: 'Sonnet (Equilibrado)', modelOpus: 'Opus (Potente)',
      startBattle: 'Iniciar debate', pause: 'Pausa', resume: 'Reanudar', stop: 'Detener',
      ready: 'LISTO', battle: '¡DEBATE!', paused: 'EN PAUSA', stopped: 'DETENIDO',
      messages: 'MENSAJES: 0',
      welcomeTitle: '⚔ ARENA DE DEBATE IA ⚔',
      welcomeDesc: '¡Ingrese un tema y pulse iniciar para un debate entre dos agentes IA!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'A FAVOR', neutral: 'NEUTRAL', con: 'EN CONTRA' },
      character: 'PERSONAJE:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Buscar consenso',
      showSummary: 'Resumen',
      consensusReached: 'CONSENSO ALCANZADO — Ambos agentes han encontrado puntos en común.',
      debateStopped: 'DEBATE FINALIZADO — El debate ha sido detenido.',
      consensusGaugeLabel: 'CONSENSO',
    },
    pt: {
      checking: 'VERIFICANDO...', connected: 'CONECTADO', disconnected: 'DESCONECTADO', notConnected: 'NÃO CONECTADO!',
      topicPlaceholder: 'Digite um tema de debate... (ex: A IA substituirá empregos humanos?)',
      persona: 'PERSONA:', model: 'MODELO:',
      pro: 'A favor (PRO)', neutral: 'Neutro', con: 'Contra (CON)',
      modelHaiku: 'Haiku (Rápido)', modelSonnet: 'Sonnet (Equilibrado)', modelOpus: 'Opus (Poderoso)',
      startBattle: 'Iniciar debate', pause: 'Pausar', resume: 'Retomar', stop: 'Parar',
      ready: 'PRONTO', battle: 'DEBATE!', paused: 'PAUSADO', stopped: 'PARADO',
      messages: 'MENSAGENS: 0',
      welcomeTitle: '⚔ ARENA DE DEBATE IA ⚔',
      welcomeDesc: 'Digite um tema e inicie um debate entre dois agentes de IA!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'A FAVOR', neutral: 'NEUTRO', con: 'CONTRA' },
      character: 'PERSONAGEM:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Buscar consenso',
      showSummary: 'Resumo',
      consensusReached: 'CONSENSO ALCANÇADO — Ambos os agentes encontraram pontos em comum.',
      debateStopped: 'DEBATE ENCERRADO — O debate foi interrompido.',
      consensusGaugeLabel: 'CONSENSO',
    },
    it: {
      checking: 'VERIFICA...', connected: 'CONNESSO', disconnected: 'DISCONNESSO', notConnected: 'NON CONNESSO!',
      topicPlaceholder: 'Inserisci un tema di dibattito... (es: L\'IA sostituirà i lavori umani?)',
      persona: 'PERSONA:', model: 'MODELLO:',
      pro: 'A favore (PRO)', neutral: 'Neutrale', con: 'Contro (CON)',
      modelHaiku: 'Haiku (Veloce)', modelSonnet: 'Sonnet (Bilanciato)', modelOpus: 'Opus (Potente)',
      startBattle: 'Inizia dibattito', pause: 'Pausa', resume: 'Riprendi', stop: 'Ferma',
      ready: 'PRONTO', battle: 'DIBATTITO!', paused: 'IN PAUSA', stopped: 'FERMATO',
      messages: 'MESSAGGI: 0',
      welcomeTitle: '⚔ ARENA DI DIBATTITO IA ⚔',
      welcomeDesc: 'Inserisci un tema e avvia un dibattito tra due agenti IA!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'A FAVORE', neutral: 'NEUTRALE', con: 'CONTRO' },
      character: 'PERSONAGGIO:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Cercare consenso',
      showSummary: 'Riepilogo',
      consensusReached: 'CONSENSO RAGGIUNTO — Entrambi gli agenti hanno trovato un terreno comune.',
      debateStopped: 'DIBATTITO TERMINATO — Il dibattito è stato interrotto.',
      consensusGaugeLabel: 'CONSENSO',
    },
    nl: {
      checking: 'CONTROLEREN...', connected: 'VERBONDEN', disconnected: 'NIET VERBONDEN', notConnected: 'NIET VERBONDEN!',
      topicPlaceholder: 'Voer een debatonderwerp in... (bijv. Zal AI menselijke banen vervangen?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Voor (PRO)', neutral: 'Neutraal', con: 'Tegen (CON)',
      modelHaiku: 'Haiku (Snel)', modelSonnet: 'Sonnet (Gebalanceerd)', modelOpus: 'Opus (Krachtig)',
      startBattle: 'Start debat', pause: 'Pauze', resume: 'Hervatten', stop: 'Stop',
      ready: 'GEREED', battle: 'DEBAT!', paused: 'GEPAUZEERD', stopped: 'GESTOPT',
      messages: 'BERICHTEN: 0',
      welcomeTitle: '⚔ AI DEBAT ARENA ⚔',
      welcomeDesc: 'Voer een onderwerp in en start een debat tussen twee AI-agenten!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'VOOR', neutral: 'NEUTRAAL', con: 'TEGEN' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Consensus zoeken',
      showSummary: 'Samenvatting',
      consensusReached: 'CONSENSUS BEREIKT — Beide agenten hebben een gemeenschappelijke basis gevonden.',
      debateStopped: 'DEBAT BEËINDIGD — Het debat is gestopt.',
      consensusGaugeLabel: 'CONSENSUS',
    },
    pl: {
      checking: 'SPRAWDZANIE...', connected: 'POŁĄCZONO', disconnected: 'ROZŁĄCZONO', notConnected: 'NIE POŁĄCZONO!',
      topicPlaceholder: 'Wpisz temat debaty... (np. Czy AI zastąpi ludzkie miejsca pracy?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Za (PRO)', neutral: 'Neutralny', con: 'Przeciw (CON)',
      modelHaiku: 'Haiku (Szybki)', modelSonnet: 'Sonnet (Zrównoważony)', modelOpus: 'Opus (Potężny)',
      startBattle: 'Rozpocznij debatę', pause: 'Pauza', resume: 'Wznów', stop: 'Zatrzymaj',
      ready: 'GOTOWY', battle: 'DEBATA!', paused: 'WSTRZYMANO', stopped: 'ZATRZYMANO',
      messages: 'WIADOMOŚCI: 0',
      welcomeTitle: '⚔ ARENA DEBAT AI ⚔',
      welcomeDesc: 'Wpisz temat i rozpocznij debatę między dwoma agentami AI!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'ZA', neutral: 'NEUTRALNY', con: 'PRZECIW' },
      character: 'POSTAĆ:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Szukaj konsensusu',
      showSummary: 'Podsumowanie',
      consensusReached: 'KONSENSUS OSIĄGNIĘTY — Obie strony znalazły wspólny grunt.',
      debateStopped: 'DEBATA ZAKOŃCZONA — Debata została zatrzymana.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    ru: {
      checking: 'ПРОВЕРКА...', connected: 'ПОДКЛЮЧЕНО', disconnected: 'ОТКЛЮЧЕНО', notConnected: 'НЕ ПОДКЛЮЧЕНО!',
      topicPlaceholder: 'Введите тему дебатов... (напр. Заменит ли ИИ рабочие места?)',
      persona: 'ПЕРСОНА:', model: 'МОДЕЛЬ:',
      pro: 'За (PRO)', neutral: 'Нейтрально', con: 'Против (CON)',
      modelHaiku: 'Haiku (Быстрый)', modelSonnet: 'Sonnet (Сбалансир.)', modelOpus: 'Opus (Мощный)',
      startBattle: 'Начать дебаты', pause: 'Пауза', resume: 'Продолжить', stop: 'Стоп',
      ready: 'ГОТОВО', battle: 'ДЕБАТЫ!', paused: 'ПАУЗА', stopped: 'ОСТАНОВЛЕНО',
      messages: 'СООБЩЕНИЯ: 0',
      welcomeTitle: '⚔ АРЕНА ДЕБАТОВ ИИ ⚔',
      welcomeDesc: 'Введите тему и начните дебаты между двумя ИИ-агентами!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'ЗА', neutral: 'НЕЙТРАЛЬНО', con: 'ПРОТИВ' },
      character: 'ПЕРСОНАЖ:',
      charMaskDude: 'Маск Дюд', charNinjaFrog: 'Ниндзя Фрог', charPinkMan: 'Пинк Мэн', charVirtualGuy: 'Виртуал Гай',
      seekConsensus: 'Искать консенсус',
      showSummary: 'Итоги',
      consensusReached: 'КОНСЕНСУС ДОСТИГНУТ — Обе стороны нашли общую позицию.',
      debateStopped: 'ДЕБАТЫ ЗАВЕРШЕНЫ — Дебаты были остановлены.',
      consensusGaugeLabel: 'КОНСЕНСУС',
    },
    uk: {
      checking: 'ПЕРЕВІРКА...', connected: 'ПІДКЛЮЧЕНО', disconnected: 'ВІДКЛЮЧЕНО', notConnected: 'НЕ ПІДКЛЮЧЕНО!',
      topicPlaceholder: 'Введіть тему дебатів... (напр. Чи замінить ШІ робочі місця?)',
      persona: 'ПЕРСОНА:', model: 'МОДЕЛЬ:',
      pro: 'За (PRO)', neutral: 'Нейтрально', con: 'Проти (CON)',
      modelHaiku: 'Haiku (Швидкий)', modelSonnet: 'Sonnet (Збалансов.)', modelOpus: 'Opus (Потужний)',
      startBattle: 'Почати дебати', pause: 'Пауза', resume: 'Продовжити', stop: 'Стоп',
      ready: 'ГОТОВО', battle: 'ДЕБАТИ!', paused: 'ПАУЗА', stopped: 'ЗУПИНЕНО',
      messages: 'ПОВІДОМЛЕННЯ: 0',
      welcomeTitle: '⚔ АРЕНА ДЕБАТІВ ШІ ⚔',
      welcomeDesc: 'Введіть тему та почніть дебати між двома ШІ-агентами!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'ЗА', neutral: 'НЕЙТРАЛЬНО', con: 'ПРОТИ' },
      character: 'ПЕРСОНАЖ:',
      charMaskDude: 'Маск Дюд', charNinjaFrog: 'Ниндзя Фрог', charPinkMan: 'Пинк Мэн', charVirtualGuy: 'Виртуал Гай',
      seekConsensus: 'Шукати консенсус',
      showSummary: 'Підсумки',
      consensusReached: 'КОНСЕНСУС ДОСЯГНУТО — Обидві сторони знайшли спільну позицію.',
      debateStopped: 'ДЕБАТИ ЗАВЕРШЕНО — Дебати були зупинені.',
      consensusGaugeLabel: 'КОНСЕНСУС',
    },
    cs: {
      checking: 'KONTROLA...', connected: 'PŘIPOJENO', disconnected: 'ODPOJENO', notConnected: 'NEPŘIPOJENO!',
      topicPlaceholder: 'Zadejte téma debaty... (např. Nahradí AI lidská pracovní místa?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Pro (PRO)', neutral: 'Neutrální', con: 'Proti (CON)',
      modelHaiku: 'Haiku (Rychlý)', modelSonnet: 'Sonnet (Vyvážený)', modelOpus: 'Opus (Výkonný)',
      startBattle: 'Začít debatu', pause: 'Pauza', resume: 'Pokračovat', stop: 'Zastavit',
      ready: 'PŘIPRAVEN', battle: 'DEBATA!', paused: 'POZASTAVENO', stopped: 'ZASTAVENO',
      messages: 'ZPRÁVY: 0',
      welcomeTitle: '⚔ AI DEBATNÍ ARÉNA ⚔',
      welcomeDesc: 'Zadejte téma a spusťte debatu mezi dvěma AI agenty!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'PRO', neutral: 'NEUTRÁLNÍ', con: 'PROTI' },
      character: 'POSTAVA:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Hledat konsensus',
      showSummary: 'Shrnutí',
      consensusReached: 'KONSENSUS DOSAŽEN — Obě strany našly společnou řeč.',
      debateStopped: 'DEBATA UKONČENA — Debata byla zastavena.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    sv: {
      checking: 'KONTROLLERAR...', connected: 'ANSLUTEN', disconnected: 'FRÅNKOPPLAD', notConnected: 'EJ ANSLUTEN!',
      topicPlaceholder: 'Ange debattämne... (t.ex. Kommer AI ersätta mänskliga jobb?)',
      persona: 'PERSONA:', model: 'MODELL:',
      pro: 'För (PRO)', neutral: 'Neutral', con: 'Emot (CON)',
      modelHaiku: 'Haiku (Snabb)', modelSonnet: 'Sonnet (Balanserad)', modelOpus: 'Opus (Kraftfull)',
      startBattle: 'Starta debatt', pause: 'Paus', resume: 'Återuppta', stop: 'Stopp',
      ready: 'REDO', battle: 'DEBATT!', paused: 'PAUSAD', stopped: 'STOPPAD',
      messages: 'MEDDELANDEN: 0',
      welcomeTitle: '⚔ AI DEBATTARENA ⚔',
      welcomeDesc: 'Ange ett ämne och starta en debatt mellan två AI-agenter!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'FÖR', neutral: 'NEUTRAL', con: 'EMOT' },
      character: 'KARAKTÄR:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Sök konsensus',
      showSummary: 'Sammanfattning',
      consensusReached: 'KONSENSUS UPPNÅDD — Båda sidor har hittat gemensam mark.',
      debateStopped: 'DEBATT AVSLUTAD — Debatten har stoppats.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    da: {
      checking: 'KONTROLLERER...', connected: 'FORBUNDET', disconnected: 'AFBRUDT', notConnected: 'IKKE FORBUNDET!',
      topicPlaceholder: 'Indtast debatemne... (f.eks. Vil AI erstatte menneskelige job?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'For (PRO)', neutral: 'Neutral', con: 'Imod (CON)',
      modelHaiku: 'Haiku (Hurtig)', modelSonnet: 'Sonnet (Balanceret)', modelOpus: 'Opus (Kraftig)',
      startBattle: 'Start debat', pause: 'Pause', resume: 'Genoptag', stop: 'Stop',
      ready: 'KLAR', battle: 'DEBAT!', paused: 'PAUSET', stopped: 'STOPPET',
      messages: 'BESKEDER: 0',
      welcomeTitle: '⚔ AI DEBATARENA ⚔',
      welcomeDesc: 'Indtast et emne og start en debat mellem to AI-agenter!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'FOR', neutral: 'NEUTRAL', con: 'IMOD' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Søg konsensus',
      showSummary: 'Opsummering',
      consensusReached: 'KONSENSUS OPNÅET — Begge sider har fundet fælles grund.',
      debateStopped: 'DEBAT AFSLUTTET — Debatten er blevet stoppet.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    fi: {
      checking: 'TARKISTETAAN...', connected: 'YHDISTETTY', disconnected: 'YHTEYS KATKAISTU', notConnected: 'EI YHTEYTTÄ!',
      topicPlaceholder: 'Syötä keskusteluaihe... (esim. Korvaako tekoäly ihmisten työpaikat?)',
      persona: 'PERSONA:', model: 'MALLI:',
      pro: 'Puolesta (PRO)', neutral: 'Neutraali', con: 'Vastaan (CON)',
      modelHaiku: 'Haiku (Nopea)', modelSonnet: 'Sonnet (Tasapainoinen)', modelOpus: 'Opus (Tehokas)',
      startBattle: 'Aloita väittely', pause: 'Tauko', resume: 'Jatka', stop: 'Lopeta',
      ready: 'VALMIS', battle: 'VÄITTELY!', paused: 'TAUOLLA', stopped: 'LOPETETTU',
      messages: 'VIESTIT: 0',
      welcomeTitle: '⚔ AI VÄITTELYAREENA ⚔',
      welcomeDesc: 'Syötä aihe ja aloita väittely kahden tekoälyagentin välillä!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'PUOLESTA', neutral: 'NEUTRAALI', con: 'VASTAAN' },
      character: 'HAHMO:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Etsi yhteisymmärrystä',
      showSummary: 'Yhteenveto',
      consensusReached: 'YHTEISYMMÄRRYS SAAVUTETTU — Molemmat osapuolet löysivät yhteisen pohjan.',
      debateStopped: 'VÄITTELY PÄÄTTYNYT — Väittely on keskeytetty.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    nb: {
      checking: 'SJEKKER...', connected: 'TILKOBLET', disconnected: 'FRAKOBLET', notConnected: 'IKKE TILKOBLET!',
      topicPlaceholder: 'Skriv inn debattema... (f.eks. Vil KI erstatte menneskelige jobber?)',
      persona: 'PERSONA:', model: 'MODELL:',
      pro: 'For (PRO)', neutral: 'Nøytral', con: 'Mot (CON)',
      modelHaiku: 'Haiku (Rask)', modelSonnet: 'Sonnet (Balansert)', modelOpus: 'Opus (Kraftig)',
      startBattle: 'Start debatt', pause: 'Pause', resume: 'Fortsett', stop: 'Stopp',
      ready: 'KLAR', battle: 'DEBATT!', paused: 'PAUSET', stopped: 'STOPPET',
      messages: 'MELDINGER: 0',
      welcomeTitle: '⚔ AI DEBATTARENA ⚔',
      welcomeDesc: 'Skriv inn et tema og start en debatt mellom to AI-agenter!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'FOR', neutral: 'NØYTRAL', con: 'MOT' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Søk konsensus',
      showSummary: 'Oppsummering',
      consensusReached: 'KONSENSUS OPPNÅDD — Begge sider har funnet felles grunn.',
      debateStopped: 'DEBATT AVSLUTTET — Debatten har blitt stoppet.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    tr: {
      checking: 'KONTROL EDİLİYOR...', connected: 'BAĞLI', disconnected: 'BAĞLI DEĞİL', notConnected: 'BAĞLI DEĞİL!',
      topicPlaceholder: 'Tartışma konusu girin... (örn: Yapay zeka insan işlerini değiştirecek mi?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Lehte (PRO)', neutral: 'Tarafsız', con: 'Aleyhte (CON)',
      modelHaiku: 'Haiku (Hızlı)', modelSonnet: 'Sonnet (Dengeli)', modelOpus: 'Opus (Güçlü)',
      startBattle: 'Tartışma başlat', pause: 'Duraklat', resume: 'Devam et', stop: 'Durdur',
      ready: 'HAZIR', battle: 'TARTIŞMA!', paused: 'DURAKLATILDI', stopped: 'DURDURULDU',
      messages: 'MESAJLAR: 0',
      welcomeTitle: '⚔ AI TARTIŞMA ARENASI ⚔',
      welcomeDesc: 'Bir konu girin ve iki AI ajanı arasında tartışma başlatın!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'LEHTE', neutral: 'TARAFSIZ', con: 'ALEYHTE' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Uzlaşı ara',
      showSummary: 'Özet',
      consensusReached: 'UZLAŞI SAĞLANDI — Her iki taraf da ortak bir zemin buldu.',
      debateStopped: 'TARTIŞMA SONA ERDİ — Tartışma durduruldu.',
      consensusGaugeLabel: 'UZLAŞI',
    },
    el: {
      checking: 'ΕΛΕΓΧΟΣ...', connected: 'ΣΥΝΔΕΔΕΜΕΝΟ', disconnected: 'ΑΠΟΣΥΝΔΕΜΕΝΟ', notConnected: 'ΜΗ ΣΥΝΔΕΔΕΜΕΝΟ!',
      topicPlaceholder: 'Εισάγετε θέμα συζήτησης... (π.χ. Θα αντικαταστήσει η ΤΝ τις ανθρώπινες θέσεις εργασίας;)',
      persona: 'PERSONA:', model: 'ΜΟΝΤΕΛΟ:',
      pro: 'Υπέρ (PRO)', neutral: 'Ουδέτερο', con: 'Κατά (CON)',
      modelHaiku: 'Haiku (Γρήγορο)', modelSonnet: 'Sonnet (Ισορροπημένο)', modelOpus: 'Opus (Ισχυρό)',
      startBattle: 'Έναρξη συζήτησης', pause: 'Παύση', resume: 'Συνέχεια', stop: 'Διακοπή',
      ready: 'ΕΤΟΙΜΟ', battle: 'ΣΥΖΗΤΗΣΗ!', paused: 'ΣΕ ΠΑΥΣΗ', stopped: 'ΔΙΑΚΟΠΗ',
      messages: 'ΜΗΝΥΜΑΤΑ: 0',
      welcomeTitle: '⚔ AI ARENA ΣΥΖΗΤΗΣΗΣ ⚔',
      welcomeDesc: 'Εισάγετε ένα θέμα και ξεκινήστε μια συζήτηση μεταξύ δύο AI πρακτόρων!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'ΥΠΕΡ', neutral: 'ΟΥΔΕΤΕΡΟ', con: 'ΚΑΤΑ' },
      character: 'ΧΑΡΑΚΤΗΡΑΣ:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Αναζήτηση συναίνεσης',
      showSummary: 'Σύνοψη',
      consensusReached: 'ΣΥΝΑΙΝΕΣΗ ΕΠΙΤΕΥΧΘΗΚΕ — Και οι δύο πλευρές βρήκαν κοινό έδαφος.',
      debateStopped: 'ΣΥΖΗΤΗΣΗ ΤΕΡΜΑΤΙΣΤΗΚΕ — Η συζήτηση διακόπηκε.',
      consensusGaugeLabel: 'ΣΥΝΑΙΝΕΣΗ',
    },
    hu: {
      checking: 'ELLENŐRZÉS...', connected: 'CSATLAKOZVA', disconnected: 'LEVÁLASZTVA', notConnected: 'NINCS CSATLAKOZVA!',
      topicPlaceholder: 'Adja meg a vita témáját... (pl. Felváltja-e az MI az emberi munkahelyeket?)',
      persona: 'PERSONA:', model: 'MODELL:',
      pro: 'Mellette (PRO)', neutral: 'Semleges', con: 'Ellene (CON)',
      modelHaiku: 'Haiku (Gyors)', modelSonnet: 'Sonnet (Kiegyensúlyozott)', modelOpus: 'Opus (Erős)',
      startBattle: 'Vita indítása', pause: 'Szünet', resume: 'Folytatás', stop: 'Leállítás',
      ready: 'KÉSZ', battle: 'VITA!', paused: 'SZÜNETEL', stopped: 'LEÁLLÍTVA',
      messages: 'ÜZENETEK: 0',
      welcomeTitle: '⚔ AI VITAARÉNA ⚔',
      welcomeDesc: 'Adjon meg egy témát és indítson vitát két MI-ágens között!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'MELLETTE', neutral: 'SEMLEGES', con: 'ELLENE' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Konszenzust keresni',
      showSummary: 'Összefoglaló',
      consensusReached: 'KONSZENZUS ELÉRVE — Mindkét fél közös alapot talált.',
      debateStopped: 'VITA BEFEJEZVE — A vita leállításra került.',
      consensusGaugeLabel: 'KONSZENZUS',
    },
    ro: {
      checking: 'VERIFICARE...', connected: 'CONECTAT', disconnected: 'DECONECTAT', notConnected: 'NECONECTAT!',
      topicPlaceholder: 'Introduceți un subiect de dezbatere... (ex: Va înlocui IA locurile de muncă?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Pentru (PRO)', neutral: 'Neutru', con: 'Contra (CON)',
      modelHaiku: 'Haiku (Rapid)', modelSonnet: 'Sonnet (Echilibrat)', modelOpus: 'Opus (Puternic)',
      startBattle: 'Începe dezbaterea', pause: 'Pauză', resume: 'Reia', stop: 'Oprește',
      ready: 'PREGĂTIT', battle: 'DEZBATERE!', paused: 'ÎN PAUZĂ', stopped: 'OPRIT',
      messages: 'MESAJE: 0',
      welcomeTitle: '⚔ ARENA DE DEZBATERI IA ⚔',
      welcomeDesc: 'Introduceți un subiect și începeți o dezbatere între doi agenți IA!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'PENTRU', neutral: 'NEUTRU', con: 'CONTRA' },
      character: 'PERSONAJE:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Căutare consens',
      showSummary: 'Rezumat',
      consensusReached: 'CONSENS ATINS — Ambele părți au găsit un teren comun.',
      debateStopped: 'DEZBATERE ÎNCHEIATĂ — Dezbaterea a fost oprită.',
      consensusGaugeLabel: 'CONSENS',
    },
    // === Additional Asian Languages ===
    th: {
      checking: 'กำลังตรวจสอบ...', connected: 'เชื่อมต่อแล้ว', disconnected: 'ไม่ได้เชื่อมต่อ', notConnected: 'ไม่ได้เชื่อมต่อ!',
      topicPlaceholder: 'ใส่หัวข้อการอภิปราย... (เช่น AI จะแทนที่งานของมนุษย์หรือไม่?)',
      persona: 'บทบาท:', model: 'โมเดล:',
      pro: 'เห็นด้วย (PRO)', neutral: 'เป็นกลาง', con: 'ไม่เห็นด้วย (CON)',
      modelHaiku: 'Haiku (เร็ว)', modelSonnet: 'Sonnet (สมดุล)', modelOpus: 'Opus (ทรงพลัง)',
      startBattle: 'เริ่มอภิปราย', pause: 'หยุดชั่วคราว', resume: 'ดำเนินต่อ', stop: 'หยุด',
      ready: 'พร้อม', battle: 'กำลังอภิปราย!', paused: 'หยุดชั่วคราว', stopped: 'หยุดแล้ว',
      messages: 'ข้อความ: 0',
      welcomeTitle: '⚔ AI สนามอภิปราย ⚔',
      welcomeDesc: 'ใส่หัวข้อแล้วกดเริ่มเพื่อให้ AI สองตัวอภิปรายกัน!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'เห็นด้วย', neutral: 'เป็นกลาง', con: 'ไม่เห็นด้วย' },
      character: 'ตัวละคร:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'หาฉันทามติ',
      showSummary: 'สรุป',
      consensusReached: 'บรรลุฉันทามติ — ทั้งสองฝ่ายพบจุดร่วม',
      debateStopped: 'จบการอภิปราย — การอภิปรายถูกหยุด',
      consensusGaugeLabel: 'ฉันทามติ',
    },
    vi: {
      checking: 'ĐANG KIỂM TRA...', connected: 'ĐÃ KẾT NỐI', disconnected: 'NGẮT KẾT NỐI', notConnected: 'CHƯA KẾT NỐI!',
      topicPlaceholder: 'Nhập chủ đề tranh luận... (VD: AI có thay thế công việc của con người?)',
      persona: 'VAI TRÒ:', model: 'MÔ HÌNH:',
      pro: 'Ủng hộ (PRO)', neutral: 'Trung lập', con: 'Phản đối (CON)',
      modelHaiku: 'Haiku (Nhanh)', modelSonnet: 'Sonnet (Cân bằng)', modelOpus: 'Opus (Mạnh mẽ)',
      startBattle: 'Bắt đầu tranh luận', pause: 'Tạm dừng', resume: 'Tiếp tục', stop: 'Dừng',
      ready: 'SẴN SÀNG', battle: 'TRANH LUẬN!', paused: 'TẠM DỪNG', stopped: 'ĐÃ DỪNG',
      messages: 'TIN NHẮN: 0',
      welcomeTitle: '⚔ ĐẤU TRƯỜNG TRANH LUẬN AI ⚔',
      welcomeDesc: 'Nhập chủ đề và bắt đầu cuộc tranh luận giữa hai AI!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'ỦNG HỘ', neutral: 'TRUNG LẬP', con: 'PHẢN ĐỐI' },
      character: 'NHÂN VẬT:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Tìm đồng thuận',
      showSummary: 'Tóm tắt',
      consensusReached: 'ĐẠT ĐỒNG THUẬN — Cả hai bên đã tìm được tiếng nói chung.',
      debateStopped: 'TRANH LUẬN KẾT THÚC — Cuộc tranh luận đã bị dừng.',
      consensusGaugeLabel: 'ĐỒNG THUẬN',
    },
    id: {
      checking: 'MEMERIKSA...', connected: 'TERHUBUNG', disconnected: 'TERPUTUS', notConnected: 'TIDAK TERHUBUNG!',
      topicPlaceholder: 'Masukkan topik debat... (cth: Akankah AI menggantikan pekerjaan manusia?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Setuju (PRO)', neutral: 'Netral', con: 'Menolak (CON)',
      modelHaiku: 'Haiku (Cepat)', modelSonnet: 'Sonnet (Seimbang)', modelOpus: 'Opus (Kuat)',
      startBattle: 'Mulai debat', pause: 'Jeda', resume: 'Lanjutkan', stop: 'Berhenti',
      ready: 'SIAP', battle: 'DEBAT!', paused: 'DIJEDA', stopped: 'DIHENTIKAN',
      messages: 'PESAN: 0',
      welcomeTitle: '⚔ ARENA DEBAT AI ⚔',
      welcomeDesc: 'Masukkan topik dan mulai debat antara dua agen AI!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'SETUJU', neutral: 'NETRAL', con: 'MENOLAK' },
      character: 'KARAKTER:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Cari konsensus',
      showSummary: 'Ringkasan',
      consensusReached: 'KONSENSUS TERCAPAI — Kedua agen menemukan titik temu.',
      debateStopped: 'DEBAT SELESAI — Debat telah dihentikan.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    ms: {
      checking: 'MENYEMAK...', connected: 'DISAMBUNG', disconnected: 'TERPUTUS', notConnected: 'TIDAK DISAMBUNG!',
      topicPlaceholder: 'Masukkan topik perbahasan... (cth: Adakah AI akan menggantikan pekerjaan manusia?)',
      persona: 'PERSONA:', model: 'MODEL:',
      pro: 'Setuju (PRO)', neutral: 'Neutral', con: 'Menentang (CON)',
      modelHaiku: 'Haiku (Pantas)', modelSonnet: 'Sonnet (Seimbang)', modelOpus: 'Opus (Berkuasa)',
      startBattle: 'Mula perbahasan', pause: 'Jeda', resume: 'Sambung', stop: 'Henti',
      ready: 'SEDIA', battle: 'PERBAHASAN!', paused: 'DIJEDA', stopped: 'DIHENTIKAN',
      messages: 'MESEJ: 0',
      welcomeTitle: '⚔ ARENA PERBAHASAN AI ⚔',
      welcomeDesc: 'Masukkan topik dan mulakan perbahasan antara dua agen AI!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'SETUJU', neutral: 'NEUTRAL', con: 'MENENTANG' },
      character: 'WATAK:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'Cari konsensus',
      showSummary: 'Rumusan',
      consensusReached: 'KONSENSUS DICAPAI — Kedua-dua pihak menemui titik persamaan.',
      debateStopped: 'PERBAHASAN TAMAT — Perbahasan telah dihentikan.',
      consensusGaugeLabel: 'KONSENSUS',
    },
    hi: {
      checking: 'जाँच हो रही है...', connected: 'कनेक्टेड', disconnected: 'डिस्कनेक्टेड', notConnected: 'कनेक्ट नहीं!',
      topicPlaceholder: 'बहस का विषय दर्ज करें... (उदा: क्या AI मानव नौकरियों की जगह लेगा?)',
      persona: 'भूमिका:', model: 'मॉडल:',
      pro: 'पक्ष में (PRO)', neutral: 'तटस्थ', con: 'विपक्ष में (CON)',
      modelHaiku: 'Haiku (तेज़)', modelSonnet: 'Sonnet (संतुलित)', modelOpus: 'Opus (शक्तिशाली)',
      startBattle: 'बहस शुरू करें', pause: 'रोकें', resume: 'जारी रखें', stop: 'बंद करें',
      ready: 'तैयार', battle: 'बहस जारी!', paused: 'रुका हुआ', stopped: 'बंद',
      messages: 'संदेश: 0',
      welcomeTitle: '⚔ AI बहस अखाड़ा ⚔',
      welcomeDesc: 'विषय दर्ज करें और दो AI एजेंटों के बीच बहस शुरू करें!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'पक्ष', neutral: 'तटस्थ', con: 'विपक्ष' },
      character: 'चरित्र:',
      charMaskDude: 'मास्क ड्यूड', charNinjaFrog: 'निंजा फ्रॉग', charPinkMan: 'पिंक मैन', charVirtualGuy: 'वर्चुअल गाय',
      seekConsensus: 'सहमति खोजें',
      showSummary: 'सारांश',
      consensusReached: 'सहमति प्राप्त — दोनों पक्षों ने समान आधार पाया।',
      debateStopped: 'बहस समाप्त — बहस रोक दी गई।',
      consensusGaugeLabel: 'सहमति',
    },
    bn: {
      checking: 'যাচাই হচ্ছে...', connected: 'সংযুক্ত', disconnected: 'সংযোগ বিচ্ছিন্ন', notConnected: 'সংযুক্ত নয়!',
      topicPlaceholder: 'বিতর্কের বিষয় লিখুন... (যেমন: AI কি মানুষের চাকরি প্রতিস্থাপন করবে?)',
      persona: 'ভূমিকা:', model: 'মডেল:',
      pro: 'পক্ষে (PRO)', neutral: 'নিরপেক্ষ', con: 'বিপক্ষে (CON)',
      modelHaiku: 'Haiku (দ্রুত)', modelSonnet: 'Sonnet (সুষম)', modelOpus: 'Opus (শক্তিশালী)',
      startBattle: 'বিতর্ক শুরু', pause: 'বিরতি', resume: 'চালিয়ে যান', stop: 'থামান',
      ready: 'প্রস্তুত', battle: 'বিতর্ক চলছে!', paused: 'বিরতিতে', stopped: 'থেমে গেছে',
      messages: 'বার্তা: 0',
      welcomeTitle: '⚔ AI বিতর্ক আখড়া ⚔',
      welcomeDesc: 'বিষয় লিখুন এবং দুটি AI এজেন্টের মধ্যে বিতর্ক শুরু করুন!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'পক্ষে', neutral: 'নিরপেক্ষ', con: 'বিপক্ষে' },
      character: 'চরিত্র:',
      charMaskDude: 'মাস্ক ডিউড', charNinjaFrog: 'নিনজা ফ্রগ', charPinkMan: 'পিংক ম্যান', charVirtualGuy: 'ভার্চুয়াল গাই',
      seekConsensus: 'ঐকমত্য খোঁজা',
      showSummary: 'সারসংক্ষেপ',
      consensusReached: 'ঐকমত্যে পৌঁছানো হয়েছে — উভয় পক্ষ সাধারণ ভিত্তি খুঁজে পেয়েছে।',
      debateStopped: 'বিতর্ক শেষ — বিতর্ক বন্ধ করা হয়েছে।',
      consensusGaugeLabel: 'ঐকমত্য',
    },
    // === Middle Eastern Languages ===
    ar: {
      checking: 'جارٍ التحقق...', connected: 'متصل', disconnected: 'غير متصل', notConnected: 'غير متصل!',
      topicPlaceholder: 'أدخل موضوع النقاش... (مثال: هل سيحل الذكاء الاصطناعي محل الوظائف البشرية؟)',
      persona: 'الشخصية:', model: 'النموذج:',
      pro: 'مؤيد (PRO)', neutral: 'محايد', con: 'معارض (CON)',
      modelHaiku: 'Haiku (سريع)', modelSonnet: 'Sonnet (متوازن)', modelOpus: 'Opus (قوي)',
      startBattle: 'بدء النقاش', pause: 'إيقاف مؤقت', resume: 'استئناف', stop: 'إيقاف',
      ready: 'جاهز', battle: 'نقاش!', paused: 'متوقف مؤقتاً', stopped: 'متوقف',
      messages: 'الرسائل: 0',
      welcomeTitle: '⚔ ساحة نقاش الذكاء الاصطناعي ⚔',
      welcomeDesc: 'أدخل موضوعاً وابدأ نقاشاً بين وكيلي ذكاء اصطناعي!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'مؤيد', neutral: 'محايد', con: 'معارض' },
      character: 'الشخصية:',
      charMaskDude: 'رجل القناع', charNinjaFrog: 'ضفدع النينجا', charPinkMan: 'الرجل الوردي', charVirtualGuy: 'الرجل الافتراضي',
      seekConsensus: 'البحث عن توافق',
      showSummary: 'ملخص',
      consensusReached: 'تم التوصل إلى توافق — وجد كلا الطرفين أرضية مشتركة.',
      debateStopped: 'انتهى النقاش — تم إيقاف النقاش.',
      consensusGaugeLabel: 'توافق',
    },
    he: {
      checking: 'בודק...', connected: 'מחובר', disconnected: 'מנותק', notConnected: 'לא מחובר!',
      topicPlaceholder: 'הזן נושא לדיון... (לדוגמה: האם AI יחליף משרות אנושיות?)',
      persona: 'פרסונה:', model: 'מודל:',
      pro: 'בעד (PRO)', neutral: 'ניטרלי', con: 'נגד (CON)',
      modelHaiku: 'Haiku (מהיר)', modelSonnet: 'Sonnet (מאוזן)', modelOpus: 'Opus (חזק)',
      startBattle: 'התחל דיון', pause: 'השהה', resume: 'המשך', stop: 'עצור',
      ready: 'מוכן', battle: 'דיון!', paused: 'מושהה', stopped: 'נעצר',
      messages: 'הודעות: 0',
      welcomeTitle: '⚔ זירת דיון AI ⚔',
      welcomeDesc: 'הזן נושא והתחל דיון בין שני סוכני AI!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'בעד', neutral: 'ניטרלי', con: 'נגד' },
      character: 'דמות:',
      charMaskDude: 'Mask Dude', charNinjaFrog: 'Ninja Frog', charPinkMan: 'Pink Man', charVirtualGuy: 'Virtual Guy',
      seekConsensus: 'חיפוש הסכמה',
      showSummary: 'סיכום',
      consensusReached: 'הושגה הסכמה — שני הצדדים מצאו בסיס משותף.',
      debateStopped: 'הדיון הסתיים — הדיון הופסק.',
      consensusGaugeLabel: 'הסכמה',
    },
    fa: {
      checking: 'در حال بررسی...', connected: 'متصل', disconnected: 'قطع شده', notConnected: 'متصل نیست!',
      topicPlaceholder: 'موضوع بحث را وارد کنید... (مثال: آیا هوش مصنوعی جایگزین مشاغل انسانی خواهد شد؟)',
      persona: 'شخصیت:', model: 'مدل:',
      pro: 'موافق (PRO)', neutral: 'بی‌طرف', con: 'مخالف (CON)',
      modelHaiku: 'Haiku (سریع)', modelSonnet: 'Sonnet (متعادل)', modelOpus: 'Opus (قدرتمند)',
      startBattle: 'شروع بحث', pause: 'مکث', resume: 'ادامه', stop: 'توقف',
      ready: 'آماده', battle: 'بحث!', paused: 'در مکث', stopped: 'متوقف',
      messages: 'پیام‌ها: 0',
      welcomeTitle: '⚔ میدان مناظره هوش مصنوعی ⚔',
      welcomeDesc: 'موضوعی وارد کنید و مناظره بین دو عامل هوش مصنوعی را آغاز کنید!',
      welcomeHint: 'Powered by Claude CLI',
      personaLabels: { pro: 'موافق', neutral: 'بی‌طرف', con: 'مخالف' },
      character: 'شخصیت:',
      charMaskDude: 'مرد نقابدار', charNinjaFrog: 'قورباغه نینجا', charPinkMan: 'مرد صورتی', charVirtualGuy: 'مرد مجازی',
      seekConsensus: 'جستجوی توافق',
      showSummary: 'خلاصه',
      consensusReached: 'توافق حاصل شد — هر دو طرف زمینه مشترکی پیدا کردند.',
      debateStopped: 'بحث پایان یافت — بحث متوقف شد.',
      consensusGaugeLabel: 'توافق',
    },
  };

  /** @param {string} key */
  function t(key) {
    return (I18N[LANG] || I18N.en)[key] || I18N.en[key] || key;
  }

  const PERSONA_LABELS = (I18N[LANG] || I18N.en).personaLabels;

  // Apply i18n to static elements
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) /** @type {HTMLInputElement} */ (el).placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
  }

  /** @type {HTMLElement} */
  const chatArea = document.getElementById('chatArea');
  /** @type {HTMLInputElement} */
  const topicInput = document.getElementById('topicInput');
  /** @type {HTMLSelectElement} */
  const personaASelect = document.getElementById('personaA');
  /** @type {HTMLSelectElement} */
  const personaBSelect = document.getElementById('personaB');
  /** @type {HTMLSelectElement} */
  const providerASelect = document.getElementById('providerA');
  /** @type {HTMLSelectElement} */
  const providerBSelect = document.getElementById('providerB');
  /** @type {HTMLSelectElement} */
  const modelASelect = document.getElementById('modelA');
  /** @type {HTMLSelectElement} */
  const modelBSelect = document.getElementById('modelB');
  /** @type {HTMLSelectElement} */
  const charASelect = document.getElementById('charA');
  /** @type {HTMLSelectElement} */
  const charBSelect = document.getElementById('charB');
  /** @type {HTMLInputElement} */
  const nameAInput = document.getElementById('nameA');
  /** @type {HTMLInputElement} */
  const nameBInput = document.getElementById('nameB');
  /** @type {HTMLInputElement} */
  const seekConsensusCheck = document.getElementById('seekConsensus');
  /** @type {HTMLInputElement} */
  const showSummaryCheck = document.getElementById('showSummary');
  /** @type {HTMLInputElement} */
  const allowConcessionCheck = document.getElementById('allowConcession');
  /** @type {HTMLButtonElement} */
  const modeBtn = document.getElementById('modeBtn');
  let currentMode = 'general'; // 'general' or 'code'
  /** @type {HTMLButtonElement} */
  const startBtn = document.getElementById('startBtn');
  /** @type {HTMLButtonElement} */
  const pauseBtn = document.getElementById('pauseBtn');
  /** @type {HTMLButtonElement} */
  const stopBtn = document.getElementById('stopBtn');
  /** @type {HTMLElement} */
  const statusDot = document.getElementById('statusDot');
  /** @type {HTMLElement} */
  const statusText = document.getElementById('statusText');
  /** @type {HTMLElement} */
  const connDotClaude = document.getElementById('connDotClaude');
  /** @type {HTMLElement} */
  const connLabelClaude = document.getElementById('connLabelClaude');
  /** @type {HTMLElement} */
  const connAccountClaude = document.getElementById('connAccountClaude');
  /** @type {HTMLElement} */
  const connDotGemini = document.getElementById('connDotGemini');
  /** @type {HTMLElement} */
  const connLabelGemini = document.getElementById('connLabelGemini');
  /** @type {HTMLElement} */
  const connAccountGemini = document.getElementById('connAccountGemini');
  /** @type {HTMLButtonElement} */
  const connRefresh = document.getElementById('connRefresh');
  /** @type {HTMLElement} */
  const connInfo = document.getElementById('connInfo');

  /** @type {HTMLElement} */
  const consensusGaugeEl = document.getElementById('consensusGauge');
  /** @type {HTMLElement} */
  const consensusGaugeFill = document.getElementById('consensusGaugeFill');
  /** @type {HTMLElement} */
  const consensusGaugeValue = document.getElementById('consensusGaugeValue');

  let isConnected = false;
  let claudeCheckDone = false;  // per-provider auth check status
  let geminiCheckDone = false;
  let claudeAvailable = false;
  let geminiAvailable = false;
  let currentStatus = 'idle';

  // ===== Helpers =====
  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ===== Webview State Persistence =====
  // Tracks chat entries so state survives window detach/reattach
  let chatEntries = [];
  let lastConsensusGauge = null;

  function persistState() {
    vscode.setState({
      chatEntries,
      currentStatus,
      currentMode,
      consensusGauge: lastConsensusGauge,
    });
  }

  function replayChatEntries(entries) {
    chatArea.innerHTML = '';
    for (const entry of entries) {
      switch (entry.type) {
        case 'message':
          addMessage(entry.data, true);
          break;
        case 'consensus': {
          const div = document.createElement('div');
          div.className = 'chat-message consensus-banner';
          div.innerHTML = `<div class="consensus-text">${t('consensusReached')}</div>`;
          chatArea.appendChild(div);
          break;
        }
        case 'concession': {
          const div = document.createElement('div');
          div.className = 'chat-message consensus-banner';
          const text = t('concessionMessage').replace('{conceder}', escapeHtml(entry.data.conceder)).replace('{winner}', escapeHtml(entry.data.winner));
          div.innerHTML = `<div class="consensus-text">${text}</div>`;
          chatArea.appendChild(div);
          break;
        }
        case 'summary': {
          const div = document.createElement('div');
          div.className = 'chat-message summary-banner';
          div.innerHTML = `<div class="summary-header">${t('moderatorSummary')}</div><div class="summary-content">${escapeHtml(entry.data)}</div>`;
          chatArea.appendChild(div);
          break;
        }
        case 'summaryLoading': {
          const div = document.createElement('div');
          div.className = 'chat-message summary-loading';
          div.innerHTML = `<div class="summary-loading-text">${t('summaryLoading')}</div>`;
          chatArea.appendChild(div);
          break;
        }
        case 'stopped': {
          const div = document.createElement('div');
          div.className = 'chat-message consensus-banner';
          div.innerHTML = `<div class="consensus-text">${t('debateStopped')}</div>`;
          chatArea.appendChild(div);
          break;
        }
        case 'error': {
          const div = document.createElement('div');
          div.className = 'chat-message agent-a';
          div.style.alignSelf = 'center';
          div.style.maxWidth = '100%';
          const bubble = document.createElement('div');
          bubble.className = 'speech-bubble';
          bubble.style.background = '#4a1a1a';
          bubble.style.outlineColor = '#ef5350';
          const content = document.createElement('div');
          content.className = 'bubble-content';
          content.style.color = '#ef5350';
          content.textContent = '\u26A0 ' + entry.data;
          bubble.appendChild(content);
          div.appendChild(bubble);
          chatArea.appendChild(div);
          break;
        }
      }
    }
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function restoreConsensusGauge(gauge) {
    if (!gauge || !consensusGaugeEl) return;
    lastConsensusGauge = gauge;
    consensusGaugeEl.style.display = 'inline-flex';
    const avg = gauge.average;
    consensusGaugeFill.style.width = avg + '%';
    consensusGaugeValue.textContent = avg + '%';
    if (avg < 30) {
      consensusGaugeFill.style.background = 'var(--accent-red)';
    } else if (avg < 60) {
      consensusGaugeFill.style.background = 'var(--accent-yellow)';
    } else {
      consensusGaugeFill.style.background = 'var(--accent-green)';
    }
  }

  // ===== Provider-dependent Model Lists =====
  const CLAUDE_MODELS = [
    { value: 'haiku', i18n: 'modelHaiku' },
    { value: 'sonnet', i18n: 'modelSonnet' },
    { value: 'opus', i18n: 'modelOpus' },
  ];
  const GEMINI_MODELS = [
    { value: 'gemini-2.5-flash', i18n: 'modelGeminiFlash' },
    { value: 'gemini-2.5-pro', i18n: 'modelGeminiPro' },
  ];

  function updateModelOptions(providerSelect, modelSelect) {
    const provider = providerSelect.value;
    const models = provider === 'gemini' ? GEMINI_MODELS : CLAUDE_MODELS;
    const prevValue = modelSelect.value;
    modelSelect.innerHTML = '';
    models.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = t(m.i18n);
      if (i === (models.length > 2 ? 1 : 0)) opt.selected = true; // default: sonnet / flash
      modelSelect.appendChild(opt);
    });
    // Restore previous value if still valid
    const validValues = models.map(m => m.value);
    if (validValues.includes(prevValue)) {
      modelSelect.value = prevValue;
    }
  }

  providerASelect.addEventListener('change', () => { updateModelOptions(providerASelect, modelASelect); updateStartBtnState(); });
  providerBSelect.addEventListener('change', () => { updateModelOptions(providerBSelect, modelBSelect); updateStartBtnState(); });

  /** Update the two provider connection indicators */
  function setProviderStatus(provider, status) {
    const dot = provider === 'claude' ? connDotClaude : connDotGemini;
    const label = provider === 'claude' ? connLabelClaude : connLabelGemini;
    dot.className = 'conn-dot ' + status;
    label.className = 'conn-label ' + status;
  }

  function setAccountInfo(el, text) {
    el.textContent = text;
  }

  /** Check if the start button should be enabled based on selected providers' auth status */
  function updateStartBtnState() {
    if (currentStatus === 'running') {
      startBtn.disabled = true;
      return;
    }
    const needClaude = providerASelect.value === 'claude' || providerBSelect.value === 'claude';
    const needGemini = providerASelect.value === 'gemini' || providerBSelect.value === 'gemini';
    const blocked = (needClaude && !claudeCheckDone) || (needGemini && !geminiCheckDone);
    startBtn.disabled = blocked;
  }

  /** Disable provider options that are not available */
  function updateProviderOptions() {
    [providerASelect, providerBSelect].forEach(sel => {
      for (const opt of sel.options) {
        if (opt.value === 'claude') opt.disabled = !claudeAvailable;
        if (opt.value === 'gemini') opt.disabled = !geminiAvailable;
      }
      // If current selection is unavailable, switch to the other
      if (sel.value === 'claude' && !claudeAvailable && geminiAvailable) {
        sel.value = 'gemini';
        updateModelOptions(sel, sel === providerASelect ? modelASelect : modelBSelect);
      } else if (sel.value === 'gemini' && !geminiAvailable && claudeAvailable) {
        sel.value = 'claude';
        updateModelOptions(sel, sel === providerASelect ? modelASelect : modelBSelect);
      }
    });
  }

  // ===== Pixel Adventure 1 Sprite System =====
  // Sprite data injected from extension as base64 data URIs
  // @ts-ignore
  const SPRITE_DATA = window.__SPRITE_DATA__ || {};

  // PA1 character config: frames = sheet_width / frame_width
  const PA1_CHARS = {
    'mask-dude':   { frames: 11, hitFrames: 7, w: 32, h: 32, color: '#3a86ff' },
    'ninja-frog':  { frames: 11, hitFrames: 7, w: 32, h: 32, color: '#4aaa3a' },
    'pink-man':    { frames: 11, hitFrames: 7, w: 32, h: 32, color: '#ff6b9d' },
    'virtual-guy': { frames: 11, hitFrames: 7, w: 32, h: 32, color: '#6bc5ff' },
  };

  // Pre-load sprite sheet images (idle + hit)
  const spriteImages = {};
  const hitSpriteImages = {};
  for (const [key, dataUri] of Object.entries(SPRITE_DATA)) {
    const img = new Image();
    img.src = /** @type {string} */ (dataUri);
    if (key.endsWith('-hit')) {
      hitSpriteImages[key.replace('-hit', '')] = img;
    } else {
      spriteImages[key] = img;
    }
  }

  // Track selected character per agent
  let selectedCharA = 'mask-dude';
  let selectedCharB = 'ninja-frog';

  // Active animated sprites (for requestAnimationFrame)
  const activeSprites = new Set();
  let animFrame = 0;
  let lastAnimTime = 0;

  function animateSprites(time) {
    // Animate at 20fps (50ms per frame)
    if (time - lastAnimTime >= 50) {
      lastAnimTime = time;
      animFrame++;
      activeSprites.forEach(sprite => {
        if (sprite && sprite.parentNode) {
          drawSpriteFrame(sprite);
        } else {
          activeSprites.delete(sprite);
        }
      });
    }
    if (activeSprites.size > 0) {
      requestAnimationFrame(animateSprites);
    }
  }

  function drawSpriteFrame(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const charKey = canvas.dataset.charKey;
    const agent = canvas.dataset.agent;
    const charInfo = PA1_CHARS[charKey] || PA1_CHARS['mask-dude'];
    const flip = canvas.dataset.flip === '1';

    const img = spriteImages[charKey];
    const totalFrames = charInfo.frames;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    if (flip) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const frame = animFrame % totalFrames;
      ctx.drawImage(img, frame * charInfo.w, 0, charInfo.w, charInfo.h, 0, 0, canvas.width, canvas.height);
    } else {
      drawFallbackChar(ctx, charInfo.color, canvas.width);
    }

    ctx.restore();
  }

  function drawFallbackChar(ctx, color, size) {
    const s = size / 16; // scale factor
    ctx.fillStyle = color;
    // Head
    for (let x = 5; x <= 10; x++) for (let y = 1; y <= 5; y++) ctx.fillRect(x*s, y*s, s, s);
    for (let x = 4; x <= 11; x++) for (let y = 2; y <= 4; y++) ctx.fillRect(x*s, y*s, s, s);
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(6*s, 3*s, s, s); ctx.fillRect(9*s, 3*s, s, s);
    ctx.fillStyle = '#000000';
    ctx.fillRect(6*s, 4*s, s, s); ctx.fillRect(9*s, 4*s, s, s);
    // Body
    ctx.fillStyle = color;
    for (let x = 5; x <= 10; x++) for (let y = 7; y <= 11; y++) ctx.fillRect(x*s, y*s, s, s);
    // Legs
    for (let y = 12; y <= 14; y++) {
      ctx.fillRect(6*s, y*s, s*2, s);
      ctx.fillRect(9*s, y*s, s*2, s);
    }
    // Idle bob
    const bob = Math.sin(animFrame * 0.3) > 0 ? 0 : s;
    if (bob) {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(0, -bob);
      ctx.fillStyle = color;
      for (let x = 5; x <= 10; x++) for (let y = 1; y <= 5; y++) ctx.fillRect(x*s, y*s, s, s);
      for (let x = 4; x <= 11; x++) for (let y = 2; y <= 4; y++) ctx.fillRect(x*s, y*s, s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6*s, 3*s, s, s); ctx.fillRect(9*s, 3*s, s, s);
      ctx.fillStyle = '#000000';
      ctx.fillRect(6*s, 4*s, s, s); ctx.fillRect(9*s, 4*s, s, s);
      ctx.fillStyle = color;
      for (let x = 5; x <= 10; x++) for (let y = 7; y <= 11; y++) ctx.fillRect(x*s, y*s, s, s);
      for (let y = 12; y <= 14; y++) {
        ctx.fillRect(6*s, y*s, s*2, s);
        ctx.fillRect(9*s, y*s, s*2, s);
      }
      ctx.restore();
    }
  }

  function createCharacterCanvas(charKey, flip, agent) {
    const charInfo = PA1_CHARS[charKey] || PA1_CHARS['mask-dude'];
    const canvas = document.createElement('canvas');
    canvas.width = charInfo.w;
    canvas.height = charInfo.h;
    canvas.style.width = '64px';
    canvas.style.height = '64px';
    canvas.style.imageRendering = 'pixelated';
    canvas.dataset.charKey = charKey;
    if (flip) canvas.dataset.flip = '1';
    if (agent) canvas.dataset.agent = agent;

    drawSpriteFrame(canvas);
    activeSprites.add(canvas);
    if (activeSprites.size === 1) {
      requestAnimationFrame(animateSprites);
    }

    return canvas;
  }

  function createLogoCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    canvas.style.width = '128px';
    canvas.style.height = '128px';
    canvas.style.imageRendering = 'pixelated';

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const leftChar = [
      [8,4,'#1a3a8a'],[9,4,'#1a3a8a'],[10,4,'#1a3a8a'],
      [7,5,'#1a3a8a'],[8,5,'#ffcc88'],[9,5,'#ffcc88'],[10,5,'#ffcc88'],[11,5,'#1a3a8a'],
      [8,6,'#2244aa'],[9,6,'#ffcc88'],[10,6,'#2244aa'],
      [8,7,'#ffcc88'],[9,7,'#cc6655'],[10,7,'#ffcc88'],
      [7,8,'#2255bb'],[8,8,'#2255bb'],[9,8,'#2255bb'],[10,8,'#2255bb'],[11,8,'#2255bb'],
      [8,9,'#2255bb'],[9,9,'#2255bb'],[10,9,'#2255bb'],
      [7,10,'#554433'],[8,10,'#554433'],[10,10,'#554433'],[11,10,'#554433'],
    ];
    const rightChar = [
      [20,4,'#8a1a1a'],[21,4,'#8a1a1a'],[22,4,'#8a1a1a'],
      [19,5,'#8a1a1a'],[20,5,'#ffcc88'],[21,5,'#ffcc88'],[22,5,'#ffcc88'],[23,5,'#8a1a1a'],
      [20,6,'#aa2222'],[21,6,'#ffcc88'],[22,6,'#aa2222'],
      [20,7,'#ffcc88'],[21,7,'#cc6655'],[22,7,'#ffcc88'],
      [19,8,'#aa3333'],[20,8,'#aa3333'],[21,8,'#aa3333'],[22,8,'#aa3333'],[23,8,'#aa3333'],
      [20,9,'#aa3333'],[21,9,'#aa3333'],[22,9,'#aa3333'],
      [19,10,'#332222'],[20,10,'#332222'],[22,10,'#332222'],[23,10,'#332222'],
    ];
    const swords = [
      [12,3,'#cccccc'],[13,4,'#cccccc'],[14,5,'#cccccc'],[15,6,'#cccccc'],[16,7,'#ffd54f'],
      [18,3,'#cccccc'],[17,4,'#cccccc'],[16,5,'#cccccc'],[15,6,'#cccccc'],
    ];
    const vsText = [
      [14,14,'#ffd54f'],[15,14,'#ffd54f'],[16,14,'#ffd54f'],[17,14,'#ffd54f'],
      [14,15,'#ffd54f'],[16,15,'#ffd54f'],[17,15,'#ffd54f'],
      [15,16,'#ffd54f'],[16,16,'#ffd54f'],
      [14,17,'#ffd54f'],[15,17,'#ffd54f'],[17,17,'#ffd54f'],
      [14,18,'#ffd54f'],[15,18,'#ffd54f'],[16,18,'#ffd54f'],[17,18,'#ffd54f'],
    ];
    const sparkles = [
      [4,2,'#ffd54f'],[5,3,'#ffd54f'],[3,3,'#ffd54f'],[4,4,'#ffd54f'],
      [27,2,'#ffd54f'],[28,3,'#ffd54f'],[26,3,'#ffd54f'],[27,4,'#ffd54f'],
      [15,22,'#4fc3f7'],[16,21,'#4fc3f7'],[14,21,'#4fc3f7'],[15,20,'#4fc3f7'],
    ];

    const allPixels = [...leftChar, ...rightChar, ...swords, ...vsText, ...sparkles];
    for (const [x, y, color] of allPixels) {
      ctx.fillStyle = /** @type {string} */ (color);
      ctx.fillRect(/** @type {number} */(x), /** @type {number} */(y), 1, 1);
    }

    return canvas;
  }

  // ===== Chat Messages =====
  function addMessage(msg, skipPersist) {
    const thinking = document.querySelector('.thinking-indicator');
    if (thinking) thinking.remove();
    const welcome = document.querySelector('.welcome');
    if (welcome) welcome.remove();

    const wrapper = document.createElement('div');
    wrapper.className = `chat-message agent-${msg.agent.toLowerCase()} persona-${msg.persona}`;

    const spriteDiv = document.createElement('div');
    spriteDiv.className = 'character-sprite';
    const charKey = msg.agent === 'A' ? selectedCharA : selectedCharB;
    const isRight = msg.agent === 'B';
    spriteDiv.appendChild(createCharacterCanvas(charKey, isRight, msg.agent));

    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';

    const header = document.createElement('div');
    header.className = 'bubble-header';

    const name = document.createElement('span');
    name.className = 'agent-name';
    name.textContent = msg.agent === 'A' ? (nameAInput.value || 'AGENT A') : (nameBInput.value || 'AGENT B');

    const badge = document.createElement('span');
    badge.className = `persona-badge ${msg.persona}`;
    badge.textContent = PERSONA_LABELS[msg.persona] || msg.persona;

    header.appendChild(name);
    header.appendChild(badge);

    const content = document.createElement('div');
    content.className = 'bubble-content';
    content.textContent = msg.content;

    const time = document.createElement('div');
    time.className = 'bubble-time';
    const d = new Date(msg.timestamp);
    time.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

    bubble.appendChild(header);
    bubble.appendChild(content);
    bubble.appendChild(time);
    wrapper.appendChild(spriteDiv);
    wrapper.appendChild(bubble);

    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;

    if (!skipPersist) {
      chatEntries.push({ type: 'message', data: { agent: msg.agent, persona: msg.persona, content: msg.content, timestamp: msg.timestamp } });
      persistState();
    }
  }

  function showThinking(agent) {
    const existing = document.querySelector('.thinking-indicator');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.className = `thinking-indicator agent-${agent.toLowerCase()}`;

    const spriteDiv = document.createElement('div');
    spriteDiv.className = 'character-sprite';
    const charKey = agent === 'A' ? selectedCharA : selectedCharB;
    const isRight = agent === 'B';
    spriteDiv.appendChild(createCharacterCanvas(charKey, isRight, agent));

    const dots = document.createElement('div');
    dots.className = 'thinking-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    wrapper.appendChild(spriteDiv);
    wrapper.appendChild(dots);
    chatArea.appendChild(wrapper);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  function updateState(status, skipBanner) {
    currentStatus = status;
    statusDot.className = `status-dot ${status}`;

    const statusMap = { idle: 'ready', running: 'battle', paused: 'paused', stopped: 'stopped' };
    statusText.textContent = t(statusMap[status] || 'ready');

    // Clear model info when debate stops
    if (status === 'idle' || status === 'stopped') {
      connInfo.textContent = '';
    }

    // Show stopped banner in chat (skip if consensus or concession banner already shown, or if replaying)
    if (status === 'stopped' && !skipBanner) {
      const lastBanner = chatArea.querySelector('.chat-message:last-child');
      const hasFinalBanner = lastBanner && (lastBanner.classList.contains('consensus-banner') || lastBanner.classList.contains('stopped-banner'));
      if (!hasFinalBanner) {
        const stoppedDiv = document.createElement('div');
        stoppedDiv.className = 'chat-message stopped-banner';
        stoppedDiv.innerHTML = `<div class="stopped-text">${t('debateStopped')}</div>`;
        chatArea.appendChild(stoppedDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        chatEntries.push({ type: 'stopped' });
      }
    }

    persistState();

    // Hide consensus gauge when idle
    if (status === 'idle' && consensusGaugeEl) {
      consensusGaugeEl.style.display = 'none';
    }

    startBtn.disabled = status === 'running';
    if (status !== 'running') { updateStartBtnState(); }
    pauseBtn.disabled = status !== 'running' && status !== 'paused';
    stopBtn.disabled = status === 'idle' || status === 'stopped';
    nameAInput.disabled = status === 'running';
    nameBInput.disabled = status === 'running';
    topicInput.disabled = status === 'running';
    personaASelect.disabled = status === 'running';
    personaBSelect.disabled = status === 'running';
    providerASelect.disabled = status === 'running';
    providerBSelect.disabled = status === 'running';
    modelASelect.disabled = status === 'running';
    modelBSelect.disabled = status === 'running';
    if (charASelect) charASelect.disabled = status === 'running';
    if (charBSelect) charBSelect.disabled = status === 'running';
    modeBtn.disabled = status === 'running';
    seekConsensusCheck.disabled = status === 'running';
    showSummaryCheck.disabled = status === 'running';
    allowConcessionCheck.disabled = status === 'running';

    if (status === 'paused') {
      pauseBtn.textContent = '▶';
      pauseBtn.title = t('resume');
      pauseBtn.setAttribute('data-i18n-title', 'resume');
      pauseBtn.className = 'ctrl-btn ctrl-pause ctrl-resume';
    } else {
      pauseBtn.textContent = '⏸';
      pauseBtn.title = t('pause');
      pauseBtn.setAttribute('data-i18n-title', 'pause');
      pauseBtn.className = 'ctrl-btn ctrl-pause';
    }
  }

  // ===== Settings Persistence =====
  function saveSettings() {
    vscode.postMessage({
      type: 'saveSettings',
      settings: {
        nameA: nameAInput.value,
        nameB: nameBInput.value,
        personaA: personaASelect.value,
        personaB: personaBSelect.value,
        charA: charASelect.value,
        charB: charBSelect.value,
        providerA: providerASelect.value,
        providerB: providerBSelect.value,
        modelA: modelASelect.value,
        modelB: modelBSelect.value,
        topic: topicInput.value,
        mode: currentMode,
        seekConsensus: seekConsensusCheck.checked ? 'true' : 'false',
        showSummary: showSummaryCheck.checked ? 'true' : 'false',
        allowConcession: allowConcessionCheck.checked ? 'true' : 'false',
      },
    });
  }

  function loadSettings(s) {
    if (s.nameA) nameAInput.value = s.nameA;
    if (s.nameB) nameBInput.value = s.nameB;
    if (s.personaA) personaASelect.value = s.personaA;
    if (s.personaB) personaBSelect.value = s.personaB;
    if (s.charA) { charASelect.value = s.charA; selectedCharA = s.charA; }
    if (s.charB) { charBSelect.value = s.charB; selectedCharB = s.charB; }
    if (s.providerA) { providerASelect.value = s.providerA; updateModelOptions(providerASelect, modelASelect); }
    if (s.providerB) { providerBSelect.value = s.providerB; updateModelOptions(providerBSelect, modelBSelect); }
    if (s.modelA) modelASelect.value = s.modelA;
    if (s.modelB) modelBSelect.value = s.modelB;
    if (s.topic) topicInput.value = s.topic;
    if (s.mode) {
      currentMode = s.mode;
      if (currentMode === 'code') {
        modeBtn.textContent = '</>';
        modeBtn.classList.add('code-active');
        modeBtn.title = t('modeCode');
        topicInput.placeholder = t('topicPlaceholderCode');
      }
    }
    if (s.seekConsensus) seekConsensusCheck.checked = s.seekConsensus === 'true';
    if (s.showSummary !== undefined) showSummaryCheck.checked = s.showSummary !== 'false';
    if (s.allowConcession !== undefined) allowConcessionCheck.checked = s.allowConcession !== 'false';
  }

  // ===== Event Handlers =====
  startBtn.addEventListener('click', () => {
    if (!isConnected) {
      connInfo.textContent = t('notConnected');
      return;
    }
    // Validate selected providers are available
    const selA = providerASelect.value;
    const selB = providerBSelect.value;
    if (selA === 'claude' && !claudeAvailable) {
      connInfo.textContent = 'Claude CLI ' + t('disconnected');
      return;
    }
    if (selA === 'gemini' && !geminiAvailable) {
      connInfo.textContent = 'Gemini CLI ' + t('disconnected');
      return;
    }
    if (selB === 'claude' && !claudeAvailable) {
      connInfo.textContent = 'Claude CLI ' + t('disconnected');
      return;
    }
    if (selB === 'gemini' && !geminiAvailable) {
      connInfo.textContent = 'Gemini CLI ' + t('disconnected');
      return;
    }

    const topic = topicInput.value.trim();
    if (!topic) {
      topicInput.focus();
      topicInput.style.borderColor = '#ef5350';
      setTimeout(() => { topicInput.style.borderColor = ''; }, 1500);
      return;
    }

    chatArea.innerHTML = '';
    chatEntries = [];
    lastConsensusGauge = null;

    // Show/hide consensus gauge
    if (consensusGaugeEl) {
      if (seekConsensusCheck.checked) {
        consensusGaugeEl.style.display = 'inline-flex';
        consensusGaugeFill.style.width = '0%';
        consensusGaugeValue.textContent = '0%';
        consensusGaugeFill.style.background = 'var(--accent-red)';
      } else {
        consensusGaugeEl.style.display = 'none';
      }
    }

    saveSettings();

    // Show agent model info in bottom status bar
    const modelLabelA = modelASelect.options[modelASelect.selectedIndex].textContent;
    const modelLabelB = modelBSelect.options[modelBSelect.selectedIndex].textContent;
    const nameA = nameAInput.value || 'Agent A';
    const nameB = nameBInput.value || 'Agent B';
    connInfo.textContent = `${nameA}: ${modelLabelA}  vs  ${nameB}: ${modelLabelB}`;

    vscode.postMessage({
      type: 'startDebate',
      topic: topic,
      personaA: personaASelect.value,
      personaB: personaBSelect.value,
      providerA: providerASelect.value,
      providerB: providerBSelect.value,
      modelA: modelASelect.value,
      modelB: modelBSelect.value,
      nameA: nameA,
      nameB: nameB,
      seekConsensus: seekConsensusCheck.checked,
      showSummary: showSummaryCheck.checked,
      allowConcession: allowConcessionCheck.checked,
      mode: currentMode,
    });
  });

  connRefresh.addEventListener('click', () => {
    claudeCheckDone = false;
    geminiCheckDone = false;
    updateStartBtnState();
    setProviderStatus('claude', 'checking');
    setProviderStatus('gemini', 'checking');
    connInfo.textContent = '';
    vscode.postMessage({ type: 'checkConnection' });
  });

  pauseBtn.addEventListener('click', () => {
    if (currentStatus === 'paused') {
      vscode.postMessage({ type: 'resumeDebate' });
    } else {
      vscode.postMessage({ type: 'pauseDebate' });
    }
  });

  stopBtn.addEventListener('click', () => {
    vscode.postMessage({ type: 'stopDebate' });
  });

  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !startBtn.disabled) {
      startBtn.click();
    }
  });

  modeBtn.addEventListener('click', () => {
    if (currentMode === 'general') {
      currentMode = 'code';
      modeBtn.textContent = '</>';
      modeBtn.classList.add('code-active');
      modeBtn.title = t('modeCode');
      topicInput.placeholder = t('topicPlaceholderCode');
    } else {
      currentMode = 'general';
      modeBtn.textContent = 'GEN';
      modeBtn.classList.remove('code-active');
      modeBtn.title = t('modeGeneral');
      topicInput.placeholder = t('topicPlaceholder');
    }
    saveSettings();
  });

  // Character select handlers
  if (charASelect) {
    charASelect.addEventListener('change', () => { selectedCharA = charASelect.value; });
  }
  if (charBSelect) {
    charBSelect.addEventListener('change', () => { selectedCharB = charBSelect.value; });
  }

  // ===== Message Handler =====
  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'newMessage':
        addMessage(msg.payload);
        break;
      case 'thinking':
        showThinking(msg.payload);
        break;
      case 'stateChange':
        updateState(msg.payload);
        break;
      case 'connectionStatus': {
        const conn = msg.payload;
        if (conn.status === 'checking') {
          claudeCheckDone = false;
          geminiCheckDone = false;
          setProviderStatus('claude', 'checking');
          setProviderStatus('gemini', 'checking');
          setAccountInfo(connAccountClaude, '');
          setAccountInfo(connAccountGemini, '');
          isConnected = false;
          connInfo.textContent = '';
          updateStartBtnState();
        } else if (conn.status === 'providerReady') {
          // Individual provider check completed — unlock start button as soon as selected providers are ready
          if (conn.provider === 'claude') {
            claudeCheckDone = true;
            claudeAvailable = !!conn.available;
            setProviderStatus('claude', claudeAvailable ? 'connected' : 'disconnected');
            if (claudeAvailable) {
              const parts = [];
              if (conn.email) parts.push(conn.email);
              if (conn.subscription) parts.push(conn.subscription.toUpperCase());
              setAccountInfo(connAccountClaude, parts.length ? parts.join(' · ') : '');
            } else {
              setAccountInfo(connAccountClaude, '');
              if (conn.error) connInfo.textContent = conn.error;
            }
          } else if (conn.provider === 'gemini') {
            geminiCheckDone = true;
            geminiAvailable = !!conn.available;
            const geminiStatus = geminiAvailable ? 'connected' : (conn.installed ? 'warning' : 'disconnected');
            setProviderStatus('gemini', geminiStatus);
            setAccountInfo(connAccountGemini, geminiAvailable && conn.email ? conn.email : '');
            if (!geminiAvailable && conn.error) {
              const prev = connInfo.textContent;
              connInfo.textContent = prev ? prev + ' | ' + conn.error : conn.error;
            }
          }
          isConnected = claudeAvailable || geminiAvailable;
          updateStartBtnState();
        } else if (conn.status === 'connected') {
          // Final combined status — update everything to final state
          claudeCheckDone = true;
          geminiCheckDone = true;
          claudeAvailable = !!conn.claudeAvailable;
          geminiAvailable = !!conn.geminiAvailable;
          isConnected = claudeAvailable || geminiAvailable;
          setProviderStatus('claude', claudeAvailable ? 'connected' : 'disconnected');
          const geminiStatus = geminiAvailable ? 'connected' : (conn.geminiInstalled ? 'warning' : 'disconnected');
          setProviderStatus('gemini', geminiStatus);
          if (claudeAvailable) {
            const parts = [];
            if (conn.claudeEmail) parts.push(conn.claudeEmail);
            if (conn.claudeSubscription) parts.push(conn.claudeSubscription.toUpperCase());
            setAccountInfo(connAccountClaude, parts.length ? parts.join(' · ') : '');
          } else {
            setAccountInfo(connAccountClaude, '');
          }
          setAccountInfo(connAccountGemini, geminiAvailable && conn.geminiEmail ? conn.geminiEmail : '');
          const errors = [];
          if (!claudeAvailable && conn.claudeError) errors.push(conn.claudeError);
          if (!geminiAvailable && conn.geminiError) errors.push(conn.geminiError);
          connInfo.textContent = errors.join(' | ');
          updateProviderOptions();
          updateStartBtnState();
        } else {
          // disconnected
          claudeCheckDone = true;
          geminiCheckDone = true;
          setProviderStatus('claude', 'disconnected');
          setProviderStatus('gemini', 'disconnected');
          isConnected = false;
          claudeAvailable = false;
          geminiAvailable = false;
          setAccountInfo(connAccountClaude, '');
          setAccountInfo(connAccountGemini, '');
          const errors = [];
          if (conn.claudeError) errors.push(conn.claudeError);
          if (conn.geminiError) errors.push(conn.geminiError);
          connInfo.textContent = errors.join(' | ') || '';
          updateProviderOptions();
          updateStartBtnState();
        }
        break;
      }
      case 'loadSettings':
        loadSettings(msg.payload);
        break;
      case 'consensusGauge': {
        const gauge = msg.payload;
        lastConsensusGauge = gauge;
        restoreConsensusGauge(gauge);
        persistState();
        break;
      }
      case 'consensus': {
        const consensusDiv = document.createElement('div');
        consensusDiv.className = 'chat-message consensus-banner';
        consensusDiv.innerHTML = `<div class="consensus-text">${t('consensusReached')}</div>`;
        chatArea.appendChild(consensusDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        // Max out the gauge
        if (consensusGaugeEl) {
          consensusGaugeFill.style.width = '100%';
          consensusGaugeValue.textContent = '100%';
          consensusGaugeFill.style.background = 'var(--accent-green)';
        }
        lastConsensusGauge = { scoreA: 100, scoreB: 100, average: 100 };
        chatEntries.push({ type: 'consensus' });
        persistState();
        break;
      }
      case 'concession': {
        const { conceder, winner } = msg.payload;
        const concessionDiv = document.createElement('div');
        concessionDiv.className = 'chat-message consensus-banner';
        const concessionText = t('concessionMessage').replace('{conceder}', escapeHtml(conceder)).replace('{winner}', escapeHtml(winner));
        concessionDiv.innerHTML = `<div class="consensus-text">${concessionText}</div>`;
        chatArea.appendChild(concessionDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        chatEntries.push({ type: 'concession', data: { conceder, winner } });
        persistState();
        break;
      }
      case 'summaryLoading': {
        // Remove existing loading indicator if any
        const existing = document.querySelector('.summary-loading');
        if (existing) existing.remove();
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-message summary-loading';
        loadingDiv.innerHTML = `<div class="summary-loading-text">${t('summaryLoading')}</div>`;
        chatArea.appendChild(loadingDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        // Replace any existing summaryLoading entry
        chatEntries = chatEntries.filter(e => e.type !== 'summaryLoading');
        chatEntries.push({ type: 'summaryLoading' });
        persistState();
        break;
      }
      case 'summary': {
        // Remove loading indicator
        const loadingEl = document.querySelector('.summary-loading');
        if (loadingEl) loadingEl.remove();
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'chat-message summary-banner';
        summaryDiv.innerHTML = `<div class="summary-header">${t('moderatorSummary')}</div><div class="summary-content">${escapeHtml(msg.payload)}</div>`;
        chatArea.appendChild(summaryDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        chatEntries = chatEntries.filter(e => e.type !== 'summaryLoading');
        chatEntries.push({ type: 'summary', data: msg.payload });
        persistState();
        break;
      }
      case 'error': {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message agent-a';
        errorDiv.style.alignSelf = 'center';
        errorDiv.style.maxWidth = '100%';
        const errorBubble = document.createElement('div');
        errorBubble.className = 'speech-bubble';
        errorBubble.style.background = '#4a1a1a';
        errorBubble.style.outlineColor = '#ef5350';
        const errorContent = document.createElement('div');
        errorContent.className = 'bubble-content';
        errorContent.style.color = '#ef5350';
        errorContent.textContent = '\u26A0 ' + msg.payload;
        errorBubble.appendChild(errorContent);
        errorDiv.appendChild(errorBubble);
        chatArea.appendChild(errorDiv);
        chatArea.scrollTop = chatArea.scrollHeight;
        chatEntries.push({ type: 'error', data: msg.payload });
        persistState();
        break;
      }
      case 'restoreState': {
        const restore = msg.payload;

        // Always clear stale UI (welcome screen, old thinking indicators) when restoring
        const welcomeEl = chatArea.querySelector('.welcome');
        if (welcomeEl) welcomeEl.remove();
        const thinkingEl = chatArea.querySelector('.thinking-indicator');
        if (thinkingEl) thinkingEl.remove();

        if (restore.messages && restore.messages.length > 0) {
          const backendMessages = restore.messages.map(m => ({ type: 'message', data: { agent: m.agent, persona: m.persona, content: m.content, timestamp: m.timestamp } }));
          const nonMessageEntries = chatEntries.filter(e => e.type !== 'message');
          chatEntries = [...backendMessages, ...nonMessageEntries];
          replayChatEntries(chatEntries);
        }
        if (restore.consensusGauge) {
          restoreConsensusGauge(restore.consensusGauge);
        }
        if (restore.status) {
          updateState(restore.status, true);
        }
        // If debate is running, show thinking indicator after all messages
        if (restore.status === 'running' && restore.currentTurn) {
          showThinking(restore.currentTurn);
        }
        break;
      }
    }
  });

  // ===== Welcome Screen =====
  function showWelcome() {
    const welcome = document.createElement('div');
    welcome.className = 'welcome';

    const logoDiv = document.createElement('div');
    logoDiv.className = 'logo';
    logoDiv.appendChild(createLogoCanvas());

    const title = document.createElement('h2');
    title.textContent = t('welcomeTitle');

    const desc = document.createElement('p');
    desc.textContent = t('welcomeDesc');

    const hint = document.createElement('p');
    hint.style.fontSize = '10px';
    hint.style.color = '#666';
    hint.textContent = t('welcomeHint');

    welcome.appendChild(logoDiv);
    welcome.appendChild(title);
    welcome.appendChild(desc);
    welcome.appendChild(hint);
    chatArea.appendChild(welcome);
  }

  // ===== Init =====
  applyI18n();

  // Restore from saved webview state (survives window detach/reattach)
  const previousState = vscode.getState();
  if (previousState && previousState.chatEntries && previousState.chatEntries.length > 0) {
    chatEntries = previousState.chatEntries;
    currentMode = previousState.currentMode || 'general';
    if (currentMode === 'code') {
      modeBtn.textContent = '</>';
      modeBtn.classList.add('code-active');
      modeBtn.title = t('modeCode');
      topicInput.placeholder = t('topicPlaceholderCode');
    }
    replayChatEntries(chatEntries);
    updateState(previousState.currentStatus || 'idle', true);
    if (previousState.consensusGauge) {
      restoreConsensusGauge(previousState.consensusGauge);
    }
  } else {
    showWelcome();
    updateState('idle');
  }
  // Always ask extension host for latest state — handles both:
  // 1. getState() returned cached entries → sync with backend for any missed messages
  // 2. getState() returned null (window move) → backend has the authoritative state
  vscode.postMessage({ type: 'requestState' });
})();
