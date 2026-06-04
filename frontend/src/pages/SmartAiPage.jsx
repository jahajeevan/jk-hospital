import { AnimatePresence, motion } from 'framer-motion';
import {
  Cpu,
  Eraser,
  Gauge,
  HeartPulse,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Mic,
  Route,
  Send,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api, { formatApiError } from '../api/client.js';
import AiResponse from '../components/ai/AiResponse.jsx';

const disclaimer = 'AI-generated response. This is for informational purposes only and not a substitute for professional medical advice.';
const AI_MESSAGES_KEY = 'jk_ai_messages';
const AI_SESSION_KEY = 'jk_ai_session_id';

const createAiSessionId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;

const tools = [
  { id: 'chat', label: 'Chatbot', icon: MessageSquareText, placeholder: 'Ask about symptoms, departments, visiting hours, appointment steps, or hospital FAQs...' },
  { id: 'symptom', label: 'Symptoms', icon: Route, placeholder: 'Write symptoms clearly. Example: fever, cough, and body pain for three days...' }
];

const quickActions = [
  { tool: 'symptom', label: 'Summarize symptoms', prompt: 'I have fever, cough, and body pain for three days.' },
  { tool: 'chat', label: 'Hospital help desk', prompt: 'What is the emergency contact for JK Hospital?' }
];

const initialAssistantMessage = {
  role: 'assistant',
  text: `Hello, I am JK Hospital's local AI assistant powered by Gemma3:4B on Ollama. I can chat about hospital questions and help summarize symptoms for the right department.\n\n${disclaimer}`
};

const endpointByTool = {
  chat: '/ai/chat',
  symptom: '/ai/symptom-route'
};

const bodyByTool = (tool, input, sessionId) => {
  if (tool === 'chat') return { message: input, sessionId };
  return { symptoms: input };
};

const responseText = (tool, payload) => {
  if (tool === 'chat') return payload.message;
  const result = payload.result || {};
  return `**Symptom summary:** ${result.summary || result.reason || 'Symptoms reviewed.'}\n\n**Recommended department:** ${result.department || 'General Medicine'}\n\n**Urgency:** ${result.urgency || 'routine'}\n\n${(result.redFlags || []).map((item) => `- ${item}`).join('\n')}\n\n${result.disclaimer || disclaimer}`;
};

const offlineResponse = () =>
  `Local AI is unavailable right now. Please start Ollama and make sure gemma3:4b is running on http://127.0.0.1:11434.\n\nTry:\n\nollama serve\nollama pull gemma3:4b\n\n${disclaimer}`;

export default function SmartAiPage() {
  const [activeTool, setActiveTool] = useState('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(() => {
    const saved = JSON.parse(sessionStorage.getItem(AI_MESSAGES_KEY) || 'null');
    return saved?.length ? saved : [initialAssistantMessage];
  });
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const scrollRef = useRef(null);
  const [sessionId, setSessionId] = useState(() => {
    const saved = sessionStorage.getItem(AI_SESSION_KEY);
    if (saved) return saved;
    const next = createAiSessionId();
    sessionStorage.setItem(AI_SESSION_KEY, next);
    return next;
  });
  const active = tools.find((tool) => tool.id === activeTool) || tools[0];
  const activeProvider = config?.providers?.find((item) => item.active);

  useEffect(() => {
    api.get('/ai/config').then(({ data }) => setConfig(data)).catch(() => setConfig(null));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    sessionStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(messages.slice(-18)));
  }, [messages, loading]);

  const send = async (overrideText, overrideTool) => {
    const tool = overrideTool || activeTool;
    const text = String(overrideText ?? input).trim();
    if (text.length < 2) return toast.error('Type a little more detail for the AI assistant.');
    if (!overrideText) setInput('');
    setLoading(true);
    setMessages((current) => [...current, { role: 'user', text, tool }]);
    try {
      const { data } = await api.post(endpointByTool[tool], bodyByTool(tool, text, sessionId));
      setMessages((current) => [...current, { role: 'assistant', text: responseText(tool, data), tool }]);
    } catch (error) {
      toast.error(formatApiError(error));
      setMessages((current) => [
        ...current,
        { role: 'assistant', text: offlineResponse(tool), error: true }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const useQuickAction = (action) => {
    setActiveTool(action.tool);
    setInput(action.prompt);
    void send(action.prompt, action.tool);
  };

  const clearConversation = () => {
    sessionStorage.removeItem(AI_MESSAGES_KEY);
    const nextSessionId = createAiSessionId();
    sessionStorage.setItem(AI_SESSION_KEY, nextSessionId);
    setSessionId(nextSessionId);
    setMessages([initialAssistantMessage]);
    setInput('');
  };

  return (
    <main className="ai-lab-page min-h-[calc(100vh-4rem)] py-8 md:py-10">
      <div className="ai-lab-grid" aria-hidden="true" />
      <div className="container-pad relative z-10">
        <section className="ai-lab-hero ai-care-hero">
          <div>
            <span className="ai-lab-badge"><Sparkles size={14} /> Local Gemma3:4B assistant</span>
            <h1>Ask JK Hospital before your visit.</h1>
            <p>
              Use the chatbot for hospital questions, or write symptoms so the assistant can summarize
              them and suggest the right department. For emergencies, call 7845265507 immediately.
            </p>
            <div className="ai-lab-quick">
              {quickActions.map((action) => (
                <button key={action.label} type="button" onClick={() => useQuickAction(action)}>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ai-lab-status ai-care-radar">
            <div className="ai-orb"><LifeBuoy size={30} /></div>
            <dl>
              <div>
                <dt>Provider</dt>
                <dd>{activeProvider?.name || 'Ollama'}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{activeProvider?.model || 'gemma3:4b'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{config ? 'Online' : 'Local standby'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <div className="ai-lab-shell ai-care-shell">
          <aside className="ai-tool-rail">
            <div className="ai-rail-title">
              <Cpu size={18} />
              Modules
            </div>
            <div className="ai-tool-list">
              {tools.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTool(id)}
                  className={activeTool === id ? 'active' : ''}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="ai-rail-card">
              <ShieldCheck size={18} />
              <p>Safety first</p>
              <span>Every answer keeps medical limits clear and points emergencies to direct care.</span>
            </div>
          </aside>

          <section className="ai-console ai-command-panel ai-care-panel">
            <div className="ai-console-topbar">
              <div className="flex min-w-0 items-center gap-3">
                <span className="ai-console-icon"><HeartPulse size={20} /></span>
                <div className="min-w-0">
                  <p>{active.label} care mode</p>
                  <span>Gemma3:4B local AI for chat and symptom guidance</span>
                </div>
              </div>
              <div className="ai-console-actions">
                <span><Gauge size={14} /> Local AI</span>
                <button type="button" title="Voice input ready for browser speech APIs">
                  <Mic size={16} />
                </button>
                <button type="button" onClick={clearConversation} title="Clear conversation">
                  <Eraser size={16} />
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="ai-chat-scroll ai-message-stage">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}-${message.text.slice(0, 12)}`}
                    initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8 }}
                    className={`ai-message-row ${message.role === 'user' ? 'user' : 'assistant'}`}
                  >
                    <div className={`ai-message-bubble ${message.role === 'user' ? 'user' : message.error ? 'error' : 'assistant'}`}>
                      <AiResponse text={message.text} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading ? (
                <div className="ai-thinking">
                  <Loader2 size={16} className="animate-spin" />
                  Gemma3:4B is reasoning...
                </div>
              ) : null}
            </div>

            <div className="ai-composer">
              <textarea
                className="ai-prompt-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={active.placeholder}
              />
              <button type="button" onClick={() => send()} disabled={loading} className="ai-send-button">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                Send
              </button>
            </div>
            <p className="ai-disclaimer">{disclaimer}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
