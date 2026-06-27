import { formatPreviewScript, mapConversationForPreview, updatePreviewMessagesFromScript } from "./lib/studio-data.js";

const els = {
  language: document.querySelector("#languageSelect"),
  topic: document.querySelector("#topicInput"),
  scene: document.querySelector("#sceneSelect"),
  style: document.querySelector("#styleSelect"),
  rounds: document.querySelector("#roundInput"),
  roundValue: document.querySelector("#roundValue"),
  generate: document.querySelector("#generateBtn"),
  copy: document.querySelector("#copyBtn"),
  download: document.querySelector("#downloadBtn"),
  script: document.querySelector("#scriptList"),
  count: document.querySelector("#messageCount"),
  stream: document.querySelector("#chatStream"),
  frame: document.querySelector("#deviceFrame"),
  title: document.querySelector("#chatTitle"),
  subtitle: document.querySelector("#chatSubtitle"),
  headerAvatar: document.querySelector("#headerAvatar"),
  clock: document.querySelector("#clockText"),
  status: document.querySelector("#statusPill"),
  profileAvatar: document.querySelector("#profileAvatar"),
  notice: document.querySelector("#apiNotice")
};

const SCENES = ["daily", "group", "work", "support"];
const TONES = ["natural", "casual", "professional", "dramatic"];
const STYLES = ["igLight", "wechat"];
const WECHAT_MESSAGE_AVATARS = {
  them: "/assets/wechat-message/avatar-them.png",
  me: "/assets/wechat-message/avatar-me.png"
};
const STAGES = [
  "opening",
  "accept",
  "question",
  "detail",
  "pushback",
  "pivot",
  "sideNote",
  "consequence",
  "plan",
  "confirm",
  "close"
];

const LOCALIZED_CONTENT = {
  en: {
    htmlLang: "en",
    title: "conversation.ai Studio",
    units: { messages: "messages", me: "Me", online: "Active now", seen: "Seen", today: "Today", ready: "Ready", generated: "Generated", copied: "Copied", exported: "Exported" },
    ui: {
      settingsAria: "Conversation generator settings",
      previewAria: "DM preview",
      toneAria: "Tone",
      backAria: "Back",
      cameraAria: "Camera",
      voiceAria: "Voice message",
      galleryAria: "Gallery",
      appTitle: "Conversation Studio",
      languageLabel: "Language",
      sceneLabel: "Conversation",
      topicLabel: "Topic",
      roundLabel: "Length",
      styleLabel: "DM style",
      toneLabel: "Tone",
      generateButton: "Generate",
      copyButton: "Copy script",
      downloadButton: "Export PNG",
      scriptTitle: "Script",
      composerPlaceholder: "Message..."
    },
    scenes: { daily: "1:1 chat", group: "Small group", work: "Creator work", support: "Brand support" },
    tones: { natural: "Natural", casual: "Casual", professional: "Polished", dramatic: "Dramatic" },
    styles: { igLight: "IG Light", igDark: "IG Dark", creator: "Creator", wechat: "WeChat" },
    samples: [
      "A friend wants to reschedule weekend brunch",
      "Two creators planning a last-minute collab",
      "A brand answering a delayed refund request",
      "Roommates deciding whether to adopt a plant"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Support"]
    },
    domains: {
      work: { keywords: ["work", "launch", "project", "client", "campaign", "creator", "brand", "meeting", "deadline"], focus: "timing and wording", risk: "the context gets out of sync", action: "today's next step" },
      travel: { keywords: ["travel", "brunch", "weekend", "trip", "flight", "hotel", "weather", "plan", "dinner"], focus: "time and location", risk: "plans change last minute", action: "backup plan" },
      support: { keywords: ["support", "order", "refund", "shipping", "return", "invoice", "complaint", "delivery"], focus: "order status", risk: "the wait gets longer", action: "case details" },
      relationship: { keywords: ["friend", "date", "birthday", "roommate", "apology", "family", "misunderstanding"], focus: "how everyone feels", risk: "the message lands wrong", action: "next message" },
      study: { keywords: ["study", "exam", "class", "assignment", "interview", "paper"], focus: "pace and priorities", risk: "everything gets pushed too late", action: "short checklist" },
      general: { keywords: [], focus: "the key detail", risk: "the conversation gets vague", action: "next step" }
    },
    templates: {
      social: {
        opening: {
          natural: "Do you remember “{topic}”? I kept thinking about it.",
          casual: "Okay, I’m still thinking about “{topic}”.",
          professional: "About “{topic}”, I want to confirm one thing first.",
          dramatic: "The more I think about “{topic}”, the less simple it feels."
        },
        accept: {
          natural: "Yeah. I’d start with {focus} before deciding.",
          casual: "Yeah, first check {focus}. No need to overreact yet.",
          professional: "Agreed. We should clarify {focus} before making a call.",
          dramatic: "Exactly. The real issue might be that {risk}."
        },
        question: {
          natural: "Should we keep a backup in case {risk}?",
          casual: "Should we make a plan B? Just in case {risk}.",
          professional: "Do we need an alternate plan to avoid a situation where {risk}?",
          dramatic: "If {risk}, the whole plan could shift."
        },
        detail: {
          natural: "I can list {action} and you tell me what feels off.",
          casual: "I’ll make a quick list for {action}. Nothing too heavy.",
          professional: "I’ll draft {action} and send it over for review.",
          dramatic: "Fine, but {action} has to be clear before this gets messy."
        },
        pushback: {
          natural: "Just don’t make it sound too formal. It should still feel like a DM.",
          casual: "Please don’t turn it into a tiny press release.",
          professional: "The tone can stay warm, but the details need to be complete.",
          dramatic: "If it’s too flat, nobody will feel the turn in the story."
        },
        pivot: {
          natural: "Got it. Say the human part first, then add the detail.",
          casual: "Totally. Make it sound real first, then add the point.",
          professional: "Understood. Lead with the conclusion, then explain the context.",
          dramatic: "Good. Let the feeling show first, then pull it back."
        },
        sideNote: {
          natural: "Also, put {focus} near the top so they don’t have to guess.",
          casual: "And don’t bury {focus}. People skim DMs.",
          professional: "I’d put {focus} first to reduce back-and-forth.",
          dramatic: "{focus} has to appear early, or the tension disappears."
        },
        consequence: {
          natural: "That way it feels easy to answer.",
          casual: "Then replying feels simple, not like homework.",
          professional: "That should make the response path clearer.",
          dramatic: "Then it feels like someone is actually waiting for an answer."
        },
        plan: {
          natural: "Let’s do that. I’ll send a version in a bit.",
          casual: "Cool, I’ll write one and you can roast it.",
          professional: "I’ll prepare a version in that direction.",
          dramatic: "Okay, then let’s send the line that matters first."
        },
        confirm: {
          natural: "Sounds good. Leave a little room to adjust.",
          casual: "Perfect. Keep it light and it’ll feel real.",
          professional: "Works for me. Keep room for updates.",
          dramatic: "Good. Just let the ending breathe."
        },
        close: {
          natural: "Done. I’ll send it over soon.",
          casual: "Deal. I’ll ping you when it’s ready.",
          professional: "Great. I’ll share it once it’s cleaned up.",
          dramatic: "Fine. I’ll send it and we’ll see where it lands."
        }
      },
      support: {
        opening: {
          natural: "Hi, I need help with “{topic}”.",
          casual: "Hey, can you help me with “{topic}”?",
          professional: "Hello, I’d like to confirm the status of “{topic}”.",
          dramatic: "Hi, “{topic}” is starting to affect my plans."
        },
        accept: {
          natural: "Of course. Is the main issue {focus}?",
          casual: "Sure, I can check that. Is it about {focus}?",
          professional: "I can help with that. Is your main concern {focus}?",
          dramatic: "I’ll look into it and make sure {risk} doesn’t continue."
        },
        question: {
          natural: "Yes, and I’m worried that {risk}.",
          casual: "Yes. I mostly want to know if {risk}.",
          professional: "Yes. I’d also like to know whether {risk}.",
          dramatic: "Yes, because if {risk}, I need a clear answer."
        },
        detail: {
          natural: "Thanks. Please send {action}, and I’ll check right away.",
          casual: "Got it. Send me {action} and I’ll look.",
          professional: "Please provide {action}, and I’ll review the case.",
          dramatic: "Please send {action}. I’ll use that to locate the issue."
        },
        pushback: {
          natural: "I can share that, but I’d really like a clear time estimate.",
          casual: "I can send it, but can you give me a rough ETA?",
          professional: "I can provide that. Please also confirm the expected timeline.",
          dramatic: "I can send it, but I need a real timeline this time."
        },
        pivot: {
          natural: "Understood. I’ll add a priority note and reply today.",
          casual: "Totally. I’ll mark it priority and get back today.",
          professional: "Understood. I’ll prioritize the case and respond today.",
          dramatic: "Understood. I’ll mark this urgent and get you a clear update today."
        },
        sideNote: {
          natural: "If I need anything else, I’ll ask in this thread.",
          casual: "If anything else is missing, I’ll ask right here.",
          professional: "If more information is required, I’ll follow up in this chat.",
          dramatic: "If anything is missing, I’ll say it here so you don’t have to chase it."
        },
        consequence: {
          natural: "Okay, I’ll wait for the update.",
          casual: "Okay, I’ll wait here.",
          professional: "Understood. I’ll wait for the update.",
          dramatic: "Okay. I hope this finally gets resolved."
        },
        plan: {
          natural: "Thanks for your patience. I’ll share each update here.",
          casual: "Thanks. I’ll update you as soon as I know more.",
          professional: "Thank you. I’ll keep this thread updated.",
          dramatic: "Thank you. I’ll keep the next steps clear."
        },
        confirm: {
          natural: "Sounds good, thanks.",
          casual: "Cool, thanks for helping.",
          professional: "Thank you, I appreciate it.",
          dramatic: "Okay. I’ll wait for your reply."
        },
        close: {
          natural: "You’re welcome. I’ll message you as soon as there’s progress.",
          casual: "No problem. I’ll ping you when I have news.",
          professional: "You’re welcome. I’ll notify you when there is progress.",
          dramatic: "You’re welcome. I’ll stay with this until it has an answer."
        }
      }
    }
  },
  es: {
    htmlLang: "es",
    title: "conversation.ai Studio",
    units: { messages: "mensajes", me: "Yo", online: "Activo ahora", seen: "Visto", today: "Hoy", ready: "Listo", generated: "Generado", copied: "Copiado", exported: "Exportado" },
    ui: {
      settingsAria: "Ajustes del generador de conversaciones",
      previewAria: "Vista previa de DM",
      toneAria: "Tono",
      backAria: "Volver",
      cameraAria: "Cámara",
      voiceAria: "Mensaje de voz",
      galleryAria: "Galería",
      appTitle: "Estudio de conversaciones",
      languageLabel: "Idioma",
      sceneLabel: "Conversación",
      topicLabel: "Tema",
      roundLabel: "Longitud",
      styleLabel: "Estilo DM",
      toneLabel: "Tono",
      generateButton: "Generar",
      copyButton: "Copiar guion",
      downloadButton: "Exportar PNG",
      scriptTitle: "Guion",
      composerPlaceholder: "Mensaje..."
    },
    scenes: { daily: "Chat 1:1", group: "Grupo pequeño", work: "Trabajo creator", support: "Soporte marca" },
    tones: { natural: "Natural", casual: "Casual", professional: "Pulido", dramatic: "Dramático" },
    styles: { igLight: "IG claro", igDark: "IG oscuro", creator: "Creator", wechat: "WeChat" },
    samples: [
      "Un amigo quiere cambiar el brunch del fin de semana",
      "Dos creadores planean una colaboración de último minuto",
      "Una marca responde por un reembolso demorado",
      "Compañeros de piso deciden si comprar una planta"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Soporte"]
    },
    domains: {
      work: { keywords: ["trabajo", "lanzamiento", "proyecto", "cliente", "campaña", "marca", "reunión", "fecha"], focus: "el timing y el mensaje", risk: "el contexto se desordene", action: "el siguiente paso de hoy" },
      travel: { keywords: ["viaje", "brunch", "fin de semana", "vuelo", "hotel", "clima", "cena"], focus: "la hora y el lugar", risk: "el plan cambie a último minuto", action: "el plan alternativo" },
      support: { keywords: ["soporte", "pedido", "reembolso", "envío", "devolución", "factura", "queja"], focus: "el estado del pedido", risk: "la espera se alargue", action: "los datos del caso" },
      relationship: { keywords: ["amigo", "cita", "cumpleaños", "disculpa", "familia", "malentendido"], focus: "cómo se siente cada persona", risk: "el mensaje caiga mal", action: "el próximo mensaje" },
      study: { keywords: ["estudiar", "examen", "clase", "tarea", "entrevista", "ensayo"], focus: "el ritmo y las prioridades", risk: "todo quede para tarde", action: "una lista corta" },
      general: { keywords: [], focus: "el detalle clave", risk: "la conversación se vuelva vaga", action: "el próximo paso" }
    },
    templates: {}
  },
  fr: {
    htmlLang: "fr",
    title: "conversation.ai Studio",
    units: { messages: "messages", me: "Moi", online: "Actif maintenant", seen: "Vu", today: "Aujourd'hui", ready: "Prêt", generated: "Généré", copied: "Copié", exported: "Exporté" },
    ui: {
      settingsAria: "Paramètres du générateur de conversation",
      previewAria: "Aperçu DM",
      toneAria: "Ton",
      backAria: "Retour",
      cameraAria: "Caméra",
      voiceAria: "Message vocal",
      galleryAria: "Galerie",
      appTitle: "Studio de conversation",
      languageLabel: "Langue",
      sceneLabel: "Conversation",
      topicLabel: "Sujet",
      roundLabel: "Longueur",
      styleLabel: "Style DM",
      toneLabel: "Ton",
      generateButton: "Générer",
      copyButton: "Copier le script",
      downloadButton: "Exporter PNG",
      scriptTitle: "Script",
      composerPlaceholder: "Message..."
    },
    scenes: { daily: "Chat 1:1", group: "Petit groupe", work: "Travail creator", support: "Support marque" },
    tones: { natural: "Naturel", casual: "Détendu", professional: "Soigné", dramatic: "Dramatique" },
    styles: { igLight: "IG clair", igDark: "IG sombre", creator: "Creator", wechat: "WeChat" },
    samples: [
      "Un ami veut décaler le brunch du week-end",
      "Deux créateurs préparent une collab de dernière minute",
      "Une marque répond à une demande de remboursement en retard",
      "Des colocs décident s'ils achètent une plante"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Support"]
    },
    domains: {
      work: { keywords: ["travail", "lancement", "projet", "client", "campagne", "marque", "réunion", "deadline"], focus: "le timing et la formulation", risk: "le contexte se désynchronise", action: "la prochaine étape du jour" },
      travel: { keywords: ["voyage", "brunch", "week-end", "vol", "hôtel", "météo", "dîner"], focus: "l'heure et le lieu", risk: "le plan change à la dernière minute", action: "le plan B" },
      support: { keywords: ["support", "commande", "remboursement", "livraison", "retour", "facture", "plainte"], focus: "le statut de la commande", risk: "l'attente se prolonge", action: "les détails du dossier" },
      relationship: { keywords: ["ami", "date", "anniversaire", "excuse", "famille", "malentendu"], focus: "le ressenti de chacun", risk: "le message soit mal reçu", action: "le prochain message" },
      study: { keywords: ["étude", "examen", "cours", "devoir", "entretien", "mémoire"], focus: "le rythme et les priorités", risk: "tout soit repoussé trop tard", action: "une courte liste" },
      general: { keywords: [], focus: "le détail clé", risk: "la conversation devienne floue", action: "la prochaine étape" }
    },
    templates: {}
  },
  pt: {
    htmlLang: "pt",
    title: "conversation.ai Studio",
    units: { messages: "mensagens", me: "Eu", online: "Ativo agora", seen: "Visto", today: "Hoje", ready: "Pronto", generated: "Gerado", copied: "Copiado", exported: "Exportado" },
    ui: {
      settingsAria: "Configurações do gerador de conversa",
      previewAria: "Prévia de DM",
      toneAria: "Tom",
      backAria: "Voltar",
      cameraAria: "Câmera",
      voiceAria: "Mensagem de voz",
      galleryAria: "Galeria",
      appTitle: "Estúdio de conversas",
      languageLabel: "Idioma",
      sceneLabel: "Conversa",
      topicLabel: "Tema",
      roundLabel: "Tamanho",
      styleLabel: "Estilo DM",
      toneLabel: "Tom",
      generateButton: "Gerar",
      copyButton: "Copiar roteiro",
      downloadButton: "Exportar PNG",
      scriptTitle: "Roteiro",
      composerPlaceholder: "Mensagem..."
    },
    scenes: { daily: "Chat 1:1", group: "Grupo pequeno", work: "Trabalho creator", support: "Suporte marca" },
    tones: { natural: "Natural", casual: "Casual", professional: "Polido", dramatic: "Dramático" },
    styles: { igLight: "IG claro", igDark: "IG escuro", creator: "Creator", wechat: "WeChat" },
    samples: [
      "Um amigo quer remarcar o brunch do fim de semana",
      "Dois criadores planejam uma collab de última hora",
      "Uma marca responde a um reembolso atrasado",
      "Colegas de casa decidem se compram uma planta"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Suporte"]
    },
    domains: {
      work: { keywords: ["trabalho", "lançamento", "projeto", "cliente", "campanha", "marca", "reunião", "prazo"], focus: "o timing e a mensagem", risk: "o contexto sair de sincronia", action: "o próximo passo de hoje" },
      travel: { keywords: ["viagem", "brunch", "fim de semana", "voo", "hotel", "clima", "jantar"], focus: "o horário e o local", risk: "o plano mudar em cima da hora", action: "o plano alternativo" },
      support: { keywords: ["suporte", "pedido", "reembolso", "entrega", "devolução", "nota", "reclamação"], focus: "o status do pedido", risk: "a espera ficar maior", action: "os dados do caso" },
      relationship: { keywords: ["amigo", "encontro", "aniversário", "desculpa", "família", "mal-entendido"], focus: "como cada pessoa se sente", risk: "a mensagem soar mal", action: "a próxima mensagem" },
      study: { keywords: ["estudo", "prova", "aula", "tarefa", "entrevista", "artigo"], focus: "o ritmo e as prioridades", risk: "tudo ficar para tarde", action: "uma lista curta" },
      general: { keywords: [], focus: "o detalhe principal", risk: "a conversa ficar vaga", action: "o próximo passo" }
    },
    templates: {}
  },
  ja: {
    htmlLang: "ja",
    title: "conversation.ai Studio",
    units: { messages: "件", me: "自分", online: "オンライン中", seen: "既読", today: "今日", ready: "準備完了", generated: "生成済み", copied: "コピー済み", exported: "書き出し済み" },
    ui: {
      settingsAria: "会話生成設定",
      previewAria: "DMプレビュー",
      toneAria: "トーン",
      backAria: "戻る",
      cameraAria: "カメラ",
      voiceAria: "ボイスメッセージ",
      galleryAria: "ギャラリー",
      appTitle: "会話スタジオ",
      languageLabel: "言語",
      sceneLabel: "会話",
      topicLabel: "テーマ",
      roundLabel: "長さ",
      styleLabel: "DMスタイル",
      toneLabel: "トーン",
      generateButton: "生成",
      copyButton: "台本をコピー",
      downloadButton: "PNGを書き出す",
      scriptTitle: "台本",
      composerPlaceholder: "メッセージ..."
    },
    scenes: { daily: "1対1チャット", group: "小グループ", work: "Creator案件", support: "ブランドサポート" },
    tones: { natural: "自然", casual: "カジュアル", professional: "丁寧", dramatic: "ドラマ風" },
    styles: { igLight: "IGライト", igDark: "IGダーク", creator: "Creator", wechat: "WeChat" },
    samples: [
      "友だちが週末のブランチを別日にしたいと言っている",
      "2人のクリエイターが急ぎのコラボを相談している",
      "ブランドが遅れている返金に返信している",
      "ルームメイトが観葉植物を買うか相談している"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Support"]
    },
    domains: {
      work: { keywords: ["仕事", "公開", "プロジェクト", "クライアント", "キャンペーン", "ブランド", "会議", "締切"], focus: "タイミングと言い方", risk: "前提がずれる", action: "今日の次の一手" },
      travel: { keywords: ["旅行", "ブランチ", "週末", "フライト", "ホテル", "天気", "夕食"], focus: "時間と場所", risk: "直前に予定が変わる", action: "代替案" },
      support: { keywords: ["サポート", "注文", "返金", "配送", "返品", "請求書", "クレーム"], focus: "注文状況", risk: "待ち時間が長くなる", action: "ケース情報" },
      relationship: { keywords: ["友だち", "デート", "誕生日", "謝罪", "家族", "誤解"], focus: "お互いの気持ち", risk: "メッセージがきつく聞こえる", action: "次の返信" },
      study: { keywords: ["勉強", "試験", "授業", "課題", "面接", "論文"], focus: "ペースと優先順位", risk: "全部が後回しになる", action: "短いチェックリスト" },
      general: { keywords: [], focus: "大事なポイント", risk: "会話がぼやける", action: "次のステップ" }
    },
    templates: {}
  },
  zh: {
    htmlLang: "zh-CN",
    title: "conversation.ai Studio",
    units: { messages: "条", me: "我", online: "当前在线", seen: "已读", today: "今天", ready: "就绪", generated: "已生成", copied: "已复制", exported: "已导出" },
    ui: {
      settingsAria: "对话生成设置",
      previewAria: "DM 对话预览",
      toneAria: "语气",
      backAria: "返回",
      cameraAria: "相机",
      voiceAria: "语音消息",
      galleryAria: "相册",
      appTitle: "对话工作室",
      languageLabel: "语言",
      sceneLabel: "对话类型",
      topicLabel: "主题",
      roundLabel: "长度",
      styleLabel: "DM 样式",
      toneLabel: "语气",
      generateButton: "生成",
      copyButton: "复制文案",
      downloadButton: "导出 PNG",
      scriptTitle: "对话文本",
      composerPlaceholder: "发消息..."
    },
    scenes: { daily: "双人聊天", group: "小群聊天", work: "创作者协作", support: "品牌客服" },
    tones: { natural: "自然", casual: "轻松", professional: "精致", dramatic: "戏剧" },
    styles: { igLight: "IG 浅色", igDark: "IG 深色", creator: "Creator", wechat: "微信" },
    samples: [
      "朋友想改周末早午餐的时间",
      "两个创作者临时讨论合作",
      "品牌回复一笔延迟退款",
      "室友商量要不要买一盆绿植"
    ],
    names: {
      daily: ["Maya", "Noah", "Lina", "Kai", "Ava", "Leo"],
      group: ["Maya", "Jules", "Nora", "Sam", "Iris", "Theo"],
      work: ["Alex", "Morgan", "Riley", "Jordan", "Casey"],
      support: ["Lena", "Support"]
    },
    domains: {
      work: { keywords: ["工作", "上线", "项目", "客户", "活动", "创作者", "品牌", "会议", "截止"], focus: "时间和措辞", risk: "上下文不同步", action: "今天的下一步" },
      travel: { keywords: ["旅行", "早午餐", "周末", "航班", "酒店", "天气", "晚餐"], focus: "时间和地点", risk: "计划临时变动", action: "备用方案" },
      support: { keywords: ["客服", "订单", "退款", "物流", "退货", "发票", "投诉"], focus: "订单状态", risk: "等待时间变长", action: "案例信息" },
      relationship: { keywords: ["朋友", "约会", "生日", "道歉", "家人", "误会"], focus: "彼此的感受", risk: "消息听起来不舒服", action: "下一条回复" },
      study: { keywords: ["学习", "考试", "课程", "作业", "面试", "论文"], focus: "节奏和优先级", risk: "所有事都拖到太晚", action: "短清单" },
      general: { keywords: [], focus: "关键细节", risk: "对话变得含糊", action: "下一步" }
    },
    templates: {}
  }
};

LOCALIZED_CONTENT.es.templates = makeRomanceTemplates({
  topicWrap: "“{topic}”",
  social: [
    ["¿Te acuerdas de {topic}? Le seguí dando vueltas.", "Vale, sigo pensando en {topic}.", "Sobre {topic}, quiero confirmar algo primero.", "Cuanto más pienso en {topic}, menos simple parece."],
    ["Sí. Yo empezaría por {focus} antes de decidir.", "Sí, primero miremos {focus}. Aún no hay que exagerar.", "De acuerdo. Conviene aclarar {focus} antes de decidir.", "Exacto. El problema real puede ser que {risk}."],
    ["¿Dejamos una alternativa por si {risk}?", "¿Hacemos un plan B? Por si {risk}.", "¿Necesitamos un plan alternativo para evitar que {risk}?", "Si {risk}, todo el plan puede cambiar."],
    ["Puedo listar {action} y me dices qué no encaja.", "Hago una lista rápida de {action}, nada pesado.", "Prepararé {action} y te lo enviaré para revisar.", "Bien, pero {action} tiene que quedar claro antes de que se complique."],
    ["Solo que no suene demasiado formal. Tiene que sentirse como un DM.", "Por favor, no lo conviertas en un comunicado mini.", "El tono puede ser cálido, pero los detalles deben estar completos.", "Si queda demasiado plano, nadie va a sentir el giro."],
    ["Entiendo. Primero lo humano, luego el detalle.", "Total. Que suene real primero y luego metemos el punto.", "Entendido. Primero la conclusión, después el contexto.", "Bien. Que se note la emoción y luego lo bajamos."],
    ["Además, pon {focus} arriba para que no tengan que adivinar.", "Y no entierres {focus}. La gente escanea los DMs.", "Pondría {focus} al inicio para evitar idas y vueltas.", "{focus} tiene que aparecer pronto o se pierde la tensión."],
    ["Así se siente fácil responder.", "Así responder no parece una tarea.", "Eso hará más claro el camino de respuesta.", "Así parece que alguien de verdad espera una respuesta."],
    ["Hagámoslo así. Te mando una versión en un rato.", "Genial, escribo una y tú la destruyes.", "Prepararé una versión en esa dirección.", "Entonces enviemos primero la frase importante."],
    ["Suena bien. Deja un poco de margen.", "Perfecto. Si queda ligero, se sentirá real.", "Me parece bien. Dejemos margen para actualizar.", "Bien. Solo deja respirar el final."],
    ["Listo. Te lo mando pronto.", "Hecho. Te aviso cuando esté.", "Perfecto. Lo comparto cuando esté limpio.", "Bien. Lo mando y vemos dónde cae."]
  ],
  support: [
    ["Hola, necesito ayuda con {topic}.", "Hey, ¿me ayudas con {topic}?", "Hola, quisiera confirmar el estado de {topic}.", "Hola, {topic} ya está afectando mis planes."],
    ["Claro. ¿El problema principal es {focus}?", "Sí, lo reviso. ¿Es por {focus}?", "Puedo ayudar. ¿Tu preocupación principal es {focus}?", "Lo reviso para que no siga pasando que {risk}."],
    ["Sí, y me preocupa que {risk}.", "Sí. Sobre todo quiero saber si {risk}.", "Sí. También quisiera saber si {risk}.", "Sí, porque si {risk}, necesito una respuesta clara."],
    ["Gracias. Envíame {action} y lo reviso ahora.", "Entendido. Mándame {action} y lo miro.", "Por favor comparte {action} y revisaré el caso.", "Envíame {action}. Con eso ubico el problema."],
    ["Puedo enviarlo, pero necesito un tiempo estimado claro.", "Lo mando, pero ¿me das una ETA aproximada?", "Puedo compartirlo. Confirma también el plazo esperado.", "Lo envío, pero esta vez necesito un plazo real."],
    ["Entendido. Lo marco como prioridad y respondo hoy.", "Total. Lo marco prioritario y vuelvo hoy.", "Entendido. Priorizaré el caso y responderé hoy.", "Lo marco urgente y hoy te doy una actualización clara."],
    ["Si necesito algo más, lo pediré en este hilo.", "Si falta algo, te lo pregunto aquí mismo.", "Si se requiere más información, seguiré por este chat.", "Si falta algo, lo diré aquí para que no tengas que perseguirlo."],
    ["Ok, espero la actualización.", "Ok, espero aquí.", "Entendido. Quedo atento a la actualización.", "Ok. Espero que esta vez se resuelva."],
    ["Gracias por la paciencia. Compartiré cada avance aquí.", "Gracias. Te aviso apenas sepa más.", "Gracias. Mantendré este hilo actualizado.", "Gracias. Dejaré claros los próximos pasos."],
    ["Perfecto, gracias.", "Genial, gracias por ayudar.", "Gracias, lo aprecio.", "Ok. Espero tu respuesta."],
    ["De nada. Te escribiré apenas haya avance.", "No hay problema. Te aviso con noticias.", "Con gusto. Te notificaré cuando haya progreso.", "Con gusto. Seguiré esto hasta tener una respuesta."]
  ]
});

LOCALIZED_CONTENT.fr.templates = makeRomanceTemplates({
  social: [
    ["Tu te souviens de {topic} ? J'y ai encore pensé.", "Ok, je pense encore à {topic}.", "À propos de {topic}, je veux confirmer une chose d'abord.", "Plus je pense à {topic}, moins ça paraît simple."],
    ["Oui. Je commencerais par {focus} avant de décider.", "Oui, vérifions d'abord {focus}. Pas besoin de s'emballer.", "D'accord. Il faut clarifier {focus} avant de trancher.", "Exactement. Le vrai problème est peut-être que {risk}."],
    ["On garde une option au cas où {risk} ?", "On fait un plan B ? Au cas où {risk}.", "Faut-il une alternative pour éviter que {risk} ?", "Si {risk}, tout le plan peut changer."],
    ["Je peux lister {action} et tu me dis ce qui sonne faux.", "Je fais une liste rapide pour {action}, rien de lourd.", "Je vais préparer {action} et te l'envoyer pour relecture.", "D'accord, mais {action} doit être clair avant que ça se complique."],
    ["Juste, ne le rends pas trop formel. Ça doit rester un DM.", "S'il te plaît, n'en fais pas un mini communiqué.", "Le ton peut rester chaleureux, mais les détails doivent être complets.", "Si c'est trop plat, personne ne sentira le tournant."],
    ["Compris. L'humain d'abord, le détail ensuite.", "Totalement. Que ça sonne vrai d'abord, puis on ajoute le point.", "Compris. Conclusion d'abord, contexte ensuite.", "Bien. On laisse l'émotion apparaître, puis on calme."],
    ["Mets aussi {focus} au début pour qu'ils ne devinent pas.", "Et n'enterre pas {focus}. Les gens survolent les DMs.", "Je mettrais {focus} en premier pour réduire les allers-retours.", "{focus} doit arriver tôt, sinon la tension disparaît."],
    ["Comme ça, c'est facile de répondre.", "Comme ça, répondre ne ressemble pas à un devoir.", "Cela rendra la réponse plus claire.", "Comme ça, on sent que quelqu'un attend vraiment une réponse."],
    ["Faisons ça. Je t'envoie une version bientôt.", "Cool, j'en écris une et tu peux la démonter.", "Je prépare une version dans ce sens.", "Alors envoyons d'abord la phrase qui compte."],
    ["Ça marche. Laisse un peu de marge.", "Parfait. Si c'est léger, ça sonnera vrai.", "Ça me va. Gardons de la place pour ajuster.", "Bien. Laisse juste respirer la fin."],
    ["C'est bon. Je te l'envoie bientôt.", "Deal. Je te ping quand c'est prêt.", "Parfait. Je partage quand c'est propre.", "Très bien. Je l'envoie et on voit où ça mène."]
  ],
  support: [
    ["Bonjour, j'ai besoin d'aide pour {topic}.", "Hey, tu peux m'aider avec {topic} ?", "Bonjour, je voudrais confirmer le statut de {topic}.", "Bonjour, {topic} commence à impacter mes plans."],
    ["Bien sûr. Le point principal est {focus} ?", "Oui, je vérifie. C'est à propos de {focus} ?", "Je peux aider. Votre principale question concerne {focus} ?", "Je vais vérifier pour éviter que {risk} continue."],
    ["Oui, et je crains que {risk}.", "Oui. Je veux surtout savoir si {risk}.", "Oui. J'aimerais aussi savoir si {risk}.", "Oui, car si {risk}, il me faut une réponse claire."],
    ["Merci. Envoyez {action} et je vérifie tout de suite.", "Compris. Envoyez-moi {action} et je regarde.", "Veuillez fournir {action}, et je vérifierai le dossier.", "Envoyez {action}. Je localiserai le problème avec ça."],
    ["Je peux l'envoyer, mais j'aimerais un délai clair.", "Je peux le faire, mais vous avez une ETA ?", "Je peux le fournir. Merci de confirmer aussi le délai prévu.", "Je peux l'envoyer, mais j'ai besoin d'un vrai délai cette fois."],
    ["Compris. Je note la priorité et réponds aujourd'hui.", "Totalement. Je mets en priorité et je reviens aujourd'hui.", "Compris. Je priorise le dossier et répondrai aujourd'hui.", "Je marque cela urgent et je vous donne une mise à jour claire aujourd'hui."],
    ["S'il manque quelque chose, je demanderai ici.", "S'il manque un truc, je le demande ici.", "Si plus d'informations sont nécessaires, je suivrai dans ce chat.", "S'il manque quelque chose, je le dirai ici pour éviter les relances."],
    ["D'accord, j'attends la mise à jour.", "Ok, j'attends ici.", "Entendu. J'attends votre retour.", "D'accord. J'espère que ce sera enfin résolu."],
    ["Merci pour votre patience. Je partagerai chaque mise à jour ici.", "Merci. Je vous préviens dès que j'en sais plus.", "Merci. Je garderai ce fil à jour.", "Merci. Je clarifierai les prochaines étapes."],
    ["Très bien, merci.", "Super, merci pour l'aide.", "Merci, j'apprécie.", "D'accord. J'attends votre réponse."],
    ["Avec plaisir. Je vous écrirai dès qu'il y a du nouveau.", "Pas de souci. Je vous ping dès que j'ai des nouvelles.", "Avec plaisir. Je vous notifierai en cas de progrès.", "Avec plaisir. Je suivrai ce dossier jusqu'à une réponse."]
  ]
});

LOCALIZED_CONTENT.pt.templates = makeRomanceTemplates({
  social: [
    ["Você lembra de {topic}? Fiquei pensando nisso.", "Ok, ainda estou pensando em {topic}.", "Sobre {topic}, quero confirmar uma coisa primeiro.", "Quanto mais penso em {topic}, menos simples parece."],
    ["Sim. Eu começaria por {focus} antes de decidir.", "Sim, primeiro vamos ver {focus}. Sem exagerar ainda.", "Concordo. Precisamos esclarecer {focus} antes de decidir.", "Exato. O problema real pode ser que {risk}."],
    ["Deixamos uma alternativa caso {risk}?", "Fazemos um plano B? Caso {risk}.", "Precisamos de uma alternativa para evitar que {risk}?", "Se {risk}, todo o plano pode mudar."],
    ["Posso listar {action} e você me diz o que não encaixa.", "Faço uma lista rápida de {action}, sem peso.", "Vou preparar {action} e enviar para revisão.", "Tudo bem, mas {action} precisa ficar claro antes de complicar."],
    ["Só não deixe formal demais. Ainda precisa parecer um DM.", "Por favor, não transforma isso num comunicado pequeno.", "O tom pode ser acolhedor, mas os detalhes precisam estar completos.", "Se ficar plano demais, ninguém vai sentir a virada."],
    ["Entendi. Primeiro a parte humana, depois o detalhe.", "Total. Primeiro soa real, depois entra o ponto.", "Entendido. Conclusão primeiro, contexto depois.", "Boa. Deixa a emoção aparecer e depois segura."],
    ["Também coloca {focus} no começo para ninguém ter que adivinhar.", "E não enterra {focus}. As pessoas passam o olho nos DMs.", "Eu colocaria {focus} primeiro para reduzir idas e voltas.", "{focus} precisa aparecer cedo ou a tensão some."],
    ["Assim fica fácil responder.", "Assim responder não parece tarefa.", "Isso deixa o caminho de resposta mais claro.", "Assim parece que alguém realmente espera uma resposta."],
    ["Vamos fazer assim. Te mando uma versão daqui a pouco.", "Fechou, escrevo uma e você critica.", "Vou preparar uma versão nessa direção.", "Então vamos mandar primeiro a frase que importa."],
    ["Parece bom. Deixe um pouco de margem.", "Perfeito. Se ficar leve, vai parecer real.", "Funciona para mim. Vamos manter espaço para ajustes.", "Bom. Só deixa o final respirar."],
    ["Pronto. Te mando em breve.", "Combinado. Te chamo quando estiver pronto.", "Ótimo. Compartilho quando estiver revisado.", "Certo. Eu mando e vemos onde isso chega."]
  ],
  support: [
    ["Olá, preciso de ajuda com {topic}.", "Oi, você pode me ajudar com {topic}?", "Olá, gostaria de confirmar o status de {topic}.", "Olá, {topic} já está afetando meus planos."],
    ["Claro. O ponto principal é {focus}?", "Claro, posso verificar. É sobre {focus}?", "Posso ajudar. Sua principal preocupação é {focus}?", "Vou verificar para garantir que {risk} não continue."],
    ["Sim, e estou preocupado que {risk}.", "Sim. Quero saber principalmente se {risk}.", "Sim. Também gostaria de saber se {risk}.", "Sim, porque se {risk}, preciso de uma resposta clara."],
    ["Obrigado. Envie {action} e verifico agora.", "Entendi. Me mande {action} e eu vejo.", "Por favor, envie {action}, e revisarei o caso.", "Envie {action}. Com isso eu localizo o problema."],
    ["Posso enviar, mas gostaria de uma estimativa clara.", "Mando sim, mas você consegue dar uma previsão?", "Posso fornecer. Confirme também o prazo esperado.", "Eu envio, mas preciso de um prazo real desta vez."],
    ["Entendido. Vou marcar como prioridade e responder hoje.", "Total. Marco como prioridade e retorno hoje.", "Entendido. Vou priorizar o caso e responder hoje.", "Vou marcar como urgente e dar uma atualização clara hoje."],
    ["Se precisar de algo mais, peço por aqui.", "Se faltar algo, pergunto aqui mesmo.", "Se forem necessárias mais informações, seguirei neste chat.", "Se faltar algo, digo aqui para você não ter que correr atrás."],
    ["Ok, vou aguardar a atualização.", "Ok, fico aguardando aqui.", "Entendido. Aguardarei a atualização.", "Ok. Espero que isso finalmente se resolva."],
    ["Obrigado pela paciência. Vou compartilhar cada atualização aqui.", "Obrigado. Aviso assim que souber mais.", "Obrigado. Manterei este chat atualizado.", "Obrigado. Vou deixar os próximos passos claros."],
    ["Tudo bem, obrigado.", "Legal, obrigado pela ajuda.", "Obrigado, agradeço.", "Ok. Aguardo sua resposta."],
    ["De nada. Avisarei assim que houver progresso.", "Sem problema. Te chamo quando tiver notícia.", "De nada. Notificarei quando houver avanço.", "De nada. Vou acompanhar até termos uma resposta."]
  ]
});

LOCALIZED_CONTENT.ja.templates = makeRomanceTemplates({
  social: [
    ["{topic}のこと覚えてる？まだ考えてた。", "{topic}のこと、まだ気になってる。", "{topic}について、まず一つ確認したい。", "{topic}って、考えるほど単純じゃない気がしてきた。"],
    ["うん。決める前に{focus}から見たほうがいい。", "うん、まず{focus}を確認しよう。まだ大げさにしなくていい。", "同意。判断する前に{focus}を明確にしよう。", "そう。実は{risk}ことが問題かも。"],
    ["{risk}場合に備えて、代替案を残す？", "{risk}かもしれないし、B案作る？", "{risk}ことを避けるために、別案が必要かな？", "もし{risk}なら、全体の予定が変わる。"],
    ["{action}をまとめるから、違和感ある所を見て。", "{action}を軽くリストにするね。重くしない。", "{action}を作って送るので確認して。", "いいけど、複雑になる前に{action}ははっきりさせたい。"],
    ["ただ、堅すぎるとDMっぽくない。", "小さなプレスリリースみたいにはしないでね。", "温かさは残しつつ、情報は揃えたい。", "平坦すぎると、流れの変化が伝わらない。"],
    ["了解。まず人間っぽく、その後に詳細。", "そうだね。まずリアルに聞こえるようにして、後で要点を足す。", "了解。結論を先に、その後で背景を説明する。", "いいね。感情を先に出して、それから整えよう。"],
    ["あと、{focus}は上の方に置いたほうが伝わる。", "{focus}は埋もれさせないで。DMは流し読みされる。", "往復を減らすために{focus}を最初に置きたい。", "{focus}が早く出ないと、緊張感が消える。"],
    ["そうすれば返しやすい。", "それなら返信が宿題みたいにならない。", "返信の流れがわかりやすくなる。", "本当に返事を待っている感じが出る。"],
    ["それでいこう。あとで一案送るね。", "いいね、書いてみるから遠慮なく直して。", "その方向で一案を準備する。", "じゃあ、まず大事な一文を送ろう。"],
    ["よさそう。少し調整の余地は残そう。", "完璧。軽いほうがリアルに見える。", "問題ない。更新できる余白は残そう。", "いいね。最後は少し余韻を残して。"],
    ["できたらすぐ送る。", "了解。準備できたら連絡する。", "整えたら共有する。", "送ってみて、どう着地するか見よう。"]
  ],
  support: [
    ["こんにちは、{topic}について相談したいです。", "こんにちは、{topic}を手伝ってもらえますか？", "こんにちは、{topic}の状況を確認したいです。", "こんにちは、{topic}が予定に影響し始めています。"],
    ["もちろんです。主な問題は{focus}でしょうか？", "確認します。{focus}についてですか？", "お手伝いします。主な懸念は{focus}ですか？", "{risk}ことが続かないよう確認します。"],
    ["はい、それと{risk}のが心配です。", "はい。特に{risk}かどうか知りたいです。", "はい。{risk}かどうかも確認したいです。", "はい、もし{risk}なら明確な回答が必要です。"],
    ["ありがとうございます。{action}を送っていただければ確認します。", "了解です。{action}を送ってください、確認します。", "{action}をご提供ください。ケースを確認します。", "{action}を送ってください。それで問題を特定します。"],
    ["共有できますが、明確な目安時間がほしいです。", "送れますが、大体いつ頃かわかりますか？", "提供できます。想定される期限も確認してください。", "送りますが、今回は本当の期限が必要です。"],
    ["承知しました。優先メモを付けて本日中に返信します。", "了解です。優先にして今日中に戻します。", "承知しました。ケースを優先し、本日中に返信します。", "緊急として扱い、本日中に明確な更新をお伝えします。"],
    ["追加で必要なものがあれば、このスレッドで聞きます。", "足りないものがあればここで聞きます。", "追加情報が必要な場合は、このチャットで連絡します。", "不足があればここで伝えます。追いかける必要はありません。"],
    ["わかりました。更新を待ちます。", "了解、ここで待っています。", "承知しました。更新をお待ちします。", "わかりました。今回は解決してほしいです。"],
    ["お待ちいただきありがとうございます。進捗はここで共有します。", "ありがとうございます。分かり次第連絡します。", "ありがとうございます。このスレッドを更新します。", "ありがとうございます。次のステップを明確にします。"],
    ["よろしくお願いします。", "助かります、ありがとう。", "ありがとうございます。", "わかりました。返信を待ちます。"],
    ["ありがとうございます。進捗があり次第ご連絡します。", "問題ありません。新しい情報があれば連絡します。", "承知しました。進展があり次第通知します。", "最後まで確認して回答を出します。"]
  ]
});

LOCALIZED_CONTENT.zh.templates = makeRomanceTemplates({
  social: [
    ["你还记得「{topic}」吗？我刚才又想了一下。", "我还在想「{topic}」这件事。", "关于「{topic}」，我想先确认一个点。", "我越想「{topic}」越觉得没那么简单。"],
    ["嗯。我觉得先看{focus}，再决定。", "嗯，先看看{focus}，现在不用反应过度。", "同意，做判断前先明确{focus}。", "对，真正的问题可能是{risk}。"],
    ["要不要留个备选？万一{risk}呢。", "要不做个 B 方案？防一下{risk}。", "是否需要准备替代方案，避免{risk}？", "如果{risk}，整个计划都会变。"],
    ["我可以先把{action}列出来，你看哪里不对。", "我先做个{action}小清单，不搞太重。", "我先整理{action}，再发你确认。", "可以，但{action}得先说清楚，不然会变复杂。"],
    ["别写太正式，还是要像 DM。", "别写成迷你新闻稿，真的。", "语气可以温和，但信息要完整。", "如果太平，转折就没感觉了。"],
    ["懂。先讲人话，再补细节。", "对，先像真人在说话，再补重点。", "明白，先说结论，再解释背景。", "好，先把情绪放出来，再慢慢收住。"],
    ["还有，把{focus}放前面，对方不用猜。", "别把{focus}藏太深，DM 都是扫着看的。", "建议把{focus}放在开头，减少来回确认。", "{focus}要早点出现，不然张力就散了。"],
    ["这样对方就好回。", "这样回复起来不像在写作业。", "这样回应路径会更清楚。", "这样才像真的有人在等一个答案。"],
    ["那就这样，我晚点发你一版。", "行，我写一版，你来挑刺。", "我会按这个方向准备一版。", "那就先发最关键的那一句。"],
    ["可以，留一点调整空间。", "完美，轻一点才像真的。", "可以，保留后续更新空间。", "好，但结尾要留一点呼吸感。"],
    ["好了，我很快发你。", "妥，弄完喊你。", "整理好后我会同步。", "我先发出去，看看最后怎么落。"]
  ],
  support: [
    ["你好，我想咨询「{topic}」。", "你好，可以帮我看下「{topic}」吗？", "你好，我想确认「{topic}」的状态。", "你好，「{topic}」已经影响到我这边安排了。"],
    ["当然。主要问题是{focus}吗？", "可以，我来查。是{focus}这块吗？", "我可以协助处理。你的主要关注点是{focus}吗？", "我会核查，避免继续{risk}。"],
    ["对，我也担心{risk}。", "对，我主要想知道会不会{risk}。", "是的，也想确认是否会{risk}。", "对，如果{risk}，我需要一个明确答复。"],
    ["谢谢。请提供{action}，我马上查询。", "收到，你把{action}发我，我看一下。", "请提供{action}，我会核查该案例。", "请发来{action}，我用它定位问题。"],
    ["我可以提供，但希望给一个明确时间。", "可以发，但能给个大概时间吗？", "我可以提供，也请确认预计处理时间。", "我会发，但这次需要真实的时间节点。"],
    ["理解。我会优先备注，今天内回复。", "懂了，我加急备注，今天回你。", "理解，我会优先处理并在今天回复。", "我会标记紧急，今天给你明确更新。"],
    ["如果需要补充信息，会在这个会话里说。", "还缺什么我就在这里问你。", "如需更多信息，我会在当前聊天中跟进。", "如果缺材料我会直接说，避免你来回追。"],
    ["好的，那我等更新。", "好，我在这里等。", "好的，我等待后续更新。", "好，希望这次能解决。"],
    ["感谢耐心，我会在这里同步每个进展。", "谢谢，我有消息马上告诉你。", "感谢理解，我会持续更新这个会话。", "谢谢，我会把下一步说清楚。"],
    ["好的，谢谢。", "好，辛苦啦。", "谢谢，麻烦你了。", "好，我等你的回复。"],
    ["不客气，有进展会马上联系你。", "不客气，有消息我就喊你。", "不客气，进展会及时通知。", "不客气，我会跟到有结果。"]
  ]
});

const stylePalettes = {
  igLight: {
    frame: "#101217",
    screen: "#ffffff",
    header: "#ffffff",
    line: "#e7e9ef",
    text: "#111318",
    subText: "#8b929e",
    timeText: "#9aa1ad",
    themBubble: "#ffffff",
    themStroke: "#e7e9ef",
    meGradient: ["#feda75", "#fa7e1e", "#d62976", "#962fbf", "#4f5bd5"],
    meText: "#ffffff",
    composer: "#ffffff",
    input: "#ffffff",
    inputStroke: "#e1e4eb"
  },
  igDark: {
    frame: "#05060a",
    screen: "#000000",
    header: "#000000",
    line: "rgba(255,255,255,0.12)",
    text: "#f4f5f7",
    subText: "#9aa1ad",
    timeText: "#8d94a0",
    themBubble: "#262626",
    themStroke: "#262626",
    meGradient: ["#4f5bd5", "#962fbf", "#d62976", "#fa7e1e"],
    meText: "#ffffff",
    composer: "#000000",
    input: "#1f1f1f",
    inputStroke: "#1f1f1f"
  },
  creator: {
    frame: "#18111f",
    screen: "#fdf9ff",
    header: "rgba(255,255,255,0.88)",
    line: "rgba(20,22,30,0.08)",
    text: "#111318",
    subText: "#7e7485",
    timeText: "#928a98",
    themBubble: "rgba(255,255,255,0.88)",
    themStroke: "rgba(255,255,255,0.9)",
    meGradient: ["#fd1d1d", "#d62976", "#962fbf", "#4f5bd5"],
    meText: "#ffffff",
    composer: "rgba(255,255,255,0.88)",
    input: "#ffffff",
    inputStroke: "rgba(20,22,30,0.12)"
  },
  wechat: {
    frame: "#ffffff",
    screen: "#f7f7f7",
    header: "#ffffff",
    line: "#dedede",
    text: "#191919",
    subText: "#888888",
    timeText: "#b2b2b2",
    themBubble: "#ffffff",
    themStroke: "#ffffff",
    meGradient: ["#95ec69", "#95ec69"],
    meText: "#191919",
    composer: "#f7f7f7",
    input: "#ffffff",
    inputStroke: "#ffffff"
  }
};

const SHARE_REPLY_TEMPLATES = {
  en: {
    opening: "Wow, I just saw this.",
    accept: "So good!",
    question: "Should we check it out together?",
    detail: "Yes, I’m in. Who else has time?",
    pushback: "Let’s make sure {focus} works first.",
    pivot: "Good point. I’ll ask the group.",
    sideNote: "I’m saving it so we don’t lose it.",
    consequence: "This is exactly the vibe.",
    plan: "I’ll send the plan in a bit.",
    confirm: "Deal.",
    close: "Done, I’ll update you soon."
  },
  es: {
    opening: "Guau, acabo de ver esto.",
    accept: "¡Está buenísimo!",
    question: "¿Lo vemos juntos?",
    detail: "Sí, voy. ¿Quién más tiene tiempo?",
    pushback: "Primero confirmemos {focus}.",
    pivot: "Buena idea. Pregunto en el grupo.",
    sideNote: "Lo guardo para no perderlo.",
    consequence: "Este es justo el mood.",
    plan: "Luego mando el plan.",
    confirm: "Hecho.",
    close: "Listo, te aviso pronto."
  },
  fr: {
    opening: "Waouh, je viens de voir ça.",
    accept: "Trop bien !",
    question: "On le regarde ensemble ?",
    detail: "Oui, j’en suis. Qui d’autre est dispo ?",
    pushback: "Vérifions d’abord {focus}.",
    pivot: "Bonne idée. Je demande au groupe.",
    sideNote: "Je l’enregistre pour ne pas le perdre.",
    consequence: "C’est exactement l’ambiance.",
    plan: "J’envoie le plan bientôt.",
    confirm: "Deal.",
    close: "C’est bon, je te tiens au courant."
  },
  pt: {
    opening: "Nossa, acabei de ver isso.",
    accept: "Muito bom!",
    question: "Vamos ver isso juntos?",
    detail: "Sim, eu topo. Quem mais tem tempo?",
    pushback: "Vamos confirmar {focus} primeiro.",
    pivot: "Boa. Vou perguntar no grupo.",
    sideNote: "Vou salvar para não perder.",
    consequence: "É exatamente essa vibe.",
    plan: "Daqui a pouco mando o plano.",
    confirm: "Fechado.",
    close: "Pronto, te atualizo em breve."
  },
  ja: {
    opening: "わ、今これ見た。",
    accept: "すごくいい！",
    question: "一緒に見に行く？",
    detail: "行きたい。他に時間ある人いるかな？",
    pushback: "まず{focus}を確認しよう。",
    pivot: "いいね。グループに聞いてみる。",
    sideNote: "忘れないように保存しておくね。",
    consequence: "まさにこの雰囲気。",
    plan: "あとで予定送るね。",
    confirm: "了解。",
    close: "できたらすぐ共有する。"
  },
  zh: {
    opening: "哇哦！我也看到了这一幕",
    accept: "好精彩！",
    question: "要跟我们一起去看吗？",
    detail: "好呀，我要去。其他人有时间去吗？",
    pushback: "先确认一下{focus}吧。",
    pivot: "好，我去群里问问。",
    sideNote: "我先收藏一下，别回头找不到。",
    consequence: "这个氛围真的对了。",
    plan: "我晚点把安排发你。",
    confirm: "可以。",
    close: "好了，有更新我马上说。"
  }
};

let currentMessages = [];
let currentConfig = {};
let debounceTimer = 0;
let lastLanguage = "en";

function makeRomanceTemplates({ social, support }) {
  const mapRows = (rows) => Object.fromEntries(STAGES.map((stage, index) => [
    stage,
    Object.fromEntries(TONES.map((tone, toneIndex) => [tone, rows[index][toneIndex]]))
  ]));
  return { social: mapRows(social), support: mapRows(support) };
}

function locale() {
  return LOCALIZED_CONTENT[els.language.value] || LOCALIZED_CONTENT.en;
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed) {
  let value = seed || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

function selectedTone() {
  return document.querySelector('input[name="tone"]:checked').value;
}

function populateSelect(select, values, labels) {
  const selected = select.value;
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labels[value];
    select.append(option);
  });
  if (values.includes(selected)) select.value = selected;
}

function applyI18n({ preserveTopic = true } = {}) {
  const data = locale();
  document.documentElement.lang = data.htmlLang;
  document.title = data.title;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = data.ui[node.dataset.i18n] || node.textContent;
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", data.ui[node.dataset.i18nAria] || node.getAttribute("aria-label") || "");
  });
  document.querySelectorAll("[data-tone-label]").forEach((node) => {
    node.textContent = data.tones[node.dataset.toneLabel];
  });

  populateSelect(els.scene, SCENES, data.scenes);
  populateSelect(els.style, STYLES, data.styles);
  els.topic.placeholder = data.samples[0];

  const previousTopic = els.topic.value.trim();
  if (!preserveTopic || !previousTopic || LOCALIZED_CONTENT[lastLanguage].samples.includes(previousTopic)) {
    els.topic.value = data.samples[0];
  }

  renderCount();
  lastLanguage = els.language.value;
}

function cleanTopic(topic) {
  const data = locale();
  const normalized = topic.replace(/\s+/g, " ").trim();
  return normalized || data.samples[0];
}

function shortTitle(topic) {
  const compact = topic.replace(/[，。！？、,.!?]/g, " ").replace(/\s+/g, " ").trim();
  const chars = Array.from(compact);
  if (chars.length <= 15) return compact;
  return `${chars.slice(0, 15).join("")}...`;
}

function includesAny(text, keywords) {
  const normalized = text.toLocaleLowerCase();
  return keywords.some((word) => normalized.includes(word.toLocaleLowerCase()));
}

function findDomain(topic, scene) {
  const domains = locale().domains;
  if (scene === "support") return domains.support;
  return Object.values(domains).find((rule) => rule.key !== "general" && includesAny(topic, rule.keywords)) || domains.general;
}

function initials(name) {
  const trimmed = name.trim();
  if (!trimmed) return "DM";
  if (/^[a-z]/i.test(trimmed)) return trimmed.slice(0, 1).toUpperCase();
  return Array.from(trimmed).slice(0, 1).join("");
}

function makeParticipants(scene, rng) {
  const data = locale();
  const pool = data.names;
  const palette = ["#4f5bd5", "#d62976", "#fa7e1e", "#0f9f6e", "#7c3aed"];

  if (scene === "support") {
    const agent = pick(rng, pool.support);
    return [
      { id: "me", name: "Me", side: "me", initials: "M", color: "#d62976", handle: "my.account" },
      { id: "agent", name: agent, side: "them", initials: initials(agent), color: "#4f5bd5", handle: "support.team" }
    ];
  }

  if (scene === "group" || scene === "work") {
    const names = pool[scene].slice().sort(() => rng() - 0.5).slice(0, scene === "work" ? 3 : 3);
    return [
      { id: "me", name: "Me", side: "me", initials: "M", color: "#d62976", handle: "my.account" },
      ...names.map((name, index) => ({ id: `p${index}`, name, side: "them", initials: initials(name), color: palette[index], handle: makeHandle(name, index) }))
    ];
  }

  const friend = pick(rng, pool.daily);
  return [
    { id: "me", name: "Me", side: "me", initials: "M", color: "#d62976", handle: "my.account" },
    { id: "friend", name: friend, side: "them", initials: initials(friend), color: "#4f5bd5", handle: makeHandle(friend, 0) }
  ];
}

function makeHandle(name, index) {
  const base = name.toLocaleLowerCase().replace(/[^a-z0-9]+/gi, "").slice(0, 10) || "raissa";
  const suffixes = ["cool22", "drdr", "story", "daily", "studio"];
  return `${base}.${suffixes[index % suffixes.length]}`;
}

function speakerKey(label) {
  return String(label || "").trim().toLocaleLowerCase();
}

function isMeLabel(label) {
  const key = speakerKey(label);
  return key === "me" || key === "i" || key === speakerKey(locale().units.me) || label === "我" || label === "自分";
}

function uniqueParticipantsFromMessages(messages) {
  const byId = new Map();
  messages.forEach((message) => {
    if (message.speaker && !byId.has(message.speaker.id)) byId.set(message.speaker.id, message.speaker);
  });
  return Array.from(byId.values());
}

function makeScriptSpeakerResolver() {
  const colors = ["#4f5bd5", "#d62976", "#fa7e1e", "#0f9f6e", "#7c3aed", "#0891b2"];
  const byLabel = new Map();
  const addSpeaker = (speaker) => {
    if (!speaker) return;
    byLabel.set(speakerKey(speaker.name), speaker);
    byLabel.set(speakerKey(displayName(speaker)), speaker);
    if (speaker.id === "me") byLabel.set("me", speaker);
  };
  (currentConfig.participants || []).forEach(addSpeaker);
  currentMessages.forEach((message) => addSpeaker(message.speaker));

  return (label, index) => {
    const key = speakerKey(label);
    if (byLabel.has(key)) return byLabel.get(key);
    const meSpeaker = byLabel.get("me") || { id: "me", name: "Me", side: "me", initials: "M", color: "#d62976", handle: "my.account" };
    if (isMeLabel(label)) {
      byLabel.set(key, meSpeaker);
      return meSpeaker;
    }

    const speaker = {
      id: `script-${key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || index}`,
      name: label.trim(),
      side: "them",
      initials: initials(label),
      color: colors[(byLabel.size + index) % colors.length],
      handle: makeHandle(label, index)
    };
    byLabel.set(key, speaker);
    return speaker;
  };
}

function displayName(person) {
  if (person.id !== "me") return person.name;
  return locale().units.me;
}

function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] || "");
}

function buildMessageText(data, scene, stage, tone, values) {
  if (scene !== "support" && SHARE_REPLY_TEMPLATES[currentConfig.language]?.[stage]) {
    return interpolate(SHARE_REPLY_TEMPLATES[currentConfig.language][stage], values);
  }
  const templateGroup = scene === "support" ? data.templates.support : data.templates.social;
  return interpolate(templateGroup[stage][tone], values);
}

function buildStages(rounds) {
  const essential = ["opening", "accept", "question", "detail"];
  const closing = ["plan", "close"];
  const middleCandidates = ["pushback", "pivot", "sideNote", "consequence", "confirm"];
  const stages = [...essential];
  let cursor = 0;

  while (stages.length < Math.max(0, rounds - closing.length)) {
    stages.push(middleCandidates[cursor % middleCandidates.length]);
    cursor += 1;
  }

  return [...stages, ...closing].slice(0, rounds);
}

function participantForStage(scene, stage, participants, index) {
  if (scene === "support") {
    return ["opening", "question", "pushback", "consequence", "confirm"].includes(stage) ? participants[0] : participants[1];
  }
  if (scene === "work") {
    const order = [participants[0], participants[1], participants[0], participants[2], participants[1], participants[0], participants[3], participants[0], participants[1], participants[2], participants[0]];
    return order[index % order.length];
  }
  if (scene === "group") {
    const order = [participants[0], participants[1], participants[2], participants[0], participants[3], participants[2], participants[1], participants[0]];
    return order[index % order.length];
  }
  return index % 2 === 0 ? participants[0] : participants[1];
}

function formatMessageTime(baseDate, index, rng) {
  const date = new Date(baseDate.getTime());
  date.setMinutes(baseDate.getMinutes() + index * 2 + Math.floor(rng() * 2));
  return date.toLocaleTimeString(locale().htmlLang, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function makeChatTitle(scene, topic, participants) {
  if (scene === "support") return participants.find((person) => person.side !== "me")?.name || participants[1]?.name || participants[0]?.name || "Chat";
  if (scene === "work" || scene === "group") {
    return participants.filter((person) => person.side !== "me").map((person) => person.name).slice(0, 2).join(", ");
  }
  return participants[1]?.name || shortTitle(topic);
}

function generatePreview() {
  const data = locale();
  const topic = cleanTopic(els.topic.value);
  if (!els.topic.value.trim()) els.topic.value = topic;

  const scene = els.scene.value;
  const tone = selectedTone();
  const styleMode = els.style.value;
  const rounds = Number(els.rounds.value);
  const seed = hashString(`${data.htmlLang}|${topic}|${scene}|${tone}|${rounds}`);
  const rng = makeRng(seed);
  const domain = findDomain(topic, scene);
  const participants = makeParticipants(scene, rng);
  const stages = buildStages(rounds);
  const baseDate = new Date();
  baseDate.setSeconds(0, 0);
  baseDate.setMinutes(baseDate.getMinutes() - rounds * 2);

  currentConfig = {
    language: els.language.value,
    topic,
    scene,
    tone,
    styleMode,
    participants,
    title: makeChatTitle(scene, topic, participants),
    domain
  };

  currentMessages = stages.map((stage, index) => {
    const speaker = participantForStage(scene, stage, participants, index);
    const values = {
      topic,
      focus: domain.focus,
      risk: domain.risk,
      action: domain.action
    };
    const text = buildMessageText(data, scene, stage, tone, values);

    return {
      id: `${stage}-${index}`,
      speaker,
      stage,
      text,
      time: formatMessageTime(baseDate, index, rng)
    };
  });

  renderAll();
}

function showApiNotice(message, kind = "error") {
  if (!els.notice) return;
  els.notice.hidden = !message;
  els.notice.dataset.kind = kind;
  els.notice.textContent = message || "";
}

function setGenerating(isGenerating) {
  els.generate.disabled = isGenerating;
  els.generate.textContent = isGenerating ? "Generating..." : locale().ui.generateButton;
  if (isGenerating) {
    window.clearTimeout(setStatus.timer);
    els.status.textContent = "Working";
  }
}

function apiErrorMessage(status, code) {
  if (status === 400 || code === "validation") return "Check the topic and conversation settings, then try again.";
  if (status === 429 || code === "rate_limit") return "You have reached this minute's generation limit. Please wait a moment and retry.";
  if (status === 502 || code === "upstream" || code === "refusal") return "The conversation service could not finish that request. Please try again.";
  if (status === 503) return "Generation is temporarily unavailable on this deployment.";
  return "We could not reach the conversation service. Please retry.";
}

async function generateConversation() {
  const topic = cleanTopic(els.topic.value);
  if (!els.topic.value.trim()) els.topic.value = topic;

  const payload = {
    topic,
    scene: els.scene.value,
    tone: selectedTone(),
    language: els.language.value,
    rounds: Number(els.rounds.value)
  };

  showApiNotice("");
  setGenerating(true);
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result.error || "Generation failed.");
      error.status = response.status;
      error.code = result.code;
      throw error;
    }
    const date = new Date();
    date.setSeconds(0, 0);
    date.setMinutes(date.getMinutes() - payload.rounds * 2);
    const rng = makeRng(hashString(`${payload.topic}|${payload.scene}|${payload.rounds}`));
    const mapped = mapConversationForPreview(result, { ...payload, styleMode: els.style.value }, {
      domain: findDomain(topic, payload.scene),
      formatTime: formatMessageTime,
      baseDate: date,
      rng
    });
    currentConfig = mapped.config;
    currentMessages = mapped.messages;
    renderAll();
    setStatus(locale().units.generated);
  } catch (error) {
    showApiNotice(apiErrorMessage(error.status, error.code));
    els.status.textContent = error.status === 429 ? "Rate limited" : "Try again";
  } finally {
    setGenerating(false);
  }
}

function renderAll() {
  currentConfig.styleMode = els.style.value;
  els.frame.dataset.style = currentConfig.styleMode;
  renderHeader();
  renderChat();
  renderScript();
  renderCount();
}

function renderHeader() {
  const data = locale();
  const participants = currentConfig.participants || [];
  const target = participants.find((person) => person.side !== "me") || participants[0] || { name: "DM", initials: "D" };
  els.title.textContent = currentConfig.title || target.name;
  els.subtitle.textContent = target.handle || data.units.online;
  els.headerAvatar.textContent = target.initials;
  els.profileAvatar.style.setProperty("--avatar-color", target.color);
  els.clock.textContent = new Date().toLocaleTimeString(data.htmlLang, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function renderChat() {
  const data = locale();
  const isWeChat = currentConfig.styleMode === "wechat";
  els.stream.innerHTML = "";
  if (!currentMessages.length) return;

  const timeChip = document.createElement("div");
  timeChip.className = "time-chip";
  timeChip.textContent = `${data.units.today} ${currentMessages[0].time}`;
  els.stream.append(timeChip);

  currentMessages.forEach((message, index) => {
    const previous = currentMessages[index - 1];
    const grouped = previous && previous.speaker.id === message.speaker.id;
    const row = document.createElement("article");
    row.className = `message-row ${message.speaker.side}`;
    if (grouped) row.classList.add("grouped");
    if (message.speaker.side !== "me" && !grouped) row.classList.add("show-name");

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (isWeChat) {
      const avatarImage = document.createElement("img");
      avatarImage.className = "figma-message-avatar";
      avatarImage.src = WECHAT_MESSAGE_AVATARS[message.speaker.side];
      avatarImage.alt = "";
      avatar.append(avatarImage);
    } else {
      avatar.style.background = message.speaker.color;
      const avatarText = document.createElement("span");
      avatarText.textContent = message.speaker.initials;
      avatar.append(avatarText);
    }

    const wrap = document.createElement("div");
    wrap.className = "bubble-wrap";

    const name = document.createElement("span");
    name.className = "speaker-name";
    name.textContent = displayName(message.speaker);

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text;

    const meta = document.createElement("span");
    meta.className = "message-meta";
    meta.textContent = message.time;

    wrap.append(name, bubble, meta);
    if (!isWeChat && message.speaker.side === "me" && index === Math.min(3, currentMessages.length - 1)) {
      wrap.append(renderReaction("message-reaction"));
    }
    if (message.speaker.side === "me") {
      if (isWeChat) row.append(wrap, avatar);
      else row.append(wrap);
    } else {
      row.append(avatar, wrap);
    }
    els.stream.append(row);
  });

  if (!isWeChat && currentMessages.some((message) => message.speaker.side === "me")) {
    const seen = document.createElement("div");
    seen.className = "seen-line";
    seen.textContent = data.units.seen;
    els.stream.append(seen);
  }
}

function renderReaction(className) {
  const reaction = document.createElement("div");
  reaction.className = className;
  reaction.innerHTML = "<i></i><i></i><i></i><strong>3</strong>";
  return reaction;
}

function renderScript() {
  els.script.innerHTML = "";
  const item = document.createElement("li");
  item.className = "script-combined-item";

  const editor = document.createElement("textarea");
  editor.id = "scriptEditor";
  editor.className = "script-editor";
  editor.rows = 8;
  editor.value = formatPreviewScript(currentMessages, (speaker) => displayName(speaker));
  editor.setAttribute("aria-label", locale().ui.scriptTitle);

  item.append(editor);
  els.script.append(item);
}

function updateMessageFromEditor(editor) {
  try {
    currentMessages = updatePreviewMessagesFromScript(currentMessages, editor.value, {
      allowCountChange: true,
      resolveSpeaker: makeScriptSpeakerResolver(),
      formatTime: (index) => {
        const date = new Date();
        date.setSeconds(0, 0);
        date.setMinutes(date.getMinutes() - Math.max(0, currentMessages.length - index) * 2);
        return date.toLocaleTimeString(locale().htmlLang, { hour: "2-digit", minute: "2-digit", hour12: false });
      }
    });
    currentConfig.participants = uniqueParticipantsFromMessages(currentMessages);
    currentConfig.title = makeChatTitle(currentConfig.scene || "daily", currentConfig.topic || "", currentConfig.participants);
    editor.removeAttribute("aria-invalid");
    renderHeader();
    renderChat();
    renderCount();
  } catch {
    editor.setAttribute("aria-invalid", "true");
  }
}

function renderCount() {
  const data = locale();
  els.roundValue.textContent = formatMessageCount(Number(els.rounds.value), data);
  els.count.textContent = formatMessageCount(currentMessages.length, data);
}

function formatMessageCount(count, data = locale()) {
  if (data.htmlLang.startsWith("ja") || data.htmlLang.startsWith("zh")) return `${count} ${data.units.messages}`;
  return `${count} ${data.units.messages}`;
}

function plainScript() {
  return currentMessages.map((message) => `${displayName(message.speaker)}: ${message.text}`).join("\n");
}

async function copyScript() {
  const text = plainScript();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-999px";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  setStatus(locale().units.copied);
}

function setStatus(text) {
  els.status.textContent = text;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    els.status.textContent = locale().units.ready;
  }, 1800);
}

function wrapCanvasText(ctx, text, maxWidth) {
  const chars = Array.from(text);
  const lines = [];
  let line = "";

  chars.forEach((char) => {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = char.trimStart();
    } else {
      line = test;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function gradientFill(ctx, x, y, width, colors) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  colors.forEach((color, index) => gradient.addColorStop(index / Math.max(colors.length - 1, 1), color));
  return gradient;
}

function drawCenteredText(ctx, text, x, y) {
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.textAlign = "left";
}

function drawText(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function beginIcon(ctx, color = "#090909", width = 2.45) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawBackIcon(ctx, x, y, size = 24) {
  beginIcon(ctx);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.62, y + size * 0.2);
  ctx.lineTo(x + size * 0.32, y + size * 0.5);
  ctx.lineTo(x + size * 0.62, y + size * 0.8);
  ctx.stroke();
}

function drawCallIcon(ctx, x, y, size = 28) {
  beginIcon(ctx);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.31, y + size * 0.18);
  ctx.bezierCurveTo(x + size * 0.38, y + size * 0.1, x + size * 0.48, y + size * 0.12, x + size * 0.53, y + size * 0.22);
  ctx.lineTo(x + size * 0.61, y + size * 0.36);
  ctx.bezierCurveTo(x + size * 0.65, y + size * 0.43, x + size * 0.63, y + size * 0.51, x + size * 0.56, y + size * 0.56);
  ctx.lineTo(x + size * 0.5, y + size * 0.61);
  ctx.bezierCurveTo(x + size * 0.62, y + size * 0.72, x + size * 0.72, y + size * 0.78, x + size * 0.82, y + size * 0.82);
  ctx.lineTo(x + size * 0.88, y + size * 0.76);
  ctx.bezierCurveTo(x + size * 0.94, y + size * 0.7, x + size * 1.02, y + size * 0.7, x + size * 1.08, y + size * 0.75);
  ctx.lineTo(x + size * 1.18, y + size * 0.84);
  ctx.bezierCurveTo(x + size * 1.28, y + size * 0.93, x + size * 1.16, y + size * 1.08, x + size * 1.03, y + size * 1.13);
  ctx.bezierCurveTo(x + size * 0.76, y + size * 1.22, x + size * 0.28, y + size * 0.87, x + size * 0.14, y + size * 0.44);
  ctx.bezierCurveTo(x + size * 0.1, y + size * 0.32, x + size * 0.18, y + size * 0.22, x + size * 0.31, y + size * 0.18);
  ctx.stroke();
}

function drawVideoIcon(ctx, x, y, size = 28) {
  beginIcon(ctx);
  roundRect(ctx, x + size * 0.16, y + size * 0.27, size * 0.5, size * 0.48, size * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.66, y + size * 0.43);
  ctx.lineTo(x + size * 0.88, y + size * 0.32);
  ctx.lineTo(x + size * 0.88, y + size * 0.7);
  ctx.lineTo(x + size * 0.66, y + size * 0.59);
  ctx.stroke();
}

function drawCameraIcon(ctx, x, y, size = 28, color = "#090909") {
  beginIcon(ctx, color);
  roundRect(ctx, x + size * 0.16, y + size * 0.3, size * 0.68, size * 0.52, size * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.36, y + size * 0.3);
  ctx.lineTo(x + size * 0.42, y + size * 0.2);
  ctx.lineTo(x + size * 0.58, y + size * 0.2);
  ctx.lineTo(x + size * 0.64, y + size * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.5, y + size * 0.56, size * 0.12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawVoiceIcon(ctx, x, y, size = 28) {
  beginIcon(ctx);
  roundRect(ctx, x + size * 0.37, y + size * 0.15, size * 0.26, size * 0.48, size * 0.13);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.24, y + size * 0.48);
  ctx.bezierCurveTo(x + size * 0.25, y + size * 0.73, x + size * 0.75, y + size * 0.73, x + size * 0.76, y + size * 0.48);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size * 0.74);
  ctx.lineTo(x + size * 0.5, y + size * 0.86);
  ctx.moveTo(x + size * 0.38, y + size * 0.86);
  ctx.lineTo(x + size * 0.62, y + size * 0.86);
  ctx.stroke();
}

function drawImageIcon(ctx, x, y, size = 28) {
  beginIcon(ctx);
  roundRect(ctx, x + size * 0.16, y + size * 0.19, size * 0.68, size * 0.62, size * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.65, y + size * 0.36, size * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.22, y + size * 0.72);
  ctx.lineTo(x + size * 0.39, y + size * 0.55);
  ctx.bezierCurveTo(x + size * 0.45, y + size * 0.49, x + size * 0.51, y + size * 0.5, x + size * 0.56, y + size * 0.57);
  ctx.lineTo(x + size * 0.61, y + size * 0.63);
  ctx.lineTo(x + size * 0.71, y + size * 0.54);
  ctx.lineTo(x + size * 0.81, y + size * 0.65);
  ctx.stroke();
}

function drawStickerIcon(ctx, x, y, size = 28) {
  beginIcon(ctx);
  ctx.beginPath();
  roundRect(ctx, x + size * 0.22, y + size * 0.16, size * 0.56, size * 0.66, size * 0.13);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.4, y + size * 0.39, size * 0.04, 0, Math.PI * 2);
  ctx.arc(x + size * 0.6, y + size * 0.39, size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.38, y + size * 0.56);
  ctx.bezierCurveTo(x + size * 0.45, y + size * 0.65, x + size * 0.55, y + size * 0.65, x + size * 0.62, y + size * 0.56);
  ctx.stroke();
}

function drawAddIcon(ctx, x, y, size = 28) {
  beginIcon(ctx, "#191919", 2);
  roundRect(ctx, x + size * 0.17, y + size * 0.17, size * 0.66, size * 0.66, size * 0.08);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + size * 0.5, y + size * 0.32);
  ctx.lineTo(x + size * 0.5, y + size * 0.68);
  ctx.moveTo(x + size * 0.32, y + size * 0.5);
  ctx.lineTo(x + size * 0.68, y + size * 0.5);
  ctx.stroke();
}

function drawStandardStatusIcons(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "#05070b";
  [[1, 8, 3, 4], [6, 5, 3, 7], [11, 2, 3, 10], [16, 0, 3, 12]].forEach(([left, top, width, height]) => {
    roundRect(ctx, x + left, y + top, width, height, 1);
    ctx.fill();
  });

  const wifiX = x + 26;
  ctx.strokeStyle = "#05070b";
  ctx.lineWidth = 1.9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(wifiX + 1, y + 4);
  ctx.quadraticCurveTo(wifiX + 9, y - 2, wifiX + 17, y + 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wifiX + 4, y + 7.3);
  ctx.quadraticCurveTo(wifiX + 9, y + 3.1, wifiX + 14, y + 7.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wifiX + 7.4, y + 10.5);
  ctx.quadraticCurveTo(wifiX + 9, y + 9.2, wifiX + 10.6, y + 10.5);
  ctx.stroke();

  const batteryX = x + 52;
  ctx.lineWidth = 1.4;
  roundRect(ctx, batteryX, y + 1, 20, 10, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(batteryX + 22, y + 4);
  ctx.lineTo(batteryX + 22, y + 8);
  ctx.stroke();
  ctx.fillStyle = "#05070b";
  roundRect(ctx, batteryX + 2.5, y + 3.5, 13.5, 5, 1);
  ctx.fill();
  ctx.restore();
}

function drawFigmaStatusIcons(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "#000000";
  roundRect(ctx, x + 2, y + 7.5, 3, 4.5, 1);
  ctx.fill();
  roundRect(ctx, x + 6.5, y + 6, 3, 6, 1);
  ctx.fill();
  roundRect(ctx, x + 11, y + 4, 3, 8, 1);
  ctx.fill();
  ctx.fillStyle = "rgba(60, 60, 67, 0.18)";
  roundRect(ctx, x + 15.5, y + 2, 3, 10, 1);
  ctx.fill();

  const wifiX = x + 24;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(wifiX + 1.5, y + 5);
  ctx.quadraticCurveTo(wifiX + 8, y - 0.4, wifiX + 14.5, y + 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wifiX + 4, y + 8.5);
  ctx.quadraticCurveTo(wifiX + 8, y + 5.3, wifiX + 12, y + 8.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(wifiX + 6.4, y + 11.3);
  ctx.quadraticCurveTo(wifiX + 8, y + 10, wifiX + 9.7, y + 11.3);
  ctx.stroke();

  const batteryX = x + 44;
  ctx.strokeStyle = "rgba(60, 60, 67, 0.6)";
  ctx.lineWidth = 1;
  roundRect(ctx, batteryX, y + 1, 23, 12, 3);
  ctx.stroke();
  ctx.fillStyle = "#000000";
  roundRect(ctx, batteryX + 2, y + 3, 19, 8, 1);
  ctx.fill();
  ctx.fillStyle = "rgba(60, 60, 67, 0.6)";
  roundRect(ctx, batteryX + 24, y + 5, 1, 4, 1);
  ctx.fill();
  ctx.restore();
}

const canvasAssetCache = new Map();

function loadCanvasAsset(src) {
  if (!canvasAssetCache.has(src)) {
    canvasAssetCache.set(src, new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load canvas asset: ${src}`));
      image.src = src;
    }));
  }
  return canvasAssetCache.get(src);
}

function drawCoverCanvasImage(ctx, image, x, y, width, height, radius) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = width / height;
  const cropWidth = sourceAspect > targetAspect ? sourceHeight * targetAspect : sourceWidth;
  const cropHeight = sourceAspect > targetAspect ? sourceHeight : sourceWidth / targetAspect;
  const cropX = (sourceWidth - cropWidth) / 2;
  const cropY = (sourceHeight - cropHeight) / 2;
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, x, y, width, height);
  ctx.restore();
}

async function renderWeChatCanvas() {
  const data = locale();
  const [voiceAsset, stickerAsset, addAsset, themAvatarAsset, meAvatarAsset] = await Promise.all([
    loadCanvasAsset("/assets/wechat-composer/voice.svg"),
    loadCanvasAsset("/assets/wechat-composer/sticker.svg"),
    loadCanvasAsset("/assets/wechat-composer/add2.svg"),
    loadCanvasAsset(WECHAT_MESSAGE_AVATARS.them),
    loadCanvasAsset(WECHAT_MESSAGE_AVATARS.me)
  ]);
  const scale = 2;
  const width = 375;
  const statusH = 44;
  const headerH = 44;
  const composerH = 90;
  const streamTop = statusH + headerH;
  const fontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `16px ${fontFamily}`;

  const measured = currentMessages.map((message) => {
    const lines = wrapCanvasText(measure, message.text, 206);
    const bubbleH = lines.length * 22 + 20;
    return { message, lines, bubbleH, rowH: Math.max(38, bubbleH) + 15 };
  });
  const streamH = 37 + measured.reduce((sum, item) => sum + item.rowH, 0) + 10;
  const height = Math.max(812, streamTop + streamH + composerH);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#191919";
  ctx.font = `700 16px ${fontFamily}`;
  ctx.fillText(els.clock.textContent, 20, 29);
  drawFigmaStatusIcons(ctx, 292, 16);

  const headerY = statusH;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, headerY, width, headerH);
  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, streamTop);
  ctx.lineTo(width, streamTop);
  ctx.stroke();
  drawBackIcon(ctx, 18, headerY + 10, 24);
  ctx.fillStyle = "#191919";
  ctx.font = `700 17px ${fontFamily}`;
  const title = shortTitle(currentConfig.title || "Chat");
  drawCenteredText(ctx, title, width / 2, headerY + 28);
  ctx.fillStyle = "#191919";
  [0, 1, 2].forEach((dot) => {
    ctx.beginPath();
    ctx.arc(334 + dot * 8, headerY + 22, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  const composerY = height - composerH;
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, streamTop, width, composerY - streamTop);
  ctx.fillStyle = "#b2b2b2";
  ctx.font = `13px ${fontFamily}`;
  drawCenteredText(ctx, `${data.units.today} ${currentMessages[0].time}`, width / 2, streamTop + 24);

  let y = streamTop + 37;
  measured.forEach(({ message, lines, bubbleH, rowH }) => {
    const isMe = message.speaker.side === "me";
    const textWidths = lines.map((line) => measure.measureText(line).width);
    const bubbleW = Math.min(228, Math.max(54, ...textWidths) + 20);
    const avatarX = isMe ? width - 58 : 20;
    const bubbleX = isMe ? avatarX - 10 - bubbleW : avatarX + 48;
    const bubbleY = y + Math.max(0, (38 - bubbleH) / 2);

    drawCoverCanvasImage(ctx, isMe ? meAvatarAsset : themAvatarAsset, avatarX, y, 38, 38, 4);

    ctx.fillStyle = isMe ? "#95ec69" : "#ffffff";
    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 4);
    ctx.fill();
    ctx.beginPath();
    if (isMe) {
      ctx.moveTo(bubbleX + bubbleW, bubbleY + 12);
      ctx.lineTo(bubbleX + bubbleW + 8, bubbleY + 17);
      ctx.lineTo(bubbleX + bubbleW, bubbleY + 22);
    } else {
      ctx.moveTo(bubbleX, bubbleY + 12);
      ctx.lineTo(bubbleX - 8, bubbleY + 17);
      ctx.lineTo(bubbleX, bubbleY + 22);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#191919";
    ctx.font = `16px ${fontFamily}`;
    drawText(ctx, lines, bubbleX + 10, bubbleY + 22, 22);
    y += rowH;
  });

  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, composerY, width, composerH);
  ctx.strokeStyle = "#dedede";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, composerY);
  ctx.lineTo(width, composerY);
  ctx.stroke();
  ctx.drawImage(voiceAsset, 10.67, composerY + 14.67, 26.67, 26.67);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 48, composerY + 12, 222, 40, 4);
  ctx.fill();
  ctx.drawImage(stickerAsset, 297.67, composerY + 14.67, 26.67, 26.67);
  ctx.drawImage(addAsset, 337.67, composerY + 14.67, 26.67, 26.67);
  ctx.fillStyle = "#191919";
  roundRect(ctx, 121, composerY + 76, 133, 6, 3);
  ctx.fill();
  return canvas;
}

async function renderCanvas() {
  if (currentConfig.styleMode === "wechat") return renderWeChatCanvas();
  const data = locale();
  const scale = 2;
  const width = 430;
  const framePad = 4;
  const screenX = framePad;
  const screenW = width - framePad * 2;
  const statusH = 42;
  const headerH = 72;
  const composerH = 66;
  const maxBubble = 314;
  const fontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `17px ${fontFamily}`;

  const measured = currentMessages.map((message) => {
    const bubbleMax = message.speaker.side === "me" ? maxBubble : maxBubble - 42;
    const lines = wrapCanvasText(measure, message.text, bubbleMax - 26);
    const showName = message.speaker.side !== "me";
    const reactionH = message.speaker.side === "me" ? 18 : 0;
    return { message, lines, bubbleH: lines.length * 24 + 18, rowH: lines.length * 24 + (showName ? 42 : 30) + reactionH };
  });

  const streamH = 30 + measured.reduce((sum, item) => sum + item.rowH + 8, 0) + 24;
  const height = Math.max(790, framePad * 2 + statusH + headerH + streamH + composerH);

  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#6a43f5");
  bg.addColorStop(0.35, "#fb0bb5");
  bg.addColorStop(0.68, "#fe7e1e");
  bg.addColorStop(1, "#ffc928");
  ctx.fillStyle = bg;
  roundRect(ctx, 0, 0, width, height, 36);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.save();
  ctx.translate(-50, 85);
  ctx.rotate(-0.38);
  for (let i = 0; i < 8; i += 1) ctx.fillRect(i * 42, 0, 20, height);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, screenX, framePad, screenW, height - framePad * 2, 32);
  ctx.fill();
  roundRect(ctx, screenX, framePad, screenW, height - framePad * 2, 32);
  ctx.clip();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(screenX, framePad, screenW, height - framePad * 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(screenX, framePad, screenW, statusH);
  ctx.fillStyle = "#05070b";
  ctx.font = `850 17px ${fontFamily}`;
  ctx.fillText(els.clock.textContent, screenX + 45, framePad + 28);
  drawStandardStatusIcons(ctx, screenX + screenW - 96, framePad + 13);

  const headerY = framePad + statusH;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(screenX, headerY, screenW, headerH);
  ctx.strokeStyle = "#edf0f4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(screenX, headerY + headerH);
  ctx.lineTo(screenX + screenW, headerY + headerH);
  ctx.stroke();

  drawBackIcon(ctx, screenX + 20, headerY + 24, 26);

  const target = (currentConfig.participants || []).find((person) => person.side !== "me") || { initials: "D", color: "#4f5bd5" };
  const avatarX = screenX + 68;
  const avatarY = headerY + 17;
  const profileGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + 36, avatarY + 36);
  profileGrad.addColorStop(0, "#e3d8c8");
  profileGrad.addColorStop(1, target.color || "#6471d9");
  ctx.fillStyle = profileGrad;
  ctx.beginPath();
  ctx.arc(avatarX + 18, avatarY + 18, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.beginPath();
  ctx.arc(avatarX + 24, avatarY + 11, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 12px ${fontFamily}`;
  drawCenteredText(ctx, target.initials, avatarX + 18, avatarY + 23);

  ctx.fillStyle = "#0d0f14";
  ctx.font = `850 18px ${fontFamily}`;
  ctx.fillText(currentConfig.title || "DM", screenX + 114, headerY + 31);
  ctx.fillStyle = "#8c8f98";
  ctx.font = `720 14px ${fontFamily}`;
  ctx.fillText(target.handle || data.units.online, screenX + 114, headerY + 52);

  drawCallIcon(ctx, screenX + screenW - 108, headerY + 21, 23);
  drawVideoIcon(ctx, screenX + screenW - 56, headerY + 20, 29);

  let y = headerY + headerH + 8;
  ctx.fillStyle = "#8e929c";
  ctx.font = `800 15px ${fontFamily}`;
  drawCenteredText(ctx, `${data.units.today} ${currentMessages[0].time}`, screenX + screenW / 2, y + 14);
  y += 30;

  measured.forEach(({ message, lines, bubbleH, rowH }, index) => {
    const isMe = message.speaker.side === "me";
    const previous = currentMessages[index - 1];
    const grouped = previous && previous.speaker.id === message.speaker.id;
    const avatarSize = 30;
    const textWidths = lines.map((line) => measure.measureText(line).width);
    const bubbleW = Math.min(maxBubble, Math.max(54, ...textWidths) + 26);
    const avatarXMsg = screenX + 30;
    const bubbleX = isMe ? screenX + screenW - 22 - bubbleW : avatarXMsg + avatarSize + 8;
    const avatarYMsg = y + rowH - avatarSize - 7;
    const bubbleY = y + (currentConfig.scene !== "daily" && !isMe && !grouped ? 17 : 0);

    if (!isMe) {
      if (!grouped) {
        ctx.fillStyle = message.speaker.color || "#4f5bd5";
        ctx.beginPath();
        ctx.arc(avatarXMsg + 15, avatarYMsg + 15, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.68)";
        ctx.beginPath();
        ctx.arc(avatarXMsg + 21, avatarYMsg + 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!grouped) {
        ctx.fillStyle = "#787d88";
        ctx.font = `760 13px ${fontFamily}`;
        ctx.fillText(displayName(message.speaker), bubbleX + 8, y + 10);
      }
    }

    roundRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 20);
    if (isMe) {
      ctx.fillStyle = "#3478f6";
      ctx.fill();
    } else {
      ctx.fillStyle = "#f0f1f3";
      ctx.fill();
    }

    ctx.fillStyle = isMe ? "#ffffff" : "#17181d";
    ctx.font = `17px ${fontFamily}`;
    drawText(ctx, lines, bubbleX + 13, bubbleY + 25, 24);

    if (isMe && index === Math.min(3, currentMessages.length - 1)) {
      ctx.fillStyle = "#f1f1f2";
      roundRect(ctx, bubbleX + 12, bubbleY + bubbleH - 3, 66, 21, 11);
      ctx.fill();
      ["#ddb36f", "#a2754c", "#ffc400"].forEach((color, itemIndex) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(bubbleX + 25 + itemIndex * 14, bubbleY + bubbleH + 8, 6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#5c5f68";
      ctx.font = `850 11px ${fontFamily}`;
      ctx.fillText("3", bubbleX + 66, bubbleY + bubbleH + 12);
    }

    y += rowH + 8;
  });

  const seen = currentConfig.scene === "group" || currentConfig.scene === "work"
    ? `${currentConfig.participants.filter((person) => person.side !== "me").map((person) => person.name).slice(0, 2).join(", ")} +3 ${data.units.seen}`
    : data.units.seen;
  ctx.fillStyle = "#8d919b";
  ctx.font = `760 13px ${fontFamily}`;
  const seenWidth = measure.measureText(seen).width;
  ctx.fillText(seen, screenX + screenW - 24 - seenWidth, y + 5);

  const composerY = height - framePad - composerH;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(screenX, composerY, screenW, composerH);

  ctx.fillStyle = "#009dff";
  ctx.beginPath();
  ctx.arc(screenX + 34, composerY + 34, 17, 0, Math.PI * 2);
  ctx.fill();
  drawCameraIcon(ctx, screenX + 20, composerY + 20, 28, "#ffffff");

  ctx.fillStyle = "#f6f7f9";
  roundRect(ctx, screenX + 64, composerY + 14, screenW - 178, 40, 20);
  ctx.fill();
  ctx.strokeStyle = "#e6e8ee";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "#8f929a";
  ctx.font = `15px ${fontFamily}`;
  ctx.fillText(data.ui.composerPlaceholder, screenX + 80, composerY + 39);

  drawVoiceIcon(ctx, screenX + screenW - 118, composerY + 20, 26);
  drawImageIcon(ctx, screenX + screenW - 82, composerY + 20, 26);
  drawStickerIcon(ctx, screenX + screenW - 46, composerY + 20, 26);

  ctx.restore();
  return canvas;
}

async function downloadPng() {
  if (!currentMessages.length) generatePreview();
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = await renderCanvas();
  const safeName = shortTitle(currentConfig.topic || "dm").replace(/[\\/:*?"<>|]/g, "");
  const styleSuffix = currentConfig.styleMode === "wechat" ? "wechat-chat" : "instagram-dm";
  const filename = `${safeName || "dm"}-${styleSuffix}.png`;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    document.body.append(link);
    link.click();
    URL.revokeObjectURL(link.href);
    link.remove();
    setStatus(locale().units.exported);
  }, "image/png");
}

function refreshByInput() {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    if (els.topic.value.trim()) generatePreview();
  }, 450);
}

function bindEvents() {
  els.language.addEventListener("change", () => {
    applyI18n();
    generatePreview();
  });
  els.generate.addEventListener("click", generateConversation);
  els.copy.addEventListener("click", copyScript);
  els.download.addEventListener("click", downloadPng);
  els.topic.addEventListener("input", refreshByInput);
  els.topic.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      generateConversation();
    }
  });
  els.scene.addEventListener("change", generatePreview);
  els.style.addEventListener("change", renderAll);
  els.script.addEventListener("input", (event) => {
    const editor = event.target.closest("#scriptEditor");
    if (editor) updateMessageFromEditor(editor);
  });
  els.rounds.addEventListener("input", () => {
    renderCount();
    generatePreview();
  });
  document.querySelectorAll('input[name="tone"]').forEach((input) => {
    input.addEventListener("change", generatePreview);
  });
}

applyI18n({ preserveTopic: false });
bindEvents();
generatePreview();
