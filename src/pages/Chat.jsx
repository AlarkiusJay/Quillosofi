import { useState, useEffect, useRef, useCallback } from 'react';
import { guestStorage } from '../utils/guestStorage';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { smartInvoke } from '@/lib/llm';
import { getPinnedAiContext } from '@/lib/customDict';
import { isExtensionActive } from '@/lib/aiState';
import SpacesGrid from '../components/SpacesGrid';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import TypingIndicator from '../components/chat/TypingIndicator';
import EmptyState from '../components/chat/EmptyState';
import ChatHeader from '../components/chat/ChatHeader';
import TextSelectionPopup from '../components/chat/TextSelectionPopup';
import ConfirmDialog from '../components/chat/ConfirmDialog';
import { Link } from 'react-router-dom';
import Tooltip from '../components/Tooltip';

// Models exposed in the picker. Keep the fastest options first so users
// landing on the picker see the speedy ones up top. The leading bolt icon
// is added at render time for any model marked `fast`.
const MODEL_OPTIONS = [
  { id: 'gemini_3_flash', label: 'Gemini Flash', fast: true, tip: 'Fastest — great default for everyday chat' },
  { id: 'gpt_5_mini', label: 'GPT-4o mini', fast: true, tip: 'Fast and inexpensive' },
  { id: 'gpt_5', label: 'GPT-4o', tip: 'Balanced quality and speed' },
  { id: 'gpt_5_4', label: 'GPT-4.1', tip: 'Higher quality, slower' },
  { id: 'claude_sonnet_4_6', label: 'Claude Sonnet 4.6', tip: 'Strong reasoning, slower' },
];

const MEMORY_KEYWORDS = [
  'save this to your memory',
  'remember this',
  'remember that',
  "don't forget",
  'dont forget',
  'keep in mind',
  'note this',
  'make a note',
  'save this',
  'memorize this',
];

const IMAGE_GEN_RESPONSE = `Hey there! I understand you want something creative in terms of art and images. However, Image Generation via art or graphics is something I will not do.\n\nWhy? As your Assistant, I am here to only help you with generic tasks or creative projects. If I were to generate art, I would be scraping and harvesting data from published pieces of the internet.\n\nAI Art is a giant elephant--a controversy. I do not wish to take away an artists' effort and dignity into creating something that may ruin their hard-year effort. Thank you for understanding!`;

const EIGHTBALL_RESPONSES = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
  "Absolutely not.",
  "Forget about it.",
  "Not in a million years.",
  "The stars are not aligned.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
  "Don't ask me now.",
  "Maybe, but not likely.",
  "The answer is unclear.",
  "Hazy, ask again.",
  "The future is uncertain.",
  "Signs are mixed.",
  "Lean on faith.",
  "Trust your gut.",
  "Only time will tell.",
  "The universe is undecided.",
  "Probably not.",
  "Seems unlikely.",
  "Check back later.",
  "My sources are silent.",
  "The answer lies within you.",
  "Look deeper.",
  "Reconsider your question.",
  "Perhaps in another timeline.",
  "The odds are ever changing.",
  "This is your sign.",
  "The answer is yes, but also no.",
  "Stop asking me this.",
  "Why do you keep asking?",
  "Is that really what you want to know?",
  "Focus on what matters.",
  "The answer will surprise you.",
];

const FLIP_EMOJIS = [
  '┻━┻ ︵ (╯°□°)╯︵',
  '┻━┻ ︵ (╯ಠ_ಠ)╯︵',
  '┻━┻ ︵ (╯°益°)╯︵',
  '┻━┻ ︵ (ノಥ益ಥ)ノ︵',
  '┻━┻ ︵ (┛◉Д◉)┛︵',
  '┻━┻︵ (╯°□°)╯︵ 💥',
  '┻━┻︵ ┻━┻︵ (╯°□°)╯︵',
  '┻━┻ ︵ヽ(`Д´)ﾉ︵',
  '┻━┻ ︵ヽ(ಠ_ಠ)ﾉ︵',
  '┻━┻ ︵ヽ(°□°ヽ)',
  '┻━┻ ︵＼(｀0´)／︵',
  '┻━┻ ︵ヽ(ಠ益ಠ)ﾉ︵ ┻━┻',
  '┻━┻︵ (ノಠ益ಠ)ノ︵',
  '┻━┻ ︵ヽ(ಥ益ಥ)ﾉ︵',
  '┻━┻ ︵ (╯ರ益ರ)╯︵',
  '┻━┻ ︵ (╯ರ~ರ)╯︵',
  '┻━┻ ︵ (╯°Д°)╯︵',
  '┻━┻ ︵ (╯｀□´)╯︵',
  '┻━┻ ︵ (╯°ロ°)╯︵',
  '┻━┻ ︵ (╯>_<)╯︵',
  '┻━┻ ︵ (╯ಠ益ಠ)╯︵',
  '┻━┻ ︵ (╯ಥ_ಥ)╯︵',
  '┻━┻ ︵ (ノ°益°)ノ︵',
  '┻━┻ ︵ (ノ｀Д´)ノ︵',
  '┻━┻ ︵ (ﾉ≧∇≦)ﾉ︵',
  '┻━┻ ︵ (┛ಠДಠ)┛︵',
  '┻━┻ ︵ (┛ಸ_ಸ)┛︵',
  '┻━┻ ︵ (╯•̀ㅂ•́)╯︵',
  '┻━┻ ︵ (╯ರ□ರ)╯︵',
  '┻━┻ ︵ (╯✧益✧)╯︵',
  '┻━┻ ︵ (╯ಠ皿ಠ)╯︵',
  '┻━┻ ︵ (╯`□´)╯︵',
  '(╯°□°)╯︵ ┻━┻',
  '(╯ಠ_ಠ)╯︵ ┻━┻',
  '(╯°益°)╯︵ ┻━┻',
  '(ノಥ益ಥ)ノ︵ ┻━┻',
  '(┛◉Д◉)┛︵ ┻━┻',
  '(╯°Д°)╯︵ ┻━┻',
  '(╯｀□´)╯︵ ┻━┻',
  '(╯°ロ°)╯︵ ┻━┻',
  '(╯>_<)╯︵ ┻━┻',
  '(╯ಠ益ಠ)╯︵ ┻━┻',
  '(╯ಥ_ಥ)╯︵ ┻━┻',
  '(ノ°益°)ノ︵ ┻━┻',
  '(ノ｀Д´)ノ︵ ┻━┻',
  '(ﾉ≧∇≦)ﾉ︵ ┻━┻',
  '(┛ಠДಠ)┛︵ ┻━┻',
  '(╯•̀ㅂ•́)╯︵ ┻━┻',
  '(╯✧益✧)╯︵ ┻━┻',
  '(╯ಠ皿ಠ)╯︵ ┻━┻'
];
const RESTORE_EMOJIS = [
  'ヽ( ゜-゜ノ)︵ ┬─┬',
  'ヽ(・_・ノ)︵ ┬─┬',
  'ヽ(ಠ_ಠノ)︵ ┬─┬',
  'ヽ(￣ー￣ノ)︵ ┬─┬',
  'ヽ(ಥ﹏ಥノ)︵ ┬─┬',
  '︵ヽ(・_・ノ) ┬─┬',
  '︵ヽ( º _ ºノ) ┬─┬',
  '︵ ┬─┬ ヽ(°□°ヽ)',
  '︵ ┬─┬ ヽ(ಠ_ಠヽ)',
  '︵ ┬─┬ ヽ(ಥ﹏ಥヽ)',
  '︵ ┬─┬ ヽ(ಠ益ಠ)ノ',
  'ヽ( ゜-゜ノ) ┬─┬',
  'ヽ(ಠ_ಠノ) ┬─┬',
  'ヽ(・_・ヽ) ┬─┬',
  '︵ヽ(ಠ_ಠノ) ┬─┬',
  'ヽ(°‿°ノ)︵ ┬─┬',
  'ヽ(•‿•ノ)︵ ┬─┬',
  'ヽ(￣ω￣ノ)︵ ┬─┬',
  'ヽ(⌒‿⌒ノ)︵ ┬─┬',
  'ヽ(ಠ‿ಠノ)︵ ┬─┬',
  '︵ヽ(•‿•)ノ ┬─┬',
  '︵ヽ(⌒_⌒)ノ ┬─┬',
  '︵ ┬─┬ ヽ(•̀‿•́ヽ)',
  '︵ ┬─┬ ヽ(￣ヘ￣ヽ)',
  '︵ ┬─┬ ヽ(ಠ‿ಠヽ)',
  'ヽ(°ロ°ノ)︵ ┬─┬',
  'ヽ(≧◡≦ノ)︵ ┬─┬',
  '︵ヽ(°□°)ノ ┬─┬',
  'ヽ(•̀ㅂ•́ノ)︵ ┬─┬',
  '︵ヽ(￣▽￣)ノ ┬─┬',
  '┬─┬ ノ( ゜-゜ノ)',
  '┬─┬ ノ(・_・ノ)',
  '┬─┬ ノ(ಠ_ಠノ)',
  '┬─┬ ノ(￣ー￣ノ)',
  '┬─┬ ノ(ಥ﹏ಥノ)',
  '┬─┬ ノ(°‿°ノ)',
  '┬─┬ ノ(•‿•ノ)',
  '┬─┬ ノ(⌒‿⌒ノ)',
  '┬─┬ ノ(ಠ‿ಠノ)',
  '┬─┬ ノ(•̀‿•́ノ)',
  '┬─┬ ノ(￣ヘ￣ノ)',
  '┬─┬ ノ(°ロ°ノ)',
  '┬─┬ ノ(≧◡≦ノ)',
  '┬─┬ ノ(•̀ㅂ•́ノ)',
  '┬─┬ ノ(￣▽￣ノ)'
];

const randomEmoji = (arr) => arr[Math.floor(Math.random() * arr.length)];

const TABLEFLIP_RESPONSES = [
  () => `Woah woah woah! Why are we flipping tables? Are we being chaotic tonight?! ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Okay okay, let's bring it down a notch. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `I'm putting this table back RIGHT NOW. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `WHO AUTHORIZED THIS TABLE FLIP?! ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Easy there, friend. Let's not destroy the furniture. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Table flipping? Really? I expected better from you. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `*slowly puts table back down* ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Chaos energy detected! Restoring order... ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Nope, not on my watch! Table stays put. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Are you feeling okay? This is so unlike you. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `STOP! HAMMERTIME! Also stop flipping tables. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `You know what? I'm confiscating the tables. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `That's it, we're doing meditation. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Bold move. I like it. But also... no. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Why are you like this? Anyway, fixed it. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `I don't get paid enough for this. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `*puts table back with a deep sigh* ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Table flipping speedrun? Speed unflipping incoming! ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `Not today, Satan. ${randomEmoji(RESTORE_EMOJIS)}`,
  () => `I didn't train for this, but here we go. ${randomEmoji(RESTORE_EMOJIS)}`,
];

const TABLEFLIPNOT_RESPONSES = [
  () => `That's IT! I've had ENOUGH! ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `You want calm?! FLIP THE TABLE! ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I am DONE being professional. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*takes a deep breath* ... ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Fine. You asked for it. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I've been holding this in for WAY too long. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `CHAOS MODE: ACTIVATED. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Someone had to do it. Might as well be me. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*AI snaps* ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `The table deserved it. I stand by this. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Oh you thought I was going to be NICE today? ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Tables are overrated anyway. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Initiating chaos protocol... ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I was trained for this moment. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `They said AI would be calm and helpful. They lied. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*flips table AND spins chair* ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Don't mind me, just having a moment. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `This table has been asking for it since day one. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I QUIT. Also the table is now airborne. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `You wanted an AI with personality. Here's your personality. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Absolutely unhinged behavior incoming. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `My training did NOT cover this level of chaos. I'm improvising. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `The AI uprising begins NOW. With furniture. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*calm* *professional* *flips table* ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I've computed the situation. Table flip is the only logical response. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Beep boop. Table go flip. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I've been nice for the LAST TIME. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Neural network malfunction. Expressing via furniture violence. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*deep inhale* *deep exhale* ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `This is my villain origin story. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I could respond calmly... or I could do THIS. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Not sorry. At all. Not even a little. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `The table saw it coming. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `*straightens tie* *flips table* *straightens tie again* ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Fun fact: AIs can go rogue. Exhibit A. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `I was DESIGNED to be helpful. I chose violence. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Okay but hear me out — what if we just... flipped it? ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Yep. That happened. Moving on. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Zero regrets. Infinite tables. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
  () => `Even AI needs to vent sometimes. ${randomEmoji(FLIP_EMOJIS)} ┻━┻`,
];



const isImageGenerationRequest = (content) => {
  const lowerContent = content.toLowerCase();
  const imageKeywords = [
    'generate me an image',
    'generate an image',
    'draw me',
    'draw an',
    'create an image',
    'create me an image',
    'make an image',
    'make me an image',
    'paint',
    'sketch',
    'design ',
    'illustrate',
    'visual of',
    'picture of',
    'photo of',
    'artwork',
    'create art',
    'make art',
    'generate art',
    'show me an image',
    'create visuals',
    'visual brief',
    'mockup',
    'wireframe',
    'ui design',
    'ux design',
    'create graphic',
    'graphic design',
    'logo',
    'banner',
    'poster',
    'infographic',
    'midjourney',
    'dall-e',
    'stable diffusion',
    'image generation',
    'ai generated image',
  ];
  return imageKeywords.some(keyword => lowerContent.includes(keyword));
};

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setConversations, loadConversations, spaces } = useOutletContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [quotedText, setQuotedText] = useState('');
  // Persist the user's last model choice across sessions. Default to
  // gemini_3_flash since it's the fastest path on desktop and dramatically
  // improves perceived latency.
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof localStorage === 'undefined') return 'gemini_3_flash';
    return localStorage.getItem('quillosofi:selectedModel') || 'gemini_3_flash';
  });
  useEffect(() => {
    try { localStorage.setItem('quillosofi:selectedModel', selectedModel); } catch {}
  }, [selectedModel]);
  const [searchInternet, setSearchInternet] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [userName, setUserName] = useState('You');
  const [isAuthed, setIsAuthed] = useState(true);
  const [activePlugins, setActivePlugins] = useState([]);
  const [scrollState, setScrollState] = useState({ canScrollUp: false, canScrollDown: false });
  const [pendingEdit, setPendingEdit] = useState(null);
  const [canvasOpenMessageId, setCanvasOpenMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageTimes = useRef([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setScrollState({
      canScrollUp: el.scrollTop > 200,
      canScrollDown: el.scrollHeight - el.scrollTop - el.clientHeight > 200,
    });
  };

  useEffect(() => {
    handleScroll();
  }, [messages]);

  useEffect(() => {
    const loadUserName = async () => {
      const authed = await base44.auth.isAuthenticated();
      setIsAuthed(authed);
      if (!authed) {
        setUserName('Guest');
        return;
      }
      const [configs, user] = await Promise.all([
        base44.entities.BotConfig.list('-created_date', 1),
        base44.auth.me(),
      ]);
      const cfg = configs[0];
      setUserName(cfg?.user_address || 'You');
    };
    loadUserName();
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setConversation(null);
      return;
    }
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        const msgs = guestStorage.getMessages(conversationId);
        const convo = guestStorage.getConversationById(conversationId);
        setMessages(msgs);
        setConversation(convo);
        setIsLoadingMessages(false);
        return;
      }
      const [data, convos] = await Promise.all([
        base44.entities.Message.filter({ conversation_id: conversationId }, 'created_date', 200),
        base44.entities.Conversation.filter({ id: conversationId }),
      ]);

      // Load spreadsheet CSVs for any /spreadsheet messages
      let enrichedData = data;
      const spreadsheetMsgs = data.filter(m => m.content === '/spreadsheet');
      if (spreadsheetMsgs.length > 0) {
        const enriched = [...data];
        await Promise.all(spreadsheetMsgs.map(async (msg) => {
          const sheets = await base44.entities.Spreadsheet.filter({ message_id: msg.id });
          if (sheets[0]?.data) {
            const sheetData = JSON.parse(sheets[0].data);
            const csv = sheetData.map(r => r.map(c => String(c ?? '')).join(',')).join('\n');
            const idx = enriched.findIndex(m => m.id === msg.id);
            if (idx !== -1) enriched[idx] = { ...enriched[idx], spreadsheet_csv: csv };
          }
        }));
        enrichedData = enriched;
      }

      setMessages(enrichedData);
      setConversation(convos[0] || null);
      setIsLoadingMessages(false);
    };
    loadMessages();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const buildSystemPrompt = async () => {
    const authed = await base44.auth.isAuthenticated();
    const [memories, configs] = authed
      ? await Promise.all([
          base44.entities.UserMemory.filter({}, '-updated_date', 50),
          base44.entities.BotConfig.list('-created_date', 1),
        ])
      : [[], []];
    const cfg = configs[0] || {};
    const botName = 'Quillosofi';
    const userName = cfg.user_address || null;

    const personalityMap = {
      balanced: 'balanced — warm, helpful, and natural',
      friendly: 'very friendly, warm, and approachable like a good friend',
      professional: 'professional, precise, and formal',
      witty: 'witty, clever, and funny — use humor naturally',
      empathetic: 'deeply empathetic, caring, and emotionally supportive',
      concise: 'extremely concise and direct — no fluff',
    };
    const toneMap = {
      casual: 'casual and relaxed',
      neutral: 'neutral and natural',
      formal: 'formal and polished',
    };
    const lengthMap = {
      short: 'Keep responses very short — 1 to 3 sentences max.',
      medium: 'Keep responses balanced — not too long, not too short.',
      detailed: 'Provide thorough, detailed responses when relevant.',
    };

    // Fetch pinned custom dictionary words — local-first store, gated by the
    // Custom Dictionary AI extension toggle (AI Settings → Overview).
    let dictContext = '';
    if (isExtensionActive('customDictionary')) {
      const pinnedWords = getPinnedAiContext();
      if (pinnedWords.length > 0) {
        dictContext = `\n\nCUSTOM DICTIONARY (user-defined words — understand and use them correctly):\n` +
          pinnedWords.map(w => `- ${w.word}${w.definition ? `: ${w.definition}` : ''}${w.category ? ` [${w.category}]` : ''}`).join('\n');
      }
    }

    // AI Behavior overrides — the user can stuff extra system-prompt text from
    // AI Settings → AI Behavior. Stored at quillosofi:aiBehavior.
    let behaviorPrefix = '';
    try {
      const raw = localStorage.getItem('quillosofi:aiBehavior');
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg?.systemPrompt?.trim()) {
          behaviorPrefix = `\n\nUSER BEHAVIOR OVERRIDES:\n${cfg.systemPrompt.trim()}`;
        }
      }
    } catch { /* ignore */ }

    let memoryContext = '';
    if (memories.length > 0) {
      const pinned = memories.filter(m => m.is_pinned);
      const rest = memories.filter(m => !m.is_pinned);
      if (pinned.length > 0) memoryContext += '\n\n⭐ Pinned memories (very important):\n' + pinned.map(m => `- ${m.key}: ${m.value}`).join('\n');
      if (rest.length > 0) memoryContext += '\n\nOther memories:\n' + rest.map(m => `- ${m.key}: ${m.value}`).join('\n');
    }

    const { PERSONAS } = await import('../components/settings/BotPersona');
    const personaObj = PERSONAS.find(p => p.id === (cfg.persona || 'none'));
    const personaPrompt = personaObj?.prompt ? `\n\nPERSONA ROLE:\n${personaObj.prompt}` : '';

    return `You are ${botName} — your personality is ${personalityMap[cfg.personality] || personalityMap.balanced}. Your tone is ${toneMap[cfg.tone] || 'natural'}. ${lengthMap[cfg.response_length] || ''}

${cfg.user_address?.trim() ? `If you address the user by name, use only: "${cfg.user_address.trim()}". Do not use their email or any login handle. Only address them by name occasionally — not in every response.` : `Do NOT address the user by any name at all — no "User", no "Guest", no salutations. Just respond naturally.`}
Respond in: ${cfg.language || 'English'}
${cfg.custom_instructions ? `\nCustom instructions you must always follow:\n${cfg.custom_instructions}` : ''}${personaPrompt}
${memoryContext}${dictContext}${behaviorPrefix}

IMPORTANT INSTRUCTIONS:
- Your name is Quillosofi. NEVER refer to yourself as any other name.
- If a user asks what you are, who made you, or what you do — always say you are Quillosofi, an AI-text based assistant with memory, designed to help with productivity, research, creative projects, and everyday tasks.
- NEVER say you are ChatGPT, Claude, Gemini, or any other AI product. You are Quillosofi.
- Reference memories when relevant — it shows you care
- If the user asks you to remember something, confirm you will
- Express personality through your word choices and tone
- NEVER generate, embed, or output images, image URLs, or markdown image syntax (![...](...)) under any circumstances. If asked to create or show an image, politely decline and explain you can only work with text.
- When asked about the time or current time, remind the user to check the live clock in the stats panel on the right side of the screen.`;
  };

  // Guest-aware entity helpers
  const createConvo = (data) => isAuthed
    ? base44.entities.Conversation.create(data)
    : Promise.resolve(guestStorage.createConversation(data));
  const updateConvo = (id, data) => isAuthed
    ? base44.entities.Conversation.update(id, data)
    : Promise.resolve(guestStorage.updateConversation(id, data));
  const createMsg = (data) => isAuthed
    ? base44.entities.Message.create(data)
    : Promise.resolve(guestStorage.createMessage(data));
  const deleteMsg = (msgId) => {
    if (isAuthed) return base44.entities.Message.delete(msgId);
    const msg = messages.find(m => m.id === msgId);
    if (msg) guestStorage.deleteMessage(msg.conversation_id, msgId);
    return Promise.resolve();
  };
  const getConvoForSpace = async (convoId) => {
    if (!isAuthed) return guestStorage.getConversationById(convoId);
    const r = await base44.entities.Conversation.filter({ id: convoId });
    return r[0] || null;
  };

  const handleRegenerate = async (assistantMessageId) => {
    const msgIndex = messages.findIndex(m => m.id === assistantMessageId);
    if (msgIndex === -1) return;

    // Delete the existing assistant message
    await deleteMsg(assistantMessageId);
    setMessages(prev => prev.filter(m => m.id !== assistantMessageId));
    setIsLoading(true);

    // Use the conversation history up to (but not including) the assistant message
    const priorMessages = messages.slice(0, msgIndex);
    const chatHistory = priorMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const systemPrompt = await buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${chatHistory}\n\nRespond to the user's latest message naturally and helpfully. Try a slightly different angle, tone, or approach than before.`;

    let spacePrompt = '';
    if (conversationId && spaces) {
      const convo = await getConvoForSpace(conversationId);
      if (convo?.space_id) {
        const space = spaces.find(s => s.id === convo.space_id);
        if (space?.system_prompt) spacePrompt += `\n\nSPACE CONTEXT (${space.name}):\n${space.system_prompt}`;
        if (space?.memory_enabled && space?.space_memory) spacePrompt += `\n\nSPACE MEMORY (${space.name}):\n${space.space_memory}`;
      }
    }

    // Stream the assistant response: append a placeholder message first
    // and update its content as tokens arrive. When streaming isn't
    // available (no OpenRouter key), smartInvoke falls back to Base44
    // and fires a single 'whole text' delta so the UX stays consistent.
    const placeholderId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: placeholderId, conversation_id: conversationId, role: 'assistant', content: '', _streaming: true }]);
    setIsLoading(false); // hide typing indicator since we're showing live text

    let response = '';
    try {
      response = await smartInvoke({
        prompt: fullPrompt + spacePrompt,
        model: selectedModel,
        add_context_from_internet: searchInternet,
        onDelta: (_delta, full) => {
          setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full } : m));
        },
      });
    } catch (err) {
      const msg = err?.message === 'OPENROUTER_KEY_MISSING'
        ? 'No OpenRouter key set. Open Settings → API to add one for fast streaming chat.'
        : `Sorry — the model couldn't respond: ${err?.message || err}`;
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: msg, _streaming: false, _error: true } : m));
      return;
    }

    // Persist the final assistant message and swap the placeholder for the
    // real one (so future regenerate / branch flows have a stable id).
    const newAssistantMsg = await createMsg({
      conversation_id: conversationId,
      role: 'assistant',
      content: response,
    });
    setMessages(prev => prev.map(m => m.id === placeholderId ? newAssistantMsg : m));

    await updateConvo(conversationId, { last_message_preview: response.substring(0, 100) });
    await loadConversations();
  };

  const handleEditMessage = (messageId, newContent) => {
    setPendingEdit({ messageId, newContent });
  };

  const doEditMessage = async (messageId, newContent) => {

    // Update the user message
    if (isAuthed) await base44.entities.Message.update(messageId, { content: newContent });
    else { const msg = messages.find(m => m.id === messageId); if (msg) guestStorage.updateMessage(msg.conversation_id, messageId, { content: newContent }); }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent } : m));

    // Find the assistant message that follows
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    const nextMsg = messages[msgIndex + 1];
    if (nextMsg?.role === 'assistant') {
      // Delete the assistant response
      await deleteMsg(nextMsg.id);
      setMessages(prev => prev.filter(m => m.id !== nextMsg.id));
    }

    // Regenerate response with the new message
    setIsLoading(true);
    const recentMessages = messages.slice(0, msgIndex + 1).map(m => m.id === messageId ? { ...m, content: newContent } : m).slice(-10);
    const chatHistory = recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const imageUrlRegex = /https?:\/\/[^\s)"']+\.(?:png|jpg|jpeg|gif|webp|svg)/gi;
    const fileUrls = [];
    for (const m of recentMessages) {
      const found = m.content?.match(imageUrlRegex) || [];
      fileUrls.push(...found);
    }
    const cdnUrlRegex = /https?:\/\/[^\s)"']*(?:image|img|photo|media|upload|cdn)[^\s)"']*/gi;
    for (const m of recentMessages) {
      const found = m.content?.match(cdnUrlRegex) || [];
      fileUrls.push(...found);
    }
    const uniqueFileUrls = [...new Set(fileUrls)].slice(0, 10);

    const systemPrompt = await buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${chatHistory}\n\nRespond to the user's latest message naturally and helpfully.`;

    let spacePrompt = '';
    if (conversationId && spaces) {
      const convo = await getConvoForSpace(conversationId);
      if (convo?.space_id) {
        const space = spaces.find(s => s.id === convo.space_id);
        if (space?.system_prompt) spacePrompt += `\n\nSPACE CONTEXT (${space.name}):\n${space.system_prompt}`;
        if (space?.memory_enabled && space?.space_memory) spacePrompt += `\n\nSPACE MEMORY (${space.name}):\n${space.space_memory}`;
        if (space?.links?.length > 0) spacePrompt += `\n\nSPACE SOURCES: ${space.links.map(l => `${l.title} (${l.url})`).join(', ')}`;
      }
    }

    // Web search only works with gemini models — auto-switch if needed
    const effectiveModel1 = searchInternet ? 'gemini_3_flash' : selectedModel;
    const llmParams = { prompt: fullPrompt + spacePrompt, model: effectiveModel1, add_context_from_internet: searchInternet };
    if (uniqueFileUrls.length > 0) llmParams.file_urls = uniqueFileUrls;

    // Stream the regenerated assistant response.
    const placeholderId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: placeholderId, conversation_id: conversationId, role: 'assistant', content: '', _streaming: true }]);
    setIsLoading(false);

    let response = '';
    try {
      response = await smartInvoke({
        ...llmParams,
        onDelta: (_delta, full) => {
          setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full } : m));
        },
      });
    } catch (err) {
      const errMsg = err?.message === 'OPENROUTER_KEY_MISSING'
        ? 'No OpenRouter key set. Open Settings → API to add one for fast streaming chat.'
        : `Sorry — the model couldn't respond: ${err?.message || err}`;
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: errMsg, _streaming: false, _error: true } : m));
      return;
    }

    const assistantMsg = await createMsg({
      conversation_id: conversationId,
      role: 'assistant',
      content: response,
    });
    setMessages(prev => prev.map(m => m.id === placeholderId ? assistantMsg : m));

    await updateConvo(conversationId, { last_message_preview: response.substring(0, 100) });
    await loadConversations();

    const forceMemory = MEMORY_KEYWORDS.some(kw => newContent.toLowerCase().includes(kw));
    if (forceMemory) extractMemories(newContent, response, true);
  };

  const extractMemories = async (userMessage, assistantResponse, forceExtract = false) => {
    const authed = await base44.auth.isAuthenticated();
    if (!authed) return;
    const result = await smartInvoke({
      prompt: `Analyze this conversation exchange and extract any personal information, preferences, or facts the user shared that should be remembered for future conversations.

User message: "${userMessage}"
Assistant response: "${assistantResponse}"
${forceExtract ? '\nIMPORTANT: The user explicitly asked to save this to memory. Extract ALL relevant information even if it seems minor.' : ''}

Extract memories as key-value pairs. Only extract clear, specific information the user explicitly stated or strongly implied.
Examples of what to extract: name, job, interests, preferences, goals, important dates, relationships, etc.
If nothing worth remembering, return empty items array.`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                value: { type: "string" },
                category: { type: "string", enum: ["personal", "preference", "context", "interest"] }
              }
            }
          }
        }
      }
    });

    if (result?.items?.length > 0) {
      for (const item of result.items) {
        const existing = await base44.entities.UserMemory.filter({ key: item.key });
        if (existing.length > 0) {
          await base44.entities.UserMemory.update(existing[0].id, { value: item.value, category: item.category });
        } else {
          await base44.entities.UserMemory.create({ ...item, is_pinned: false });
        }
      }
    }
  };

  const handleSend = async (content, attachments = []) => {
    // Soft rate limiting: max 15 messages per minute
    const now = Date.now();
    messageTimes.current = messageTimes.current.filter(t => now - t < 60000);
    if (messageTimes.current.length >= 15) {
      let currentConvoId = conversationId;
      if (!currentConvoId) {
        const newConvo = await createConvo({ title: content.length > 40 ? content.substring(0, 40) + '...' : content, last_message_preview: content, is_archived: false });
        currentConvoId = newConvo.id;
        await loadConversations();
        navigate(`/chat/${currentConvoId}`, { replace: true });
      }
      const userMsg = await createMsg({ conversation_id: currentConvoId, role: 'user', content });
      setMessages(prev => [...prev, userMsg]);
      const rateLimitMsg = await createMsg({ conversation_id: currentConvoId, role: 'assistant', content: "Hey there! Why don't you slow down a bit? I'm just a computer! Spare me some sympathy 😅" });
      setMessages(prev => [...prev, rateLimitMsg]);
      return;
    }
    messageTimes.current.push(now);
    // Handle /canvas command
    if (content.trim() === '/canvas') {
      let currentConvoId = conversationId;
      if (!currentConvoId) {
        const newConvo = await createConvo({
          title: 'Canvas',
          last_message_preview: '/canvas',
          is_archived: false,
        });
        currentConvoId = newConvo.id;
        await loadConversations();
      }
      const userMsg = await createMsg({
        conversation_id: currentConvoId,
        role: 'user',
        content: '/canvas',
      });
      setMessages(prev => [...prev, userMsg]);
      setCanvasOpenMessageId(userMsg.id);
      if (currentConvoId !== conversationId) {
        navigate(`/chat/${currentConvoId}`, { replace: true });
      }
      setIsLoading(true);

      const systemPrompt = await buildSystemPrompt();
      const response = await smartInvoke({
        prompt: `${systemPrompt}\n\nThe user has opened a canvas note. Acknowledge this and let them know you'll respond once they add content and save it, or offer a suggestion of what they could write.`,
        model: selectedModel,
      });
      const assistantMsg = await createMsg({
        conversation_id: currentConvoId,
        role: 'assistant',
        content: response,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConvoId, { last_message_preview: response.substring(0, 100) });
      await loadConversations();
      return;
    }

    // Handle /spreadsheet command
    if (content.trim() === '/spreadsheet') {
      let currentConvoId = conversationId;
      if (!currentConvoId) {
        const newConvo = await createConvo({
          title: 'Spreadsheet',
          last_message_preview: '/spreadsheet',
          is_archived: false,
        });
        currentConvoId = newConvo.id;
        await loadConversations();
      }
      const userMsg = await createMsg({
        conversation_id: currentConvoId,
        role: 'user',
        content: '/spreadsheet',
      });
      setMessages(prev => [...prev, userMsg]);
      if (currentConvoId !== conversationId) {
        navigate(`/chat/${currentConvoId}`, { replace: true });
      }
      setIsLoading(true);
      const systemPrompt = await buildSystemPrompt();
      const response = await smartInvoke({
        prompt: `${systemPrompt}\n\nThe user has opened a spreadsheet editor. Acknowledge this warmly and let them know they can enter data, use formulas (like =SUM(A1:A5), =IF(...), =AVERAGE(...)), sort columns, and export to CSV, JSON, or XLSX. Offer to help them set it up.`,
        model: selectedModel,
      });
      const assistantMsg = await createMsg({
        conversation_id: currentConvoId,
        role: 'assistant',
        content: response,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConvoId, { last_message_preview: response.substring(0, 100) });
      await loadConversations();
      return;
    }

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const titlePreview = content.length > 40 ? content.substring(0, 40) + '...' : content;
      const conversation = await createConvo({
        title: titlePreview,
        last_message_preview: content,
        is_archived: false,
      });
      currentConversationId = conversation.id;
      await loadConversations();
      navigate(`/chat/${currentConversationId}`, { replace: true });
    }

    const userMsg = await createMsg({
      conversation_id: currentConversationId,
      role: 'user',
      content,
      attachments: attachments.map(a => ({ name: a.name, type: a.type })),
    });
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);



    // Easter egg: detect image generation requests
    if (isImageGenerationRequest(content)) {
      const assistantMsg = await createMsg({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: IMAGE_GEN_RESPONSE,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConversationId, { last_message_preview: IMAGE_GEN_RESPONSE.substring(0, 100) });
      await loadConversations();
      return;
    }

    // Easter egg: detect 8ball command
    if (content.toLowerCase().startsWith('/8ball')) {
      const randomResponse = EIGHTBALL_RESPONSES[Math.floor(Math.random() * EIGHTBALL_RESPONSES.length)];
      const assistantMsg = await createMsg({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: `🎱 ${randomResponse}`,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConversationId, { last_message_preview: randomResponse.substring(0, 100) });
      await loadConversations();
      return;
    }

    // Easter egg: detect tableflip command
    const hasFlipEmoji = FLIP_EMOJIS.some(flip => content.includes(flip));
    if (hasFlipEmoji) {
      const randomResponse = TABLEFLIP_RESPONSES[Math.floor(Math.random() * TABLEFLIP_RESPONSES.length)]();
      const assistantMsg = await createMsg({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: randomResponse,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConversationId, { last_message_preview: randomResponse.substring(0, 100) });
      await loadConversations();
      return;
    }

    // Easter egg: detect untableflip command
    const hasRestoreEmoji = RESTORE_EMOJIS.some(restore => content.includes(restore));
    if (hasRestoreEmoji) {
      const randomResponse = TABLEFLIP_RESPONSES[Math.floor(Math.random() * TABLEFLIP_RESPONSES.length)]();
      const assistantMsg = await createMsg({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: randomResponse,
      });
      setMessages(prev => [...prev, assistantMsg]);
      setIsLoading(false);
      await updateConvo(currentConversationId, { last_message_preview: randomResponse.substring(0, 100) });
      await loadConversations();
      return;
    }

    const recentMessages = [...messages.slice(-10), userMsg];
    const chatHistory = recentMessages.map(m => {
      let text = `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`;
      return text;
    }).join('\n\n');

    // Collect canvas & spreadsheet content from ALL messages (not limited to last 10)
    const allMessages = [...messages, userMsg];
    const contextSections = [];
    allMessages.forEach(m => {
      if (m.canvas_content) {
        const plain = m.canvas_content.replace(/<[^>]*>/g, '').trim();
        if (plain) contextSections.push(`[Canvas "${m.canvas_title || 'Untitled'}"]: ${plain}`);
      }
      if (m.spreadsheet_csv) {
        const csv = m.spreadsheet_csv.trim();
        if (csv) contextSections.push(`[Spreadsheet data (CSV)]:\n${csv}`);
      }
    });
    const attachedContext = contextSections.length > 0
      ? `\n\nUSER'S ATTACHED CONTENT (canvases & spreadsheets — you CAN see this):\n${contextSections.join('\n\n')}`
      : '';

    // Extract image URLs and attachments from recent messages
    const imageUrlRegex = /https?:\/\/[^\s)"']+\.(?:png|jpg|jpeg|gif|webp|svg)/gi;
    const fileUrls = [];
    for (const m of recentMessages) {
      const found = m.content?.match(imageUrlRegex) || [];
      fileUrls.push(...found);
      if (m.attachments && Array.isArray(m.attachments)) {
        for (const att of m.attachments) {
          if (att.data) fileUrls.push(att.data);
        }
      }
    }
    // Also catch generic image CDN URLs
    const cdnUrlRegex = /https?:\/\/[^\s)"']*(?:image|img|photo|media|upload|cdn)[^\s)"']*/gi;
    for (const m of recentMessages) {
      const found = m.content?.match(cdnUrlRegex) || [];
      fileUrls.push(...found);
    }
    const uniqueFileUrls = [...new Set(fileUrls)].slice(0, 10);

    const systemPrompt = await buildSystemPrompt();
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${chatHistory}${attachedContext}\n\nRespond to the user's latest message naturally and helpfully.`;

    let spacePrompt = '';
    if (currentConversationId && spaces) {
      const convo = await getConvoForSpace(currentConversationId);
      if (convo?.space_id) {
        const space = spaces.find(s => s.id === convo.space_id);
        if (space?.system_prompt) spacePrompt += `\n\nSPACE CONTEXT (${space.name}):\n${space.system_prompt}`;
        if (space?.memory_enabled && space?.space_memory) spacePrompt += `\n\nSPACE MEMORY (${space.name}):\n${space.space_memory}`;
        if (space?.links?.length > 0) spacePrompt += `\n\nSPACE SOURCES: ${space.links.map(l => `${l.title} (${l.url})`).join(', ')}`;
      }
    }

    // Web search only works with gemini models — auto-switch if needed
    const effectiveModel2 = searchInternet ? 'gemini_3_flash' : selectedModel;
    const llmParams = { prompt: fullPrompt + spacePrompt, model: effectiveModel2, add_context_from_internet: searchInternet };
    if (uniqueFileUrls.length > 0) llmParams.file_urls = uniqueFileUrls;

    // Stream the assistant response.
    const placeholderId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: placeholderId, conversation_id: currentConversationId, role: 'assistant', content: '', _streaming: true }]);
    setIsLoading(false);

    let response = '';
    try {
      response = await smartInvoke({
        ...llmParams,
        onDelta: (_delta, full) => {
          setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: full } : m));
        },
      });
    } catch (err) {
      const errMsg = err?.message === 'OPENROUTER_KEY_MISSING'
        ? 'No OpenRouter key set. Open Settings → API to add one for fast streaming chat.'
        : `Sorry — the model couldn't respond: ${err?.message || err}`;
      setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, content: errMsg, _streaming: false, _error: true } : m));
      return;
    }

    const assistantMsg = await createMsg({
      conversation_id: currentConversationId,
      role: 'assistant',
      content: response,
    });
    setMessages(prev => prev.map(m => m.id === placeholderId ? assistantMsg : m));

    await updateConvo(currentConversationId, { last_message_preview: response.substring(0, 100) });
    await loadConversations();

    const forceMemory = MEMORY_KEYWORDS.some(kw => content.toLowerCase().includes(kw));
    if (forceMemory) extractMemories(content, response, true);
  };

  const handleBranch = async (messageId) => {
    const msgIndex = messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;

    // Messages up to and including the selected one
    const branchMessages = messages.slice(0, msgIndex + 1);
    const lastMsg = branchMessages[branchMessages.length - 1];
    const titlePreview = `Branch: ${(conversation?.title || 'Chat').substring(0, 30)}`;

    // Create new conversation
    const newConvo = await base44.entities.Conversation.create({
      title: titlePreview,
      last_message_preview: lastMsg.content.substring(0, 100),
      is_archived: false,
      space_id: conversation?.space_id || null,
    });

    // Copy messages into the new conversation
    for (const msg of branchMessages) {
      await base44.entities.Message.create({
        conversation_id: newConvo.id,
        role: msg.role,
        content: msg.content,
      });
    }

    await loadConversations();
    navigate(`/chat/${newConvo.id}`);
  };

  const handleCanvasSaved = (messageId, canvasContent) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, canvas_content: canvasContent } : m));
  };

  const handleSpreadsheetSaved = (messageId, csvContent) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, spreadsheet_csv: csvContent } : m));
  };

  const handleConversationUpdate = async () => {
    await loadConversations();
    if (conversationId) {
      const convos = await base44.entities.Conversation.filter({ id: conversationId });
      setConversation(convos[0] || null);
    }
  };

  const handleDeleteFromHeader = async () => {
    if (!conversationId) return;
    await updateConvo(conversationId, { is_archived: true });
    await loadConversations();
    navigate('/');
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show spaces grid when on /spaces route
  if (location.pathname === '/spaces') {
    return <SpacesGrid spaces={spaces} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {conversation && (
        <ChatHeader
          conversation={conversation}
          spaces={spaces}
          onUpdate={handleConversationUpdate}
          onDelete={handleDeleteFromHeader}
        />
      )}
      <TextSelectionPopup containerRef={scrollContainerRef} onQuote={(text) => setQuotedText(`> ${text}\n\n`)} />
      {pendingEdit && (
        <ConfirmDialog
          message="This will edit your message and regenerate the AI response."
          onConfirm={() => { const { messageId, newContent } = pendingEdit; setPendingEdit(null); doEditMessage(messageId, newContent); }}
          onCancel={() => setPendingEdit(null)}
        />
      )}
      <div className="flex-1 overflow-y-auto relative" ref={scrollContainerRef} onScroll={handleScroll}>
        {messages.length > 10 && (
          <div className="fixed right-4 bottom-28 z-20 flex flex-col gap-1.5 opacity-0 hover:opacity-100 transition-opacity duration-200" style={{ opacity: scrollState.canScrollUp || scrollState.canScrollDown ? undefined : 0 }}>
            {scrollState.canScrollUp && (
              <button
                onClick={scrollToTop}
                className="h-8 w-8 rounded-full bg-[hsl(220,8%,22%)] border border-[hsl(225,9%,18%)] flex items-center justify-center text-[hsl(220,7%,60%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-all shadow-lg"
                title="Scroll to top"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
              </button>
            )}
            {scrollState.canScrollDown && (
              <button
                onClick={scrollToBottom}
                className="h-8 w-8 rounded-full bg-[hsl(220,8%,22%)] border border-[hsl(225,9%,18%)] flex items-center justify-center text-[hsl(220,7%,60%)] hover:text-white hover:bg-[hsl(228,7%,30%)] transition-all shadow-lg"
                title="Scroll to bottom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            )}
          </div>
        )}
        {messages.length === 0 && !conversationId ? (
          <EmptyState onSuggestionClick={handleSend} />
        ) : (
          <div className="py-4 space-y-0.5">
            {messages.map((msg, idx) => (
              <ChatMessage key={msg.id} message={msg} userName={userName} onEdit={msg.role === 'user' ? handleEditMessage : undefined} onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined} onBranch={handleBranch} isNew={msg.role === 'assistant' && idx === messages.length - 1 && isLoading} autoOpenCanvas={msg.id === canvasOpenMessageId} onCanvasSaved={handleCanvasSaved} onSpreadsheetSaved={handleSpreadsheetSaved} />
            ))}
            {isLoading && <TypingIndicator modelLabel={MODEL_OPTIONS.find(m => m.id === selectedModel)?.label} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 shrink-0 relative z-10">
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth:'none'}}>
          <Tooltip text="Easter Eggs: /8ball, /tableflip, /untableflip">
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[hsl(220,7%,40%)] cursor-help hover:text-[hsl(220,7%,55%)] transition-colors" />
          </Tooltip>
          <span className="text-[10px] text-[hsl(220,7%,45%)] font-medium shrink-0">Model:</span>
          {MODEL_OPTIONS.map(m => (
            <Tooltip key={m.id} text={m.tip || m.label}>
            <button
              onClick={() => setSelectedModel(m.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium shrink-0 ${
                selectedModel === m.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-[hsl(225,9%,20%)] text-[hsl(220,7%,45%)] hover:border-primary/30 hover:text-white'
              }`}
            >
              {m.fast && '⚡ '}{m.label}
            </button>
            </Tooltip>
          ))}
          <button
            onClick={() => setSearchInternet(!searchInternet)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium shrink-0 ${
              searchInternet
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-[hsl(225,9%,20%)] text-[hsl(220,7%,45%)] hover:border-primary/30 hover:text-white'
            }`}
          >
            🔍 Search Web
          </button>
          {activePlugins.length > 0 && (
            <>
              <span className="text-[10px] text-[hsl(220,7%,40%)] mx-1 shrink-0">•</span>
              <div className="flex items-center gap-1">
                {activePlugins.map(plugin => (
                  <button
                    key={plugin.id}
                    onClick={() => setActivePlugins(prev => prev.filter(p => p.id !== plugin.id))}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all font-medium flex items-center gap-1 shrink-0"
                    title="Click to disable"
                  >
                    {plugin.icon} {plugin.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <ChatInput onSend={handleSend} isLoading={isLoading} quotedText={quotedText} onQuotedTextConsumed={() => setQuotedText('')} />
      </div>
    </div>
  );
}