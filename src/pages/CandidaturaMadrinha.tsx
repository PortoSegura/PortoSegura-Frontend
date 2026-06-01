import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Facebook, FileText, Heart, Instagram, Linkedin, Lock, Mail, MapPin, Phone, RefreshCcw, Sparkles, User, Video, Calendar } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { SiteShell } from "@/components/SiteShell";
import { api } from "@/lib/api";
import { readErrorMessage } from "@/lib/utils";

type CameraFacingMode = "user" | "environment";

type VideoVerificationState = {
  challenge: string;
  isCameraLoading: boolean;
  cameraError: string;
  isRecording: boolean;
  secondsLeft: number;
  videoFile: File | null;
  previewUrl: string;
};

const VERIFICATION_CHALLENGE = "Ao iniciar a gravação, comece com a cabeca virada para a esquerda e vá virando lentamente para a direita até o final da gravação.";
const SOLICITAR_UPLOAD_ENDPOINT = "documentos/solicitar-upload";
const CADASTRAR_MADRINHA_ENDPOINT = "auth/cadastrar-madrinha";
const TIPO_DOCUMENTO_VIDEO = "VideoVerificacaoMadrinha";
const VIDEO_MIME_TYPE = "video/webm";

type SolicitarUploadResponse = {
  url: string;
  nomeArquivo: string;
};

function formatTelefone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function Candidatura() {
  const [passo, setPasso] = useState(1);
  const [form, setForm] = useState({
    nome: "", idade: "", email: "", telefone: "",
    senha: "", confirmarSenha: "",
    instagram: "", facebook: "", linkedin: "",
    cidade: "", estado: "", anosNoLocal: "",
    bio: "", motivacao: "", precoDiaria: "70",
    aceitouTermos: false,
  });
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>("user");
  const [video, setVideo] = useState<VideoVerificationState>({
    challenge: VERIFICATION_CHALLENGE,
    isCameraLoading: false,
    cameraError: "",
    isRecording: false,
    secondsLeft: 5,
    videoFile: null,
    previewUrl: "",
  });

  const navigate = useNavigate();

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const countdownIntervalRef = useRef<number | null>(null);
  const stopTimeoutRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string>("");
  const cameraFacingModeRef = useRef<CameraFacingMode>("user");

  useEffect(() => {
    cameraFacingModeRef.current = cameraFacingMode;
  }, [cameraFacingMode]);

  const set = (k: keyof typeof form, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const cleanupTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    cleanupTimers();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  }, [cleanupTimers]);

  const clearRecordedPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = "";
    }

    recordedChunksRef.current = [];
    setVideo((current) => ({
      ...current,
      videoFile: null,
      previewUrl: "",
      cameraError: "",
      secondsLeft: 5,
    }));
  }, []);

  const openCamera = useCallback(async (mode: CameraFacingMode = cameraFacingModeRef.current) => {
    if (!window.isSecureContext) {
      setVideo((current) => ({
        ...current,
        cameraError: "A câmera só funciona em conexão segura (HTTPS) ou em localhost.",
      }));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVideo((current) => ({
        ...current,
        cameraError: "Seu navegador ou ambiente não expõe acesso à câmera.",
      }));
      return;
    }

    setVideo((current) => ({
      ...current,
      isCameraLoading: true,
      cameraError: "",
    }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        await liveVideoRef.current.play();
      }
    } catch (err) {
      const cameraErrorName = err instanceof DOMException ? err.name : "";
      const cameraErrorMessage =
        cameraErrorName === "NotAllowedError"
          ? "Permissão da câmera negada. Autorize o acesso à câmera nas configurações do navegador."
          : cameraErrorName === "NotFoundError"
            ? "Nenhuma câmera foi encontrada no dispositivo."
            : cameraErrorName === "NotReadableError"
              ? "A câmera está em uso por outro aplicativo ou site. Feche o que estiver usando a câmera e tente novamente."
              : "Não foi possível acessar a câmera. Verifique as permissões do navegador e tente novamente.";

      setVideo((current) => ({
        ...current,
        cameraError: cameraErrorMessage,
      }));
    } finally {
      setVideo((current) => ({
        ...current,
        isCameraLoading: false,
      }));
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (video.isRecording || video.isCameraLoading) return;

    cleanupTimers();
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    clearRecordedPreview();
    stopCamera();
    void openCamera(nextMode);
  }, [cameraFacingMode, clearRecordedPreview, openCamera, stopCamera, cleanupTimers, video.isCameraLoading, video.isRecording]);

  const startRecording = async () => {
    clearRecordedPreview();

    if (!streamRef.current) {
      await openCamera();
      if (!streamRef.current) return;
    }

    const stream = streamRef.current;
    const preferredMimeTypes = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
    const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

    recordedChunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 350_000 } : { videoBitsPerSecond: 350_000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        cleanupTimers();

        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const file = new File([blob], `candidatura-${Date.now()}.webm`, { type: "video/webm" });
        const nextPreviewUrl = URL.createObjectURL(blob);

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        previewUrlRef.current = nextPreviewUrl;

        setVideo((current) => ({
          ...current,
          isRecording: false,
          secondsLeft: 5,
          videoFile: file,
          previewUrl: nextPreviewUrl,
        }));

        stopCamera();
      };

      recorder.start();
      setVideo((current) => ({
        ...current,
        isRecording: true,
        secondsLeft: 5,
        cameraError: "",
      }));

      countdownIntervalRef.current = window.setInterval(() => {
        setVideo((current) => ({
          ...current,
          secondsLeft: Math.max(0, current.secondsLeft - 1),
        }));
      }, 1000);

      stopTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }, 5000);
    } catch {
      setVideo((current) => ({
        ...current,
        cameraError: "Não foi possível iniciar a gravação do vídeo.",
      }));
    }
  };

  const validate = () => {
    if (!form.nome || !form.idade || !form.email || !form.telefone || !form.senha || !form.confirmarSenha) {
      return "Preencha os dados obrigatórios antes de enviar a candidatura.";
    }

    if (!form.cidade || !form.estado || !form.bio || !form.motivacao) {
      return "Complete as etapas anteriores antes de enviar a candidatura.";
    }

    if (form.senha.length < 6) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (form.senha !== form.confirmarSenha) {
      return "A senha e a confirmação de senha não conferem.";
    }

    if (!form.aceitouTermos) {
      return "Você precisa aceitar os termos de uso para continuar.";
    }

    if (!video.videoFile) {
      return "Grave o vídeo de verificação antes de enviar a candidatura.";
    }

    return "";
  };

  const submit = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      if (validationError.includes("vídeo")) {
        setPasso(4);
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      const uploadResponse = await api.post<SolicitarUploadResponse>(SOLICITAR_UPLOAD_ENDPOINT, {
        tipoDocumento: TIPO_DOCUMENTO_VIDEO,
        tipoMime: video.videoFile?.type || VIDEO_MIME_TYPE,
        tamanhoEmBytes: video.videoFile?.size ?? 0,
      });

      if (video.videoFile) {
        await axios.put(uploadResponse.data.url, video.videoFile, {
          headers: {
            "Content-Type": video.videoFile.type || VIDEO_MIME_TYPE,
            "x-ms-blob-type": "BlockBlob",
          },
        });
      }

      await api.post(CADASTRAR_MADRINHA_ENDPOINT, {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        senha: form.senha,
        bio: form.bio,
        precoDiaria: form.precoDiaria,
        motivacao: form.motivacao,
        estado: form.estado,
        cidade: form.cidade,
        videoVerificacao: uploadResponse.data.nomeArquivo,
        linkedin: form.linkedin || undefined,
        instagram: form.instagram || undefined,
        facebook: form.facebook || undefined,
      });

      setEnviado(true);
    } catch (err) {
      setError(await readErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const Step = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${passo >= n ? "bg-[var(--moss)] text-white" : "bg-muted text-muted-foreground"}`}>
        {passo > n ? <Check size={16}/> : n}
      </div>
      <span className={`text-sm hidden sm:inline ${passo >= n ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );

  useEffect(() => {
    if (passo !== 4) {
      stopCamera();
      return;
    }

    if (!video.previewUrl) {
      void openCamera();
    }

    return () => {
      stopCamera();
    };
  }, [openCamera, passo, stopCamera, video.previewUrl]);

  if (enviado) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--moss)]/15 text-[var(--moss)] flex items-center justify-center mx-auto mb-6">
          <Check size={40}/>
        </div>
        <h1 className="text-4xl mb-3">Candidatura enviada!</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Obrigada, <strong>{form.nome.split(" ")[0] || "querida"}</strong>. Recebemos sua história.
        </p>
        <p className="text-muted-foreground mb-8">
          Nossa equipe analisa em até <strong>5 dias úteis</strong> e entra em contato pelo e-mail <strong>{form.email}</strong> para a próxima etapa: a entrevista por vídeo.
        </p>
        <div className="bg-[var(--sand)]/40 rounded-2xl p-6 text-left mb-8">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--terracotta)] mb-3">Próximos passos</p>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-3"><span className="font-semibold text-[var(--moss)]">1.</span> Análise da candidatura (até 5 dias)</li>
            <li className="flex gap-3"><span className="font-semibold text-[var(--moss)]">2.</span> Entrevista por vídeo (30 min)</li>
            <li className="flex gap-3"><span className="font-semibold text-[var(--moss)]">3.</span> Treinamento online (8h, no seu ritmo)</li>
            <li className="flex gap-3"><span className="font-semibold text-[var(--moss)]">4.</span> Seu perfil entra na plataforma</li>
          </ol>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => navigate({ to: "/" })} className="rounded-full border px-7 py-4 font-medium">Voltar para o início</button>
        </div>
      </div>
    );
  }

  return (
    <SiteShell>
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button onClick={() => navigate({ to: "/jornada-madrinha" })} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16}/> Voltar para a jornada
      </button>

      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--terracotta)]/20 bg-[var(--terracotta)]/10 text-[var(--terracotta)] px-3 py-1 text-xs font-medium">
          <Sparkles size={14}/> Etapa 1: Candidatura
        </span>
        <h1 className="text-3xl sm:text-4xl mt-4">Quero me candidatar</h1>
        <p className="text-muted-foreground mt-3">Conte sua história. Leva cerca de 10 minutos.</p>
      </div>

      <div className="flex items-center justify-between mb-8 gap-2">
        <Step n={1} label="Sobre você"/>
        <div className="h-px flex-1 bg-border min-w-4"/>
        <Step n={2} label="Sua cidade"/>
        <div className="h-px flex-1 bg-border min-w-4"/>
        <Step n={3} label="Sua história"/>
        <div className="h-px flex-1 bg-border min-w-4"/>
        <Step n={4} label="Vídeo"/>
        <div className="h-px flex-1 bg-border min-w-4"/>
        <Step n={5} label="Confirmação"/>
      </div>

      <div className="bg-card border rounded-3xl p-7 sm:p-10 shadow-sm">
        {passo === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl flex items-center gap-2"><User size={22} className="text-[var(--moss)]"/> Sobre você</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nome completo" value={form.nome} onChange={v => set("nome", v)} placeholder="Maria Silva"/>
              <Field label="Idade" value={form.idade} onChange={v => set("idade", v)} placeholder="48" type="number"/>
            </div>
            <Field icon={<Mail size={16}/>} label="E-mail" type="email" value={form.email} onChange={v => set("email", v)} placeholder="seuemail@exemplo.com"/>
            <Field icon={<Phone size={16}/>} label="WhatsApp" type="tel" value={form.telefone} onChange={v => set("telefone", formatTelefone(v))} placeholder="(00) 00000-0000"/>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field icon={<Lock size={16}/>} label="Senha" type="password" value={form.senha} onChange={v => set("senha", v)} placeholder="Crie uma senha"/>
              <Field icon={<Lock size={16}/>} label="Confirmar senha" type="password" value={form.confirmarSenha} onChange={v => set("confirmarSenha", v)} placeholder="Repita a senha"/>
            </div>
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">Redes sociais (opcionais). Informe apenas perfis públicos.</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <Field icon={<Instagram size={16}/>} label="Instagram (opcional)" value={form.instagram} onChange={v => set("instagram", v)} placeholder="https://instagram.com/..."/>
                <Field icon={<Facebook size={16}/>} label="Facebook (opcional)" value={form.facebook} onChange={v => set("facebook", v)} placeholder="https://facebook.com/..."/>
                <Field icon={<Linkedin size={16}/>} label="LinkedIn (opcional)" value={form.linkedin} onChange={v => set("linkedin", v)} placeholder="https://linkedin.com/in/..."/>
              </div>
            </div>
            <NavBtns next={() => setPasso(2)} canNext={!!form.nome && !!form.email && !!form.idade && !!form.telefone && !!form.senha && form.senha === form.confirmarSenha && form.senha.length >= 6}/>
          </div>
        )}

        {passo === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl flex items-center gap-2"><MapPin size={22} className="text-[var(--moss)]"/> Sua cidade</h2>
            <p className="text-sm text-muted-foreground">A cidade onde você mora é o destino que você vai acompanhar.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Field label="Cidade" value={form.cidade} onChange={v => set("cidade", v)} placeholder="Lençóis"/>
              </div>
              <Field label="Estado (UF)" value={form.estado} onChange={v => set("estado", v.toUpperCase().slice(0, 2))} placeholder="BA"/>
            </div>
            <Field icon={<Calendar size={16}/>} label="Há quantos anos você mora aí?" value={form.anosNoLocal} onChange={v => set("anosNoLocal", v)} placeholder="15" type="number"/>
            <div>
              <label className="block text-sm font-medium mb-1">Quanto você quer cobrar por diária? (R$)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={40} max={150} step={5} value={form.precoDiaria}
                  onChange={e => set("precoDiaria", e.target.value)} className="flex-1 accent-[var(--moss)]"/>
                <span className="font-serif text-2xl text-[var(--terracotta)] w-20 text-right">R$ {form.precoDiaria}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Você pode mudar depois. Comissão da plataforma: 15%.</p>
            </div>
            <NavBtns prev={() => setPasso(1)} next={() => setPasso(3)} canNext={!!form.cidade && !!form.estado && !!form.anosNoLocal && !!form.precoDiaria}/>
          </div>
        )}

        {passo === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl flex items-center gap-2"><FileText size={22} className="text-[var(--moss)]"/> Sua história</h2>
            <Textarea label="Conte um pouco sobre você"
              value={form.bio} onChange={v => set("bio", v)}
              placeholder="Ex: Cheguei em Lençóis aos 28 anos atrás de paz, e nunca mais saí..."
              hint="Algumas linhas. Aparecerá no seu perfil."/>
            <Textarea label="Por que você quer ser uma Madrinha?"
              value={form.motivacao} onChange={v => set("motivacao", v)}
              placeholder="O que te move a acolher outras mulheres viajando sozinhas?"/>
            <NavBtns prev={() => setPasso(2)} next={() => setPasso(4)} canNext={form.bio.length > 20 && form.motivacao.length > 20}/>
          </div>
        )}

        {passo === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl flex items-center gap-2"><Video size={22} className="text-[var(--moss)]"/> Verificação por vídeo</h2>
            <p className="text-sm text-muted-foreground">Grave um vídeo de 5 segundos seguindo a instrução abaixo.</p>
            <div className="rounded-3xl border bg-[var(--sand)]/30 p-5 sm:p-6 space-y-4">
              <div className="rounded-2xl bg-white/80 border p-4">
                <p className="text-sm font-medium mb-1">Instrução para o vídeo</p>
                <p className="text-sm text-muted-foreground">{video.challenge}</p>
              </div>
              <p className="text-xs text-muted-foreground">O áudio não é capturado.</p>
            </div>

            {video.cameraError ? <p className="text-sm text-red-600">{video.cameraError}</p> : null}

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl overflow-hidden border bg-black min-h-[280px] relative">
                {video.previewUrl ? (
                  <video src={video.previewUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full min-h-[280px] object-cover" />
                )}

                {video.isCameraLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm">Abrindo câmera...</div>
                ) : null}

                {video.isRecording ? (
                  <div className="absolute top-4 left-4 rounded-full bg-red-600 text-white px-3 py-1 text-sm font-medium">
                    Gravando... {video.secondsLeft}s
                  </div>
                ) : null}

                {video.previewUrl ? (
                  <div className="absolute bottom-4 left-4 rounded-full bg-black/70 text-white px-3 py-1 text-sm">Vídeo pronto</div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border p-5">
                  <p className="text-sm font-medium mb-2">Como funciona</p>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>Abra a câmera e grave por 5 segundos.</li>
                    <li>Se quiser, troque a câmera para frontal/traseira.</li>
                    <li>Regrave se necessário antes de continuar.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <button type="button" onClick={startRecording} disabled={video.isRecording || video.isCameraLoading} className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--moss)] text-white px-6 py-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition">
                    <Video size={18} />
                    {video.isRecording ? "Gravando..." : video.videoFile ? "Gravar novamente" : "Gravar vídeo de 5s"}
                  </button>

                  <button type="button" onClick={toggleCamera} disabled={video.isRecording || video.isCameraLoading} className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-4 font-medium hover:opacity-90 transition">
                    <RefreshCcw size={18} />
                    Trocar câmera
                  </button>

                  <button type="button" onClick={() => setPasso(5)} disabled={!video.videoFile} className="inline-flex items-center justify-center rounded-full bg-black text-white px-6 py-4 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition">
                    Continuar
                  </button>

                  <button type="button" onClick={() => setPasso(3)} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4">Voltar para a história</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {passo === 5 && (
          <div className="space-y-5">
            <h2 className="text-2xl flex items-center gap-2"><Heart size={22} className="text-[var(--terracotta)] fill-[var(--terracotta)]"/> Confirmação</h2>
            <div className="bg-[var(--sand)]/40 rounded-2xl p-5 space-y-2 text-sm">
              <Row k="Nome" v={form.nome}/>
              <Row k="Idade" v={form.idade ? `${form.idade} anos` : "—"}/>
              <Row k="Cidade" v={form.cidade && form.estado ? `${form.cidade}, ${form.estado}` : "—"}/>
              <Row k="Anos no local" v={form.anosNoLocal ? `${form.anosNoLocal} anos` : "—"}/>
              <Row k="Diária" v={`R$ ${form.precoDiaria}`}/>
              <Row k="E-mail" v={form.email}/>
              <Row k="Telefone" v={form.telefone}/>
            </div>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={form.aceitouTermos} onChange={e => set("aceitouTermos", e.target.checked)} className="mt-1 w-4 h-4 accent-[var(--moss)]"/>
              <span>
                Concordo com a <a className="text-[var(--moss)] underline">checagem de antecedentes</a>, com os <a className="text-[var(--moss)] underline">termos de uso</a> e entendo que a aprovação depende da entrevista e do treinamento.
              </span>
            </label>
            <div className="flex gap-3">
                <button onClick={() => setPasso(4)} className="flex-1 border rounded-full py-4 font-medium" disabled={loading}>Voltar</button>
              <button
                disabled={!form.aceitouTermos || loading}
                onClick={submit}
                className="flex-1 bg-[var(--moss)] text-white rounded-full py-4 font-medium disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading ? "Enviando..." : "Enviar candidatura"} <ArrowRight size={18}/>
              </button>
            </div>
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
    </SiteShell>
  );
}

/* ---- inputs ---- */
function Field({
  label, value, onChange, placeholder, type = "text", icon,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; icon?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium inline-flex items-center gap-1.5">{icon}{label}</span>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full border rounded-xl px-3 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full border rounded-xl px-3 py-3 bg-background min-h-28 focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"/>
      {hint && <span className="text-xs text-muted-foreground mt-1 block">{hint}</span>}
    </label>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-right">{v || "—"}</span>
    </div>
  );
}

function NavBtns({ prev, next, canNext }: { prev?: () => void; next: () => void; canNext: boolean }) {
  return (
    <div className="flex gap-3 pt-2">
      {prev && <button onClick={prev} className="flex-1 border rounded-full py-4 font-medium">Voltar</button>}
      <button
        disabled={!canNext}
        onClick={next}
        className="flex-1 bg-[var(--moss)] text-white rounded-full py-4 font-medium disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        Continuar <ArrowRight size={18}/>
      </button>
    </div>
  );
}
