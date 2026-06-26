import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Search, MessageCircle, Shield, AlertCircle, RefreshCw, Send, Clock, Phone, Navigation, Heart, Calendar, Star, Wallet, Archive } from "lucide-react";
import { useNavigate, Link } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { SiteShell } from "@/components/SiteShell";
import { useRequireAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { readErrorMessage } from "@/lib/utils";

// Web Audio API helpers to synthesize telephone tones
const playDialingTone = () => {
  if (typeof window === "undefined") return { stop: () => {} };
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = 350;
    osc2.frequency.value = 440;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    return {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          ctx.close();
        } catch {}
      }
    };
  } catch (e) {
    console.error("AudioContext error:", e);
    return { stop: () => {} };
  }
};

const playConnectTone = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.error("AudioContext error:", e);
  }
};

type SolicitacaoApi = {
  id: number;
  usuariaId: number;
  madrinhaId?: number | null;
  descricao: string;
  destino?: string | null;
  dataInicio: string;
  dataFim: string;
  status: string;
  madrinha?: {
    id: number;
    nome: string;
    telefone?: string | null;
    precoDiaria: number;
    fotoPerfilUrl?: string | null;
  } | null;
};

type Transacao = {
  id: number;
  quantidade: number;
  tipo: string;
  descricao: string;
  precoPago?: number;
  dataCriacao: string;
};

type SessaoChat = {
  id: number;
  Id?: number;
  usuariaId: number;
  madrinhaId?: number | null;
  servicoTipo: string;
  status: string;
  dataInicio: string;
  tempoLimite?: string | null;
  slaLimite: string;
  respondida: boolean;
  madrinhaNome: string;
  viajanteNome: string;
  madrinhaFotoPerfilUrl?: string | null;
  madrinhaMediaAvaliacao?: number | null;
  horarioDesembarque?: string | null;
  aeroporto?: string | null;
  locaisVisitados?: string | null;
  quantidadeHoras?: number | null;
  avaliada?: boolean;
  pontoEncontro?: string | null;
  duvidaInicial?: string | null;
};

type Mensagem = {
  id: number;
  sessaoChatId: number;
  remetenteId: number;
  texto: string;
  dataCriacao: string;
};

export function MinhaViagem() {
  const auth = useRequireAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.ready && auth.isAuthenticated) {
      const isMadrinha = auth.user?.roles?.includes("Madrinha") ?? false;
      if (isMadrinha) {
        navigate({ to: "/areamadrinha" });
      }
    }
  }, [auth.isAuthenticated, auth.ready, auth.user, navigate]);

  // Core Data states
  const [solicitacao, setSolicitacao] = useState<SolicitacaoApi | null>(null);
  const [historicoTransacoes, setHistoricoTransacoes] = useState<Transacao[]>([]);
  const [sessoesChat, setSessoesChat] = useState<SessaoChat[]>([]);
  const [sessaoSelecionada, setSessaoSelecionada] = useState<SessaoChat | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [madrinhasTime, setMadrinhasTime] = useState<any[]>([]);
  const [mobileChatListOpen, setMobileChatListOpen] = useState(false);
  const [ocultarFinalizadosViajante, setOcultarFinalizadosViajante] = useState(false);
  const mobilePortalContainer = typeof document !== 'undefined' ? document.getElementById("mobile-chat-portal") : null;

  useEffect(() => {
    if (window.innerWidth < 1024 && (mobileChatListOpen || sessaoSelecionada)) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileChatListOpen, sessaoSelecionada]);

  const sessaoSelecionadaRef = useRef<SessaoChat | null>(null);
  useEffect(() => {
    sessaoSelecionadaRef.current = sessaoSelecionada;
  }, [sessaoSelecionada]);

  const updateSessaoSelecionada = useCallback((sessao: SessaoChat | null) => {
    sessaoSelecionadaRef.current = sessao;
    setSessaoSelecionada(sessao);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeDialToneRef = useRef<{ stop: () => void } | null>(null);

  const lastSignalTimeRef = useRef<string>(new Date().toISOString());
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupWebRtc = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }
  }, []);

  const iniciarChamadaWebRtc = useCallback(async (sessaoId: number) => {
    try {
      cleanupWebRtc();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      streamRef.current = stream; // For waveform mock

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = async (event) => {
        if (event.candidate && auth.token) {
          await api.post(`/chat/sessoes/${sessaoId}/webrtc/signal`, {
            type: "candidate",
            candidate: JSON.stringify(event.candidate)
          }, { headers: { Authorization: `Bearer ${auth.token}` } });
        }
      };

      pc.ontrack = (event) => {
        if (!remoteAudioRef.current) {
          const audio = document.createElement("audio");
          audio.autoplay = true;
          remoteAudioRef.current = audio;
          document.body.appendChild(audio);
        }
        remoteAudioRef.current.srcObject = event.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (auth.token) {
        await api.post(`/chat/sessoes/${sessaoId}/webrtc/signal`, {
          type: "offer",
          sdp: offer.sdp
        }, { headers: { Authorization: `Bearer ${auth.token}` } });
      }
    } catch (err) {
      console.error("Erro ao iniciar chamada WebRTC:", err);
    }
  }, [auth.token, cleanupWebRtc]);

  const handleAnswerRecebido = useCallback(async (sdp: string) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
    }
  }, []);

  const handleCandidateRecebido = useCallback(async (candidateStr: string) => {
    const pc = peerConnectionRef.current;
    if (pc) {
      try {
        const candidateJson = JSON.parse(candidateStr);
        await pc.addIceCandidate(new RTCIceCandidate(candidateJson));
      } catch (e) {
        console.error("Erro ao adicionar ICE candidate:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!sessaoSelecionada || !sessaoSelecionada.servicoTipo.toLowerCase().includes("liga")) {
      if (activeDialToneRef.current) {
        activeDialToneRef.current.stop();
        activeDialToneRef.current = null;
      }
      cleanupWebRtc();
      return;
    }

    const sessaoId = sessaoSelecionada.id || sessaoSelecionada.Id || 0;
    const status = sessaoSelecionada.status;

    if (status === "Pendente") {
      if (!activeDialToneRef.current) {
        activeDialToneRef.current = playDialingTone();
      }
    } else if (status === "Ativa") {
      if (activeDialToneRef.current) {
        activeDialToneRef.current.stop();
        activeDialToneRef.current = null;
        playConnectTone();
      }
    } else {
      if (activeDialToneRef.current) {
        activeDialToneRef.current.stop();
        activeDialToneRef.current = null;
      }
    }

    lastSignalTimeRef.current = new Date(Date.now() - 5000).toISOString();

    const pollSignals = async () => {
      try {
        const res = await api.get(`/chat/sessoes/${sessaoId}/webrtc/signals?sinceUtc=${lastSignalTimeRef.current}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const signals = res.data || [];
        if (signals.length > 0) {
          const maxTimestamp = new Date(Math.max(...signals.map((s: any) => new Date(s.timestamp).getTime())));
          lastSignalTimeRef.current = new Date(maxTimestamp.getTime() + 10).toISOString();
          
          for (const signal of signals) {
            if (signal.senderId === auth.user?.id) continue;
            
            if (signal.type === "answer") {
              await handleAnswerRecebido(signal.sdp);
            } else if (signal.type === "candidate") {
              await handleCandidateRecebido(signal.candidate);
            } else if (signal.type === "hangup") {
              cleanupWebRtc();
            }
          }
        }
      } catch (e) {
        console.error("Erro ao obter sinais WebRTC:", e);
      }
    };

    const interval = setInterval(pollSignals, 2000);

    if (status === "Ativa" && !peerConnectionRef.current) {
      void iniciarChamadaWebRtc(sessaoId);
    }

    return () => {
      clearInterval(interval);
      cleanupWebRtc();
    };
  }, [sessaoSelecionada?.status, sessaoSelecionada?.id, auth.token, iniciarChamadaWebRtc, handleAnswerRecebido, handleCandidateRecebido, cleanupWebRtc]);

  // Ref cache to prevent flickering
  const mensagensCacheRef = useRef<Record<number, Mensagem[]>>({});

  const handleSelectSessao = (s: SessaoChat) => {
    updateSessaoSelecionada(s);
    const cached = mensagensCacheRef.current[s.id];
    setMensagens(cached || []);
  };

  // Evaluation states for finished services
  const [avaliacaoNota, setAvaliacaoNota] = useState(5);
  const [avaliacaoComentario, setAvaliacaoComentario] = useState("");
  const [enviandoAvaliacaoServico, setEnviandoAvaliacaoServico] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [textoMensagem, setTextoMensagem] = useState("");
  const [enviandoMensagem, setEnviandoMensagem] = useState(false);
  const [iniciandoServico, setIniciandoServico] = useState(false);
  const [verificandoSla, setVerificandoSla] = useState(false);
  
  // Timer state for time-boxing
  const [tempoRestanteStr, setTempoRestanteStr] = useState<string>("");

  // Input states for specific services
  const [modalServicoAtivo, setModalServicoAtivo] = useState<string | null>(null);
  const [horarioDesembarque, setHorarioDesembarque] = useState("");
  const [aeroporto, setAeroporto] = useState("");
  const [locaisVisitados, setLocaisVisitados] = useState("");
  const [quantidadeHoras, setQuantidadeHoras] = useState(4);
  const [duvidaInicial, setDuvidaInicial] = useState("");
  const [pontoEncontro, setPontoEncontro] = useState("");
  const [acompanhamentoDataInicio, setAcompanhamentoDataInicio] = useState("");
  const [acompanhamentoDataFim, setAcompanhamentoDataFim] = useState("");
  const [acompanhamentoHoraInicio, setAcompanhamentoHoraInicio] = useState("");
  const [acompanhamentoHoraFim, setAcompanhamentoHoraFim] = useState("");

  const fetchCoreData = useCallback(async (targetSessaoId?: number) => {
    if (!auth.token) return;
    setError("");
    try {
      // 1. Fetch active travel match
      const resSol = await api.get<SolicitacaoApi[]>("/solicitacoes/minhas-solicitacoes", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const activeSol = resSol.data.find(s => s.status === "Aberta" || s.status === "Aceita");
      setSolicitacao(activeSol || null);

      // Load local team of Madrinhas if there is an active trip destination
      if (activeSol && activeSol.destino) {
        const cidade = activeSol.destino.split(",")[0].trim();
        try {
          const resMadrinhas = await api.get(`/madrinha?destino=${cidade}`, {
            headers: { Authorization: `Bearer ${auth.token}` }
          });
          setMadrinhasTime(resMadrinhas.data);
        } catch (err) {
          console.error("Erro ao obter time local:", err);
        }
      } else {
        setMadrinhasTime([]);
      }

      // 2. Fetch credit balance
      const resProfile = await api.get<{ saldoCreditos: number }>("/Usuaria", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (auth.user && auth.user.saldoCreditos !== resProfile.data.saldoCreditos) {
        auth.updateUser({
          ...auth.user,
          saldoCreditos: resProfile.data.saldoCreditos
        });
      }

      // 3. Fetch transaction history
      const resHist = await api.get<Transacao[]>("/carteira/historico", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setHistoricoTransacoes(resHist.data);

      // 4. Fetch chat sessions
      const resChats = await api.get<SessaoChat[]>("/chat/sessoes", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setSessoesChat(resChats.data);

      // Keep selection active if it still exists (no automatic selection on startup)
      const currentSelected = sessaoSelecionadaRef.current;
      if (resChats.data.length > 0) {
        if (targetSessaoId) {
          const target = resChats.data.find(c => c.id === targetSessaoId);
          if (target) {
            updateSessaoSelecionada(target);
          }
        } else if (currentSelected) {
          const updated = resChats.data.find(c => c.id === currentSelected.id);
          if (updated) {
            updateSessaoSelecionada(updated);
          } else {
            updateSessaoSelecionada(null);
          }
        }
      } else {
        updateSessaoSelecionada(null);
      }
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [auth.token, updateSessaoSelecionada]);

  // Load messages for the selected session
  const fetchMessages = useCallback(async (isSilent = false) => {
    if (!auth.token || !sessaoSelecionada) return;
    const currentId = sessaoSelecionada.id;
    const hasCache = !!mensagensCacheRef.current[currentId];
    if (!isSilent && !hasCache) setLoadingChat(true);
    try {
      const resMsg = await api.get<{
        sessaoStatus: string;
        tempoLimite?: string | null;
        slaLimite: string;
        respondida: boolean;
        mensagens: Mensagem[];
      }>(`/chat/sessoes/${currentId}/mensagens`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      mensagensCacheRef.current[currentId] = resMsg.data.mensagens;
      setMensagens(resMsg.data.mensagens);
      
      // Update selected session status and fields
      setSessaoSelecionada(prev => {
        const next = prev && prev.id === currentId ? {
          ...prev,
          status: resMsg.data.sessaoStatus,
          tempoLimite: resMsg.data.tempoLimite,
          slaLimite: resMsg.data.slaLimite,
          respondida: resMsg.data.respondida
        } : prev;
        sessaoSelecionadaRef.current = next;
        return next;
      });

    } catch (err) {
      console.error("Erro ao obter mensagens", err);
    } finally {
      if (!isSilent && !hasCache) setLoadingChat(false);
    }
  }, [auth.token, sessaoSelecionada?.id]);

  useEffect(() => {
    void fetchCoreData();
    const pollTimer = setInterval(() => {
      void fetchCoreData();
    }, 5000);
    return () => clearInterval(pollTimer);
  }, [auth.token, fetchCoreData]);

  // Poll messages every 6 seconds to simulate real-time updates (especially for match/SLA updates)
  useEffect(() => {
    if (!sessaoSelecionada) return;
    const timer = setInterval(() => {
      void fetchMessages(true);
    }, 6000);
    return () => clearInterval(timer);
  }, [sessaoSelecionada?.id, fetchMessages]);

  useEffect(() => {
    if (sessaoSelecionada) {
      void fetchMessages(false);
    }
  }, [sessaoSelecionada?.id]);

  // Timer countdown hook for time-boxing (30 min chat)
  useEffect(() => {
    if (!sessaoSelecionada?.tempoLimite) {
      setTempoRestanteStr("");
      return;
    }

    const interval = setInterval(() => {
      const limit = new Date(sessaoSelecionada.tempoLimite!).getTime();
      const now = new Date().getTime();
      const diff = limit - now;

      if (diff <= 0) {
        setTempoRestanteStr("Tempo expirado");
        clearInterval(interval);
        void fetchMessages();
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTempoRestanteStr(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} restante`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessaoSelecionada?.tempoLimite]);

  // Request Service submit
  const handleIniciarServicoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token || !modalServicoAtivo) return;

    setIniciandoServico(true);
    setError("");
    try {
      let calculatedHours = quantidadeHoras;
      if (modalServicoAtivo.toLowerCase().includes("acompanhamento") && acompanhamentoDataInicio && acompanhamentoDataFim) {
        const start = new Date(`${acompanhamentoDataInicio}T${acompanhamentoHoraInicio || "00:00"}`);
        const end = new Date(`${acompanhamentoDataFim}T${acompanhamentoHoraFim || "00:00"}`);
        const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        calculatedHours = Math.max(1, Math.ceil(diffHours));
      }

      const res = await api.post<{ sessaoId: number }>(
        "/chat/sessoes/iniciar-servico",
        {
          servicoTipo: modalServicoAtivo,
          horarioDesembarque: modalServicoAtivo.toLowerCase().includes("busca") ? horarioDesembarque : null,
          aeroporto: modalServicoAtivo.toLowerCase().includes("busca") ? aeroporto : null,
          locaisVisitados: modalServicoAtivo.toLowerCase().includes("acompanhamento") ? locaisVisitados : null,
          quantidadeHoras: modalServicoAtivo.toLowerCase().includes("acompanhamento") ? calculatedHours : null,
          pontoEncontro: modalServicoAtivo.toLowerCase().includes("acompanhamento") ? pontoEncontro : null,
          duvidaInicial: modalServicoAtivo.toLowerCase().includes("dicas") ? duvidaInicial : null,
          acompanhamentoDataInicio: modalServicoAtivo.toLowerCase().includes("acompanhamento") && acompanhamentoDataInicio ? new Date(`${acompanhamentoDataInicio}T${acompanhamentoHoraInicio || "00:00"}`).toISOString() : null,
          acompanhamentoDataFim: modalServicoAtivo.toLowerCase().includes("acompanhamento") && acompanhamentoDataFim ? new Date(`${acompanhamentoDataFim}T${acompanhamentoHoraFim || "00:00"}`).toISOString() : null,
          acompanhamentoHoraInicio: modalServicoAtivo.toLowerCase().includes("acompanhamento") ? acompanhamentoHoraInicio : null,
          acompanhamentoHoraFim: modalServicoAtivo.toLowerCase().includes("acompanhamento") ? acompanhamentoHoraFim : null
        },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      const newSessId = res.data.sessaoId;

      // Reset form states
      setModalServicoAtivo(null);
      setHorarioDesembarque("");
      setAeroporto("");
      setLocaisVisitados("");
      setQuantidadeHoras(4);
      setDuvidaInicial("");
      setPontoEncontro("");
      setAcompanhamentoDataInicio("");
      setAcompanhamentoDataFim("");
      setAcompanhamentoHoraInicio("");
      setAcompanhamentoHoraFim("");

      // Refresh and select the new session
      await fetchCoreData(newSessId);
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setIniciandoServico(false);
    }
  };

  // Send Message
  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentId = sessaoSelecionada?.id;
    if (!auth.token || !sessaoSelecionada || !textoMensagem.trim() || enviandoMensagem) return;
    
    setEnviandoMensagem(true);
    try {
      await api.post("/chat/sessoes/enviar-mensagem", {
        sessaoId: currentId,
        texto: textoMensagem.trim()
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setTextoMensagem("");
      await fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setEnviandoMensagem(false);
    }
  };

  const handleCriarAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.token || !sessaoSelecionada || !sessaoSelecionada.madrinhaId) return;

    setEnviandoAvaliacaoServico(true);
    try {
      await api.post("/avaliacao", {
        sessaoChatId: sessaoSelecionada.id,
        madrinhaId: sessaoSelecionada.madrinhaId,
        nota: avaliacaoNota,
        comentario: avaliacaoComentario.trim()
      }, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setAvaliacaoNota(5);
      setAvaliacaoComentario("");
      await fetchCoreData();
      await fetchMessages();
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar avaliação.");
    } finally {
      setEnviandoAvaliacaoServico(false);
    }
  };

  // Simulate SLA Violation & Redistribution (Debug trigger)
  const handleVerificarSla = async () => {
    if (verificandoSla) return;
    setVerificandoSla(true);
    try {
      await api.post("/chat/verificar-sla");
      updateSessaoSelecionada(null);
      await fetchCoreData();
    } catch (err) {
      console.error(err);
    } finally {
      setVerificandoSla(false);
    }
  };

  if (!auth.ready || !auth.isAuthenticated) {
    return null;
  }

  // Cost catalog mapping
  const servicosInfo = [
    { nome: "Dicas Locais (Chat)", creditos: 1, desc: "Dúvidas rápidas via chat (sessão de 30min)", icon: <Clock size={18} /> },
    { nome: "Ligação/Suporte", creditos: 3, desc: "Ligação direta emergencial para as Madrinhas do Time local", icon: <Phone size={18} /> },
    { nome: "Busca no Aeroporto", creditos: 10, desc: "Recepção no desembarque (Informe voo e aeroporto)", icon: <Navigation size={18} /> },
    { nome: "Acompanhamento Presencial", creditos: 20, desc: "Suporte físico dedicado (5 créditos por hora)", icon: <Heart size={18} /> },
  ];

  return (
    <SiteShell>
      {mobilePortalContainer && createPortal(
        <button 
          onClick={() => {
            setSessaoSelecionada(null);
            setMobileChatListOpen(!mobileChatListOpen);
          }}
          className="relative p-2 text-foreground hover:bg-muted rounded-xl transition cursor-pointer flex items-center justify-center"
        >
          <MessageCircle size={20} />
          {sessoesChat.length > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[var(--terracotta)] rounded-full border border-background"></span>
          )}
        </button>,
        mobilePortalContainer
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground mb-2">Concierge & Suporte Nativo</p>
            <h1 className="text-3xl sm:text-4xl font-serif">Minha Viagem Assistida</h1>
          </div>
          <button
            onClick={() => navigate({ to: "/busca" })}
            className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-medium hover:bg-muted cursor-pointer transition shadow-sm bg-card"
          >
            <Search size={16} /> Novo Destino
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="animate-spin" size={18} /> Carregando sua viagem...
          </div>
        ) : !solicitacao ? (
          /* No active Trip match */
          <div className="bg-card border rounded-[2rem] p-10 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--sand)]/50 flex items-center justify-center text-[var(--moss)]">
              <MapPin size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-serif">Destino e Viagem não localizados</h2>
              <p className="text-muted-foreground">
                <strong>Você ainda não tem uma viagem cadastrada.</strong> <br />Vá para a página de destinos, cadastre um destino e compre um pacote de créditos para desbloquear o suporte local!
              </p>
            </div>
            <button
              onClick={() => navigate({ to: "/busca" })}
              className="inline-flex items-center justify-center gap-2 bg-[var(--moss)] text-white rounded-full px-7 py-4 font-medium hover:opacity-90 cursor-pointer shadow-sm"
            >
              Ir para Destinos<ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* Active Trip Hub */
          <div className="space-y-8">
            
            {/* Top Level: Active Destination details (100% width) */}
            <div className="bg-gradient-to-r from-[var(--moss)] to-[var(--moss)]/85 text-white rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-2">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  Destino Ativo & Viagem Cadastrada
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold leading-tight">
                  {solicitacao.destino || "Recife, PE"}
                </h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80">
                  <p className="flex items-center gap-1">
                    <Calendar size={14} />
                    <strong>Período:</strong> {solicitacao.dataInicio ? new Date(solicitacao.dataInicio).toLocaleDateString("pt-BR") : "—"} a {solicitacao.dataFim ? new Date(solicitacao.dataFim).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-xs space-y-1 max-w-xs animate-in fade-in duration-300">
                <p className="font-bold flex items-center gap-1">
                  <Shield size={14} className="text-emerald-300" />
                  Time {solicitacao.destino ? solicitacao.destino.split(",")[0].trim() : "Recife"} Ativo
                </p>
                <p className="text-white/80 leading-relaxed">
                  Você é atendida de forma colaborativa por toda a nossa equipe local de especialistas regionais.
                </p>
              </div>
            </div>

            {/* Wallet Section */}
            <div className="bg-card border rounded-3xl md:rounded-[2rem] p-4 md:p-8 shadow-sm flex flex-row md:flex-row items-center justify-between gap-3 md:gap-6">
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm md:text-lg font-serif font-semibold truncate">Seus Créditos</h3>
                  <p className="hidden md:block text-[10px] md:text-xs text-muted-foreground font-medium truncate">Utilizados para contratar serviços do time local.</p>
                </div>
              </div>
              <div className="flex flex-row items-center gap-3 md:gap-4 shrink-0">
                <div className="bg-secondary/40 border rounded-xl md:rounded-2xl px-3 py-1.5 md:px-5 md:py-3 flex items-baseline gap-1 shrink-0 justify-center">
                  <span className="text-xl md:text-3xl font-serif font-bold text-[var(--moss)]">
                    {auth.user?.saldoCreditos ?? 0}
                  </span>
                  <span className="text-[10px] md:text-xs text-muted-foreground font-semibold">créditos</span>
                </div>
                <button
                  onClick={() => navigate({ to: "/carteira" })}
                  className="bg-[var(--moss)] text-white hover:opacity-90 px-3 py-2 md:px-6 md:py-3.5 rounded-xl md:rounded-2xl font-medium transition cursor-pointer text-xs md:text-sm shadow-sm flex items-center justify-center"
                >
                  <span className="md:hidden">Recarregar</span>
                  <span className="hidden md:inline">Adquirir Créditos / Recarregar</span>
                </button>
              </div>
            </div>

            {/* Middle Section Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              
              {/* Left Column (2/3 width): Service Catalog */}
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif font-semibold">Contratação de Serviços</h3>
                    <p className="text-sm text-muted-foreground">Selecione o serviço para acionar e enviar para a fila de aceite das Madrinhas do time local.</p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    {servicosInfo.map((servico) => (
                      <div key={servico.nome} className="border rounded-2xl p-4 flex flex-col justify-between hover:border-[var(--moss)]/40 transition bg-background">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="w-8 h-8 rounded-xl bg-[var(--moss)]/10 text-[var(--moss)] flex items-center justify-center">
                              {servico.icon}
                            </span>
                            <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-semibold">
                              {servico.nome.includes("Acompanhamento") ? "5 cr/hora" : `${servico.creditos} cr`}
                            </span>
                          </div>
                          <h4 className="font-semibold text-sm">{servico.nome}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">{servico.desc}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (servico.nome.includes("Aeroporto") || servico.nome.includes("Acompanhamento") || servico.nome.includes("Suporte") || servico.nome.includes("Dicas")) {
                              setModalServicoAtivo(servico.nome);
                            } else {
                              void handleIniciarServicoSubmit(new Event("submit") as any);
                            }
                          }}
                          disabled={iniciandoServico || (auth.user?.saldoCreditos ?? 0) < (servico.nome.includes("Acompanhamento") ? 5 : servico.creditos)}
                          className="w-full mt-4 bg-secondary text-foreground text-xs py-2.5 rounded-xl hover:bg-[var(--moss)] hover:text-white transition disabled:opacity-50 cursor-pointer font-medium"
                        >
                          {(auth.user?.saldoCreditos ?? 0) < (servico.nome.includes("Acompanhamento") ? 5 : servico.creditos) ? "Saldo Insuficiente" : "Contratar Serviço"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column (1/3 width): Support Chat */}
              <div className={`lg:col-span-1 ${mobileChatListOpen || sessaoSelecionada ? "fixed inset-0 z-50 bg-background lg:relative lg:inset-auto lg:z-auto lg:bg-transparent" : "hidden lg:block"}`}>
                <div className={`bg-card border rounded-[2rem] shadow-sm h-[560px] overflow-hidden relative flex bg-secondary/5 flex-col w-full ${
                  mobileChatListOpen || sessaoSelecionada ? "h-full rounded-none border-0 lg:h-[560px] lg:rounded-[2rem] lg:border" : ""
                }`}>
                  {/* SCREEN 1: Lista de Conversas (Full Width) */}
                  <div className={`w-full h-full flex flex-col absolute inset-0 transition-all duration-300 ${
                sessaoSelecionada ? "-translate-x-full opacity-0 pointer-events-none" : "translate-x-0 opacity-100"
              }`}>
                <div className="p-4 border-b bg-card flex justify-between items-center">
                  <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Minhas Conversas</h4>
                  <button onClick={() => setMobileChatListOpen(false)} className="lg:hidden p-1.5 hover:bg-muted rounded-full cursor-pointer text-muted-foreground">
                    <ArrowLeft size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {sessoesChat.length === 0 ? (
                    <div className="text-center py-16 text-sm text-muted-foreground italic">
                      Nenhuma conversa ou serviço iniciado no momento.
                    </div>
                  ) : (
                    <>
                      {/* Ativos */}
                      {sessoesChat.filter(s => s.status !== "Finalizada" && s.status !== "Cancelada").length > 0 && (
                        <div className="space-y-3">
                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                            <MessageCircle size={12} className="text-[var(--moss)]" /> Atendimentos Ativos
                          </h5>
                          <div className="flex flex-col gap-2">
                            {sessoesChat.filter(s => s.status !== "Finalizada" && s.status !== "Cancelada").map((s) => {
                              const hasMadrinha = !!s.madrinhaId;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => handleSelectSessao(s)}
                                  className="w-full text-left p-4 rounded-2xl border bg-background hover:bg-muted border-border transition flex items-center gap-4 cursor-pointer shadow-xs"
                                >
                                  <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-xs uppercase bg-[var(--moss)]/10 text-[var(--moss)]">
                                    {s.servicoTipo.substring(0, 2)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-1">
                                      <p className="font-semibold text-xs truncate">
                                        {s.servicoTipo}
                                      </p>
                                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${
                                        s.status === "Pendente"
                                          ? "bg-amber-100 text-amber-800 animate-pulse"
                                          : s.status === "Ativa"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-gray-100 text-gray-800"
                                      }`}>
                                        {s.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] truncate mt-0.5 text-muted-foreground">
                                      {hasMadrinha ? s.madrinhaNome : "Aguardando time..."}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Finalizados */}
                      {sessoesChat.filter(s => s.status === "Finalizada" || s.status === "Cancelada").length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-sans">
                              <Archive size={12} className="text-muted-foreground" /> Finalizados
                            </h5>
                            <button
                              onClick={() => setOcultarFinalizadosViajante(!ocultarFinalizadosViajante)}
                              className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full transition border cursor-pointer ${ocultarFinalizadosViajante ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-transparent text-muted-foreground border-transparent hover:bg-muted"}`}
                            >
                              Ocultar Finalizados
                            </button>
                          </div>
                          {!ocultarFinalizadosViajante && (
                            <div className="flex flex-col gap-2">
                              {sessoesChat.filter(s => s.status === "Finalizada" || s.status === "Cancelada").map((s) => {
                                const hasMadrinha = !!s.madrinhaId;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => handleSelectSessao(s)}
                                    className="w-full text-left p-4 rounded-2xl border bg-background hover:bg-muted border-border transition flex items-center gap-4 cursor-pointer shadow-xs opacity-70"
                                  >
                                    <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-bold text-xs uppercase bg-[var(--moss)]/10 text-[var(--moss)]">
                                      {s.servicoTipo.substring(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start gap-1">
                                        <p className="font-semibold text-xs truncate">
                                          {s.servicoTipo}
                                        </p>
                                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 bg-gray-100 text-gray-800">
                                          {s.status}
                                        </span>
                                      </div>
                                      <p className="text-[10px] truncate mt-0.5 text-muted-foreground">
                                        {hasMadrinha ? s.madrinhaNome : "Atendimento finalizado"}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* SCREEN 2: Active Chat (Full Width) */}
              <div className={`w-full h-full flex flex-col absolute inset-0 transition-all duration-300 bg-background ${
                sessaoSelecionada ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
              }`}>
                {sessaoSelecionada && (
                  <>
                    {/* Chat Header */}
                    <div className={`p-4 border-b bg-secondary/15 flex items-center justify-between gap-3 shrink-0 ${
                      sessaoSelecionada ? "pt-8 lg:pt-4" : ""
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setSessaoSelecionada(null)}
                          className="mr-1 text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-full hover:bg-secondary transition shrink-0"
                          title="Voltar para conversas"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <img
                          src={sessaoSelecionada.madrinhaFotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                          alt={sessaoSelecionada.madrinhaNome || "Madrinha"}
                          className="w-9 h-9 rounded-full border border-[var(--moss)] object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-xs truncate">
                            {sessaoSelecionada.madrinhaNome || "Time Recife (Pareamento)"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {sessaoSelecionada.madrinhaId 
                              ? `Atendida por ${sessaoSelecionada.madrinhaNome} (⭐ ${sessaoSelecionada.madrinhaMediaAvaliacao?.toFixed(1) ?? "5.0"})` 
                              : "Buscando especialista disponível..."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          sessaoSelecionada.status === "Pendente"
                            ? "bg-amber-100 text-amber-800 animate-pulse"
                            : sessaoSelecionada.status === "Ativa"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-800"
                        }`}>
                          {sessaoSelecionada.status}
                        </span>
                        {tempoRestanteStr && (
                          <div className="flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-semibold animate-pulse shrink-0">
                            <Clock size={10} /> {tempoRestanteStr}
                          </div>
                        )}
                      </div>
                    </div>

                    {(sessaoSelecionada.pontoEncontro || sessaoSelecionada.duvidaInicial || sessaoSelecionada.aeroporto) && (
                      <div className="px-6 py-2 bg-amber-500/10 border-b text-[10px] text-foreground flex flex-wrap gap-x-4 gap-y-1 shrink-0">
                        {sessaoSelecionada.aeroporto && (
                          <span className="flex items-center gap-1">✈️ <strong>Aeroporto:</strong> {sessaoSelecionada.aeroporto}</span>
                        )}
                        {sessaoSelecionada.pontoEncontro && (
                          <span className="flex items-center gap-1">📍 <strong>Ponto de Encontro:</strong> {sessaoSelecionada.pontoEncontro}</span>
                        )}
                        {sessaoSelecionada.duvidaInicial && (
                          <span className="w-full flex items-start gap-1">❓ <strong>Dúvida Inicial:</strong> {sessaoSelecionada.duvidaInicial}</span>
                        )}
                      </div>
                    )}

                    {/* Chat Window Messages / Interface */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-secondary/5">
                      {sessaoSelecionada.status === "Pendente" && !sessaoSelecionada.madrinhaId && (
                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2 text-xs text-amber-900 leading-normal">
                          <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={14} />
                          <div>
                            <p className="font-semibold">Buscando Madrinha disponível...</p>
                            <p className="text-amber-800/80">Esta solicitação foi enviada para a central do Time Local. A primeira Madrinha que aceitar assumirá seu atendimento.</p>
                          </div>
                        </div>
                      )}

                      {sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") ? (
                        <div className="p-6 bg-card border rounded-2xl text-center space-y-4 shadow-inner max-w-xs mx-auto my-4">
                          {sessaoSelecionada.status === "Pendente" ? (
                            <>
                              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto animate-pulse">
                                <Phone size={28} className="stroke-[2]" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-sm">Ligando para o Time Recife...</p>
                                <p className="text-[10px] text-muted-foreground">Aguardando alguma Madrinha aceitar a chamada</p>
                              </div>
                            </>
                          ) : sessaoSelecionada.status === "Finalizada" ? (
                            <>
                              <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                                <Phone size={28} className="stroke-[2]" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-500 text-sm">Chamada por Voz Encerrada</p>
                                <p className="text-[10px] text-muted-foreground">Esta ligação foi finalizada.</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
                                <Phone size={28} className="stroke-[2] animate-bounce" />
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-emerald-600 text-sm">Suporte de Voz Conectado!</p>
                                <p className="text-xs">Madrinha: <strong>{sessaoSelecionada.madrinhaNome}</strong></p>
                                <p className="text-[10px] text-muted-foreground mt-2">Use o telefone para conversar diretamente por voz.</p>
                                <canvas
                                  ref={canvasRef}
                                  width={200}
                                  height={60}
                                  className="w-full h-[60px] rounded-lg mt-3 bg-secondary/10 border border-secondary/20"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await api.post(`/chat/sessoes/${sessaoSelecionada.id}/encerrar`, {}, {
                                        headers: { Authorization: `Bearer ${auth.token}` }
                                      });
                                      await fetchCoreData();
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-semibold mt-4 transition cursor-pointer"
                                >
                                  Encerrar Chamada
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        loadingChat && mensagens.length === 0 ? (
                          <div className="text-center py-4 text-xs text-muted-foreground">Carregando conversa...</div>
                        ) : (
                          mensagens.map((msg) => {
                            const isSystem = msg.remetenteId === 0;
                            const isMe = msg.remetenteId === auth.user?.id;

                            if (isSystem) {
                              return (
                                <div key={msg.id} className="text-center py-2 px-4 rounded-xl bg-secondary border text-[11px] text-muted-foreground max-w-[85%] mx-auto leading-relaxed">
                                  {msg.texto}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[75%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}
                              >
                                <span className="text-[9px] text-muted-foreground mb-0.5">
                                  {isMe ? "Você" : sessaoSelecionada.madrinhaNome}
                                </span>
                                <div className={`p-3 rounded-2xl text-xs leading-normal ${
                                  isMe
                                    ? "bg-[var(--moss)] text-white rounded-tr-none"
                                    : "bg-card border text-foreground rounded-tl-none shadow-xs"
                                }`}>
                                  {msg.texto}
                                </div>
                              </div>
                            );
                          })
                        )
                      )}
                    </div>

                    {/* Chat Footer / Input or Rating */}
                    {sessaoSelecionada.status === "Finalizada" ? (
                      <div className="p-4 border-t bg-card shrink-0">
                        {!sessaoSelecionada.avaliada ? (
                          <form onSubmit={handleCriarAvaliacao} className="space-y-3">
                            <p className="text-xs font-semibold text-center text-foreground">Como foi o atendimento deste serviço?</p>
                            <div className="flex justify-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setAvaliacaoNota(num)}
                                  className="text-amber-400 hover:scale-110 transition cursor-pointer"
                                >
                                  <Star size={24} fill={avaliacaoNota >= num ? "currentColor" : "none"} />
                                </button>
                              ))}
                            </div>
                            <input
                              value={avaliacaoComentario}
                              onChange={(e) => setAvaliacaoComentario(e.target.value)}
                              placeholder="Escreva um comentário opcional..."
                              className="w-full bg-secondary border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--moss)] placeholder:text-muted-foreground/60"
                            />

                            <button
                              type="submit"
                              disabled={enviandoAvaliacaoServico}
                              className="w-full bg-[var(--moss)] text-white hover:opacity-90 py-2.5 rounded-xl font-medium transition cursor-pointer text-xs"
                            >
                              {enviandoAvaliacaoServico ? "Enviando..." : "Enviar Avaliação"}
                            </button>
                          </form>
                        ) : (
                          <div className="text-center py-2 text-xs text-muted-foreground font-semibold">
                            ✓ Este atendimento foi encerrado e avaliado. Obrigado!
                          </div>
                        )}
                      </div>
                    ) : (
                      !sessaoSelecionada.servicoTipo.toLowerCase().includes("liga") && (
                        <form onSubmit={handleEnviarMensagem} className="p-3 border-t bg-card flex gap-2 shrink-0">
                          <input
                            value={textoMensagem}
                            onChange={(e) => setTextoMensagem(e.target.value)}
                            placeholder={sessaoSelecionada.madrinhaId ? "Escreva sua mensagem..." : "Aguardando aceite da Madrinha..."}
                            disabled={!sessaoSelecionada || !sessaoSelecionada.madrinhaId}
                            className="flex-1 bg-secondary border rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--moss)] placeholder:text-muted-foreground/60 disabled:opacity-60"
                          />
                          <button
                            type="submit"
                            disabled={!sessaoSelecionada || !textoMensagem.trim() || enviandoMensagem || !sessaoSelecionada.madrinhaId}
                            className="bg-[var(--moss)] text-white p-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer shrink-0"
                          >
                            <Send size={14} />
                          </button>
                        </form>
                      )
                    )}
                  </>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* Equipe de Madrinhas Locais */}
        {madrinhasTime.length > 0 && (
          <div className="bg-card border rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-semibold">Equipe Local de Madrinhas</h3>
              <p className="text-sm text-muted-foreground">Conheça as especialistas locais verificadas que dão suporte ao seu destino.</p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {madrinhasTime.map((m) => (
                <Link
                  key={m.id}
                  to="/madrinha/$id"
                  params={{
                    id: m.id.toString()
                  }}
                  className="border rounded-2xl p-5 hover:border-[var(--moss)] hover:shadow-md transition bg-background flex flex-col items-center text-center space-y-4 cursor-pointer group text-left"
                >
                  <img
                    src={m.fotoPerfilUrl || 'https://randomuser.me/api/portraits/women/44.jpg'}
                    alt={m.nome}
                    className="w-20 h-20 rounded-full border-2 border-[var(--moss)]/20 object-cover shadow-inner group-hover:scale-105 transition"
                  />
                  <div className="space-y-1 text-center">
                    <h4 className="font-bold text-sm text-foreground group-hover:text-[var(--moss)] transition">{m.nome}</h4>
                    <p className="text-xs text-muted-foreground">📍 {m.cidade}, {m.estado}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs border-t pt-3 w-full justify-around text-foreground/80">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold font-sans">Atendimentos</p>
                      <p className="font-bold text-emerald-700">{m.qtdSolicitacoes || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold font-sans">Avaliação</p>
                      <p className="font-bold text-amber-600 flex items-center gap-0.5 justify-center">
                        ★ {m.mediaAvaliacao ? m.mediaAvaliacao.toFixed(1) : "5.0"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

      {/* Modal/Formulário para Detalhamento de Serviços Específicos */}
      {modalServicoAtivo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleIniciarServicoSubmit} className="bg-card border rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-serif font-bold text-center">Especificação de Serviço</h3>
            
            <div className="p-3 bg-secondary/40 rounded-2xl text-xs space-y-1">
              <p className="font-semibold text-foreground">{modalServicoAtivo}</p>
              <p className="text-muted-foreground">O Time Recife receberá essas especificações para aceitar seu chamado.</p>
            </div>

            {/* Render conditional inputs */}
            {modalServicoAtivo.toLowerCase().includes("busca") && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Aeroporto de Destino</label>
                  <input
                    required
                    value={aeroporto}
                    onChange={(e) => setAeroporto(e.target.value)}
                    placeholder="Ex: Aeroporto Internacional do Recife"
                    className="w-full bg-secondary border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Horário Previsto de Desembarque</label>
                  <input
                    required
                    type="datetime-local"
                    value={horarioDesembarque}
                    onChange={(e) => setHorarioDesembarque(e.target.value)}
                    className="w-full bg-secondary border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">Custo fixo: <strong>10 créditos</strong></div>
              </div>
            )}

            {modalServicoAtivo.toLowerCase().includes("acompanhamento") && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto px-1">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ponto de Encontro</label>
                  <input
                    required
                    value={pontoEncontro}
                    onChange={(e) => setPontoEncontro(e.target.value)}
                    placeholder="Ex: Lobby do Hotel, ou Local X"
                    className="w-full bg-secondary border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Locais / Roteiro a Visitar</label>
                  <textarea
                    required
                    value={locaisVisitados}
                    onChange={(e) => setLocaisVisitados(e.target.value)}
                    placeholder="Ex: Marco Zero, Olinda Histórica, Praia de Boa Viagem..."
                    rows={2}
                    className="w-full bg-secondary border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--moss)] focus:outline-none resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Data de Início</label>
                    <input
                      required
                      type="date"
                      value={acompanhamentoDataInicio}
                      onChange={(e) => setAcompanhamentoDataInicio(e.target.value)}
                      className="w-full bg-secondary border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora de Início</label>
                    <input
                      required
                      type="time"
                      value={acompanhamentoHoraInicio}
                      onChange={(e) => setAcompanhamentoHoraInicio(e.target.value)}
                      className="w-full bg-secondary border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Data de Término</label>
                    <input
                      required
                      type="date"
                      value={acompanhamentoDataFim}
                      onChange={(e) => setAcompanhamentoDataFim(e.target.value)}
                      className="w-full bg-secondary border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Hora de Término</label>
                    <input
                      required
                      type="time"
                      value={acompanhamentoHoraFim}
                      onChange={(e) => setAcompanhamentoHoraFim(e.target.value)}
                      className="w-full bg-secondary border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[var(--moss)] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="p-3 bg-[var(--moss)]/5 border border-[var(--moss)]/10 rounded-xl flex items-center justify-between text-xs">
                  <span>Custo total calculado:</span>
                  <span className="font-bold text-[var(--moss)]">
                    {(() => {
                      if (!acompanhamentoDataInicio || !acompanhamentoDataFim) return "—";
                      const start = new Date(`${acompanhamentoDataInicio}T${acompanhamentoHoraInicio || "00:00"}`);
                      const end = new Date(`${acompanhamentoDataFim}T${acompanhamentoHoraFim || "00:00"}`);
                      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      const hours = Math.max(1, Math.ceil(diffHours));
                      return isNaN(hours) ? "—" : `${hours * 5} créditos (${hours}h)`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {modalServicoAtivo.toLowerCase().includes("dicas") && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Dúvida Inicial</label>
                  <textarea
                    required
                    value={duvidaInicial}
                    onChange={(e) => setDuvidaInicial(e.target.value)}
                    placeholder="Qual a sua principal dúvida no momento?"
                    rows={3}
                    className="w-full bg-secondary border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[var(--moss)] focus:outline-none resize-none"
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">Custo: <strong>1 crédito</strong></div>
              </div>
            )}

            {modalServicoAtivo.toLowerCase().includes("suporte") && (
              <div className="space-y-2 text-center text-xs text-muted-foreground py-4">
                <p>Este serviço consumirá os créditos correspondentes e abrirá a fila de chamada.</p>
                <p className="font-bold text-foreground">Deseja acionar?</p>
                <p className="text-xs text-[var(--moss)] font-bold mt-2">Custo: 3 créditos</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalServicoAtivo(null)}
                className="w-1/2 border py-3 rounded-2xl text-sm font-medium hover:bg-muted cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={iniciandoServico}
                className="w-1/2 bg-[var(--moss)] text-white py-3 rounded-2xl text-sm font-medium hover:opacity-90 cursor-pointer text-center"
              >
                {iniciandoServico ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </SiteShell>
  );
}
