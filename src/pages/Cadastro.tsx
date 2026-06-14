import { AlertCircle, ArrowLeft, Check, Facebook, Instagram, Linkedin, Mail, Phone, Video, RefreshCcw } from "lucide-react";
import axios from "axios";
import { api } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { readErrorMessage } from "@/lib/utils";
import { SiteShell } from "@/components/SiteShell";


export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full border rounded-xl px-3 py-3 bg-background focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
      />
    </label>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full border rounded-xl px-3 py-3 bg-background min-h-28 focus:outline-none focus:ring-2 focus:ring-[var(--moss)]"
      />
      {hint && <span className="text-xs text-muted-foreground mt-1 block">{hint}</span>}
    </label>
  );
}

type CadastroForm = {
  nome: string;
  idade: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  senha: string;
  confirmarSenha: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  bio: string;
  aceitouTermos: boolean;
};

type CadastroStep = "dados" | "video";
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
const CADASTRAR_USUARIA_ENDPOINT = "auth/cadastrar-usuaria";
const TIPO_DOCUMENTO_VIDEO = "VideoVerificacaoCadastro";
const VIDEO_MIME_TYPE = "video/webm";

type SolicitarUploadResponse = {
  url: string;
  nomeArquivo: string;
};

const EMPTY_CADASTRO_FORM: CadastroForm = {
  nome: "",
  idade: "",
  email: "",
  telefone: "",
  cidade: "",
  estado: "",
  senha: "",
  confirmarSenha: "",
  bio: "",
  linkedin: "",
  instagram: "",
  facebook: "",
  aceitouTermos: false,
};

export function Cadastro() {
  const [form, setForm] = useState<CadastroForm>(EMPTY_CADASTRO_FORM);
  const navigate = useNavigate();
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<CadastroStep>("dados");
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>("user");
  const [verification, setVerification] = useState<VideoVerificationState>({
    challenge: VERIFICATION_CHALLENGE,
    isCameraLoading: false,
    cameraError: "",
    isRecording: false,
    secondsLeft: 5,
    videoFile: null,
    previewUrl: "",
  });

  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreviewUrl, setFotoPreviewUrl] = useState<string>("");
  const [fotoError, setFotoError] = useState<string>("");

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFotoError("");
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type.toLowerCase()) && !file.name.toLowerCase().endsWith(".webp") && !file.name.toLowerCase().endsWith(".jpg") && !file.name.toLowerCase().endsWith(".jpeg") && !file.name.toLowerCase().endsWith(".png")) {
      setFotoError("Formato de imagem inválido. Use JPG, JPEG, PNG ou WEBP.");
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeBytes) {
      setFotoError("O arquivo excede o tamanho máximo permitido (5 MB).");
      return;
    }

    setFotoFile(file);
    if (fotoPreviewUrl) {
      URL.revokeObjectURL(fotoPreviewUrl);
    }
    setFotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoverFoto = () => {
    setFotoFile(null);
    if (fotoPreviewUrl) {
      URL.revokeObjectURL(fotoPreviewUrl);
      setFotoPreviewUrl("");
    }
  };

  useEffect(() => {
    return () => {
      if (fotoPreviewUrl) {
        URL.revokeObjectURL(fotoPreviewUrl);
      }
    };
  }, [fotoPreviewUrl]);

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

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const requiredLabels: Array<[keyof CadastroForm, string]> = [
    ["nome", "Nome completo"],
    ["idade", "Idade"],
    ["email", "E-mail"],
    ["telefone", "WhatsApp"],
    ["cidade", "Cidade"],
    ["estado", "Estado"],
    ["senha", "Senha"],
    ["confirmarSenha", "Confirmação de senha"],
    ["bio", "Conte um pouco sobre você"]
  ];

  const validate = () => {
    const missing = requiredLabels
      .filter(([key]) => !String(form[key]).trim())
      .map(([, label]) => label);

    if (missing.length > 0) {
      return `Preencha todos os campos obrigatórios: ${missing.join(", ")}.`;
    }

    if (!form.aceitouTermos) {
      return "Você precisa aceitar os termos de uso para continuar.";
    }

    if (form.senha.length < 6) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }

    if (form.senha !== form.confirmarSenha) {
      return "A senha e a confirmação de senha não conferem.";
    }

    return "";
  };

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
    setVerification((current) => ({
      ...current,
      videoFile: null,
      previewUrl: "",
      cameraError: "",
      secondsLeft: 5,
    }));
  }, []);

  const openCamera = useCallback(async (mode: CameraFacingMode = cameraFacingModeRef.current) => {
    if (!window.isSecureContext) {
      setVerification((current) => ({
        ...current,
        cameraError: "A câmera só funciona em conexão segura (HTTPS) ou em localhost. Se você estiver abrindo no celular por IP/HTTP, publique a aplicação em HTTPS.",
      }));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setVerification((current) => ({
        ...current,
        cameraError: "Seu navegador ou ambiente não expõe acesso à câmera. Tente atualizar o navegador ou abrir em HTTPS.",
      }));
      return;
    }

    setVerification((current) => ({
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

      setVerification((current) => ({
        ...current,
        cameraError: cameraErrorMessage,
      }));
    } finally {
      setVerification((current) => ({
        ...current,
        isCameraLoading: false,
      }));
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (verification.isRecording || verification.isCameraLoading) {
      return;
    }

    cleanupTimers();

    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    clearRecordedPreview();
    stopCamera();
    void openCamera(nextMode);
  }, [cameraFacingMode, cleanupTimers, clearRecordedPreview, openCamera, stopCamera, verification.isCameraLoading, verification.isRecording]);

  const startRecording = async () => {
    clearRecordedPreview();

    if (!streamRef.current) {
      await openCamera();
      if (!streamRef.current) return;
    }

    const stream = streamRef.current;
    const preferredMimeTypes = [
      "video/webm;codecs=vp8",
      "video/webm;codecs=vp9",
      "video/webm",
    ];
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

        const blob = new Blob(recordedChunksRef.current, { type: VIDEO_MIME_TYPE });
        const file = new File([blob], `verificacao-${Date.now()}.webm`, { type: VIDEO_MIME_TYPE });
        const nextPreviewUrl = URL.createObjectURL(blob);

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        previewUrlRef.current = nextPreviewUrl;

        setVerification((current) => ({
          ...current,
          isRecording: false,
          secondsLeft: 5,
          videoFile: file,
          previewUrl: nextPreviewUrl,
        }));

        stopCamera();
      };

      recorder.start();
      setVerification((current) => ({
        ...current,
        isRecording: true,
        secondsLeft: 5,
        cameraError: "",
      }));

      countdownIntervalRef.current = window.setInterval(() => {
        setVerification((current) => ({
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
      setVerification((current) => ({
        ...current,
        cameraError: "Não foi possível iniciar a gravação do vídeo.",
      }));
    }
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!verification.videoFile) {
      setError("Grave o vídeo de verificação antes de enviar o cadastro.");
      setStep("video");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log(verification.videoFile.type)
      const uploadRequest = await api.post<SolicitarUploadResponse>(SOLICITAR_UPLOAD_ENDPOINT, {
        tipoDocumento: TIPO_DOCUMENTO_VIDEO,
        tipoMime: VIDEO_MIME_TYPE,
        tamanhoEmBytes: verification.videoFile.size,
      });

      const { url, nomeArquivo } = uploadRequest.data;

      const uploadResponse = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": VIDEO_MIME_TYPE,
          "x-ms-blob-type": "BlockBlob",
        },
        body: verification.videoFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(await readErrorMessage(uploadResponse));
      }

      let publicFotoUrl: string | null = null;
      if (fotoFile) {
        const uploadFotoReq = await api.post<SolicitarUploadResponse>(SOLICITAR_UPLOAD_ENDPOINT, {
          tipoDocumento: "FotoPerfil",
          tipoMime: fotoFile.type || "image/jpeg",
          tamanhoEmBytes: fotoFile.size,
        });

        const uploadFotoRes = await fetch(uploadFotoReq.data.url, {
          method: "PUT",
          headers: {
            "Content-Type": fotoFile.type || "image/jpeg",
            "x-ms-blob-type": "BlockBlob",
          },
          body: fotoFile,
        });

        if (!uploadFotoRes.ok) {
          throw new Error("Falha ao enviar a foto de perfil: " + (await readErrorMessage(uploadFotoRes)));
        }

        publicFotoUrl = uploadFotoReq.data.nomeArquivo;
      }

      await api.post(CADASTRAR_USUARIA_ENDPOINT, {
        nome: form.nome,
        idade: form.idade,
        email: form.email,
        telefone: form.telefone,
        cidade: form.cidade,
        estado: form.estado,
        senha: form.senha,
        instagram: form.instagram?.trim() || null,
        linkedin: form.linkedin?.trim() || null,
        facebook: form.facebook?.trim() || null,
        bio: form.bio,
        videoVerificacao: nomeArquivo,
        fotoPerfilUrl: publicFotoUrl
      });

      setEnviado(true);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(await readErrorMessage(err.response ?? err));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Falha ao enviar cadastro.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step === "video") {
      void openCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [openCamera, step, stopCamera]);

  useEffect(() => {
    return () => {
      cleanupTimers();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cleanupTimers]);

  if (enviado) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--moss)]/15 text-[var(--moss)] flex items-center justify-center mx-auto mb-6">
          <Check size={40} />
        </div>
        <h1 className="text-4xl mb-3">Cadastro enviado!</h1>
        <p className="text-lg text-muted-foreground mb-2">
          Obrigada, {form.nome.split(" ")[0] || "querida"}.
        </p>
        <p className="text-muted-foreground mb-8">
          Recebemos seus dados e enviaremos um e-mail, assim que seu cadastro for analisado e aceito.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="rounded-full bg-[var(--moss)] text-white px-7 py-4 font-medium"
          >
            Ir para início
          </button>
        </div>
      </div>
    );
  }

  return (
    <SiteShell>
    <div className="max-w-3xl mx-auto px-6 py-10">
      <button
        onClick={() => navigate({ to: "/login" })}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl">Criar conta</h1>
        <p className="text-muted-foreground mt-2">
          Preencha seus dados e depois grave um vídeo curto de verificação.
        </p>
      </div>

      <div className="bg-card border rounded-3xl p-7 sm:p-10 shadow-sm">
        <div className="space-y-4">
          {step === "dados" ? (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Nome completo"
                  value={form.nome}
                  onChange={(v) => set("nome", v)}
                  placeholder="Maria Silva"
                  required
                />
                <Field
                  label="Idade"
                  value={form.idade}
                  onChange={(v) => set("idade", v)}
                  placeholder="48"
                  type="number"
                  required
                />
              </div>
              <Field
                icon={<Mail size={16} />}
                label="E-mail"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="seuemail@exemplo.com"
                type="email"
                required
              />
              <Field
                icon={<Phone size={16} />}
                label="WhatsApp"
                value={form.telefone}
                onChange={(v) => set("telefone", v)}
                placeholder="(00) 00000-0000"
                required
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Senha"
                  value={form.senha}
                  onChange={(v) => set("senha", v)}
                  placeholder="Crie uma senha"
                  type="password"
                  required
                />
                <Field
                  label="Confirmar senha"
                  value={form.confirmarSenha}
                  onChange={(v) => set("confirmarSenha", v)}
                  placeholder="Repita a senha"
                  type="password"
                  required
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Field
                    label="Cidade"
                    value={form.cidade}
                    onChange={(v) => set("cidade", v)}
                    placeholder="Lençóis"
                    required
                  />
                </div>
                <Field
                  label="Estado (UF)"
                  value={form.estado}
                  onChange={(v) => set("estado", v.toUpperCase().slice(0, 2))}
                  placeholder="BA"
                  required
                />
              </div>
              <div className="space-y-2 border-t pt-4">
                <span className="text-sm font-medium text-foreground block">Foto de perfil (opcional)</span>
                <div className="flex items-center gap-4 mt-2">
                  {fotoPreviewUrl ? (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border">
                      <img src={fotoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center border border-dashed text-muted-foreground text-xs text-center font-medium">
                      Sem foto
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <label className="cursor-pointer bg-white border hover:bg-muted text-foreground px-4 py-2 rounded-xl text-xs font-semibold shadow-sm inline-block">
                        Selecionar foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFotoChange}
                          className="hidden"
                        />
                      </label>
                      {fotoFile && (
                        <button
                          type="button"
                          onClick={handleRemoverFoto}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-2 border border-red-200 hover:bg-red-50 rounded-xl transition"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">Formatos aceitos: JPG, JPEG, PNG ou WEBP. Máx. 5MB.</span>
                  </div>
                </div>
                {fotoError && (
                  <p className="text-xs text-red-600 mt-1">{fotoError}</p>
                )}
              </div>
              <Textarea
                label="Conte um pouco sobre você"
                value={form.bio}
                onChange={(v) => set("bio", v)}
                placeholder="Ex: Cheguei em Lençóis aos 28 anos..."
                required
              />
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Redes sociais (opcionais). Informe apenas perfis públicos que você autoriza para análise de perfil.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field
                    icon={<Instagram size={16} />}
                    label="Instagram (opcional)"
                    value={form.instagram ?? ""}
                    onChange={(v) => set("instagram", v)}
                    placeholder="https://instagram.com/seu_usuario — opcional, apenas público"
                  />
                  <Field
                    icon={<Facebook size={16} />}
                    label="Facebook (opcional)"
                    value={form.facebook ?? ""}
                    onChange={(v) => set("facebook", v)}
                    placeholder="https://facebook.com/seu_perfil — opcional, apenas público"
                  />
                  <Field
                    icon={<Linkedin size={16} />}
                    label="LinkedIn (opcional)"
                    value={form.linkedin ?? ""}
                    onChange={(v) => set("linkedin", v)}
                    placeholder="https://linkedin.com/in/seu_usuario — opcional, apenas público"
                  />
                </div>
              </div>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aceitouTermos}
                  onChange={(e) => set("aceitouTermos", e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[var(--moss)]"
                  required
                />
                <span>
                  Concordo com os <a className="text-[var(--moss)] underline">termos de uso</a>.
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate({ to: "/" })}
                  className="flex-1 border rounded-full py-4 font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const validationError = validate();
                    if (validationError) {
                      setError(validationError);
                      return;
                    }

                    setError("");
                    setStep("video");
                  }}
                  className="flex-1 bg-[var(--moss)] text-white rounded-full py-4 font-medium hover:opacity-90 transition cursor-pointer"
                >
                  Seguir para vídeo
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border bg-[var(--sand)]/30 p-5 sm:p-6 space-y-4">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--terracotta)]">Verificação por vídeo</p>
                <h2 className="text-2xl font-medium">Grave um vídeo de 5 segundos</h2>
                <p className="text-muted-foreground">
                  O objetivo é realizar uma breve verificação de que o cadastro está sendo feito por uma pessoa real, e não por um bot ou fraude. O vídeo é leve, não captura áudio e é usado apenas para análise interna durante a aprovação do cadastro.
                </p>
                <div className="rounded-2xl bg-white/80 border p-4">
                  <p className="text-sm font-medium mb-1">Instrução para o vídeo</p>
                  <p className="text-sm text-muted-foreground">{verification.challenge}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  O áudio não é capturado.
                </p>
              </div>

              {verification.cameraError ? (
                <p className="text-sm text-red-600">{verification.cameraError}</p>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl overflow-hidden border bg-black min-h-[280px] relative">
                  {verification.previewUrl ? (
                    <video
                      src={verification.previewUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full min-h-[280px] object-cover"
                    />
                  )}

                  {verification.isCameraLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-sm">
                      Abrindo câmera...
                    </div>
                  ) : null}

                  {verification.isRecording ? (
                    <div className="absolute top-4 left-4 rounded-full bg-red-600 text-white px-3 py-1 text-sm font-medium">
                      Gravando... {verification.secondsLeft}s
                    </div>
                  ) : null}

                  {verification.previewUrl ? (
                    <div className="absolute bottom-4 left-4 rounded-full bg-black/70 text-white px-3 py-1 text-sm">
                      Vídeo leve pronto para envio
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border p-5">
                    <p className="text-sm font-medium mb-2">Como funciona</p>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      <li>Abra a câmera e confirme as permissões do navegador.</li>
                      <li>Clique para gravar um vídeo curto de 5 segundos.</li>
                      <li>Se quiser, refaça a gravação antes de enviar.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={verification.isRecording || verification.isCameraLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--moss)] text-white px-6 py-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                    >
                      <Video size={18} />
                      {verification.isRecording ? "Gravando..." : verification.videoFile ? "Gravar novamente" : "Gravar vídeo de 5s"}
                    </button>

                    <button
                      type="button"
                      onClick={toggleCamera}
                      disabled={verification.isRecording || verification.isCameraLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-full border px-6 py-4 font-medium hover:opacity-90 transition"
                    >
                      <RefreshCcw size={18} />
                      Trocar câmera
                    </button>

                    <button
                      type="button"
                      onClick={submit}
                      disabled={loading || !verification.videoFile}
                      className="inline-flex items-center justify-center rounded-full bg-black text-white px-6 py-4 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
                    >
                      {loading ? "Enviando..." : "Enviar cadastro com vídeo"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("dados")}
                      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                    >
                      Voltar para editar dados
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error ? (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50/95 p-4 sm:p-5 text-red-900 shadow-[0_12px_30px_rgba(239,68,68,0.12)]">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Não foi possível concluir o cadastro</p>
                  <p className="mt-1 text-sm leading-6">{error}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
    </SiteShell>
  );
}