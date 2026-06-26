<div align="center">
 <img width="200" alt="Image" src="https://github.com/user-attachments/assets/3437d0ce-ae16-4781-b9f3-6281262d94ce" />
  
  <h1>Porto Segura - Viaje solo, nunca sozinha</h1>
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Deploy-Netlify-blue?style=for-the-badge&logo=netlify" alt="Deploy na Netlify" />
  <img src="https://img.shields.io/badge/YouTube-Vídeos_da_Aplicação-red?style=for-the-badge&logo=youtube" alt="Vídeos no YouTube" />
</p>

**Porto Segura** não é um site de viagens. É uma plataforma que remove o atrito do medo através de uma rede de apoio, sem perder a autonomia da viagem solo. Desenvolvido exclusivamente para mulheres, nossa solução conecta viajantes a um Time de Madrinhas locais, rigorosamente verificadas e prontas para oferecer suporte técnico e acolhimento.

🚀 **Aplicação em Produção:** [https://portosegura.netlify.app/](https://portosegura.netlify.app/)
📺 **Vídeos da Aplicação Rodando:** [https://www.youtube.com/@PortoSegura-g3t/videos](https://www.youtube.com/@PortoSegura-g3t/videos)

### 🧪 Acesso para Testes

Experimente a jornada de acolhimento da **Porto Segura** utilizando os perfis homologados abaixo:

| Perfil | E-mail | Senha |
| :--- | :--- | :--- |
| **Madrinha** | `camila.souza@portosegura.local` | `Senha@12345` |
| **Usuária** | `bruna.martins@portosegura.local` | `Senha@12345` |

> **Nota:** As contas estão pré-configuradas com dados fictícios para permitir a navegação completa pelas funcionalidades da aplicação.

---


## 🎯 O Problema e a Relevância
Atualmente, mulheres deixam de viajar sozinhas por falta de segurança. A falta de uma rede de apoio confiável, o receio de sofrer assédio e a dificuldade de obter auxílio em locais desconhecidos geram insegurança.
- **59%** das brasileiras desejam viajar sozinhas, mas ainda não o fizeram.
- **62%** já desistiram de uma viagem solo por medo de violência ou assédio.

Enquanto comunidades na internet oferecem acolhimento (mas sem verificação ou segurança) e agências de turismo oferecem viagens em grupo (que diminuem a sensação de vulnerabilidade, mas tiram parte da autonomia), o **Porto Segura oferece Autonomia Assistida**.

## 💡 Nossa Proposta de Valor: Autonomia Assistida
Garantimos a segurança da viajante através de **Madrinhas**, que são moradoras locais, verificadas (redes sociais, vídeo e entrevista), dispostas a oferecer suporte, acolhimento e segurança às viajantes solo através da plataforma em troca de uma remuneração justa.

O funcionamento se dá através de um **Sistema de Créditos** (1 Crédito = R$ 7,00, com pacotes promocionais), garantindo flexibilidade, autonomia e antecipação de receita, permitindo consumo assistido sob demanda.

### Catálogo de Serviços
- **Dicas Locais / Chat (2 CR):** Orientações rápidas e curadoria personalizada de pontos turísticos e locais seguros.
- **Ligação Suporte (3 CR):** Atendimento direto via chat para resolução de dúvidas críticas ou suporte imediato.
- **Busca no Aeroporto (15 CR):** Recepção no desembarque e acompanhamento até o seu local de hospedagem.
- **Acompanhamento Presencial (6 CR por hora):** Acompanhamento da usuária, explorando a cidade e pontos turísticos com segurança.
*(Nota: O MVP da plataforma foca na cidade de Recife).*

## ✅ O que já está implementado (MVP)

A fundação do negócio está construída. O sistema consegue gerenciar as entidades principais (Usuárias e Madrinhas) e orquestrar a contratação de serviços através de um sistema de créditos.

1. **Autenticação e Gestão de Usuários:**
   - Cadastro e Login com distinção de perfis (`Usuaria` e `Madrinha`).
   - Gerenciamento de perfil e dashboard básico no frontend.
2. **Jornada da Madrinha:**
   - Fluxo de candidatura (`candidatura.tsx`).
   - Upload de documentos para verificação e análise (`DocumentosController` utilizando Blob Storage).
   - Área exclusiva para gerenciar sua disponibilidade e perfil.
3. **Contratação de Serviços (Viagem Assistida):**
   - Busca de Madrinhas por destino/time local.
   - Criação de Solicitações (viagens) onde as usuárias podem requisitar serviços do catálogo (dicas, ligação de suporte, busca no aeroporto, acompanhamento).
4. **Comunicação e Avaliação:**
   - Sistema de **Chat** nativo (via SignalR) para comunicação entre a viajante e a Madrinha.
   - Sistema de **Avaliação** (`AvaliacaoController`) para ranquear o serviço prestado.
5. **Sistema de Créditos (Simulação):**
   - A lógica da carteira (CarteiraController), pacotes de créditos (Exploradora, Segurança Total, etc) e débito de créditos por serviço está estruturada no banco de dados, registrando o histórico de transações.

---

## 🚀 Próximos Passos

As seguintes funcionalidades precisam ser implementadas ou integradas com serviços externos reais para que a plataforma possa operar comercialmente.

### 1. Integração com Gateway de Pagamento Real (Crítica)
- **Status Atual:** A compra de créditos e pacotes na `CarteiraController` apenas simula a adição de saldo (`usuaria.SaldoCreditos += creditos`) e grava a transação.
- **A Fazer:** Integrar um gateway de pagamento real (ex: **Stripe**, **Mercado Pago** ou **Pagar.me**) via Webhooks. O fluxo deve gerar um PIX ou processar o cartão de crédito e só creditar o saldo após o provedor confirmar o pagamento.

### 2. Sistema de Saque / Payout (Split de Pagamentos)
- **Status Atual:** O sistema calcula e gerencia créditos, mas as Madrinhas ainda não conseguem sacar seu dinheiro real.
- **A Fazer:** Implementar um fluxo financeiro onde o crédito ganho pela Madrinha possa ser convertido em dinheiro. O gateway de pagamento escolhido deve preferencialmente suportar **Split de Pagamentos**, retendo a taxa da plataforma (15%) automaticamente e transferindo o restante para a conta bancária/PIX da Madrinha.

### 3. Validação de Identidade Automatizada (KYC)
- **Status Atual:** Há o upload de documentos, o que sugere validação.
- **A Fazer:** Para escalar a verificação rigorosa prometida pelo negócio, integrar com um serviço de verificação de identidade e biometria (ex: **unico**, **Incognia**, ou **Idwall**) para validar automaticamente a documentação e antecedentes criminais das candidatas a Madrinhas.

### 4. Notificações em Tempo Real e Push
- **Status Atual:** O chat funciona via SignalR, mas requer a aplicação aberta.
- **A Fazer:** Implementar Web Push Notifications (ex: Firebase Cloud Messaging - FCM) ou notificações por SMS/WhatsApp (ex: Twilio) para garantir que a Madrinha e a Viajante sejam alertadas instantaneamente de emergências, novas solicitações ou mensagens urgentes quando não estiverem com o app aberto.

### 5. Backoffice / Painel Administrativo
- **A Fazer:** Criar um painel frontend robusto exclusivo para os Operadores da plataforma. Nele, será possível aprovar/recusar candidaturas de Madrinhas, resolver disputas (refunds de créditos), e monitorar métricas financeiras (taxa de ocupação de madrinhas, venda de pacotes).


## 🛠️ Tecnologias Utilizadas (Frontend)
Este repositório contém o código-fonte da interface de usuário da plataforma. Construído com as melhores práticas e ferramentas modernas do ecossistema web:
- **React 19** & **TypeScript**
- **Vite** (Build Tool)
- **Tailwind CSS v4** (Estilização)
- **Radix UI** & **Lucide React** (Componentes de UI acessíveis e Ícones)
- **TanStack Router** & **TanStack Query** (Roteamento e Gerenciamento de Estado)
- **React Hook Form** & **Zod** (Formulários e Validação)

## ⚙️ Instruções de Build e Execução
Para detalhes sobre como instalar dependências, executar o ambiente de desenvolvimento e realizar o build de produção, consulte o nosso [**Guia de Build (BUILD.md)**](./BUILD.md).

---
*Porto Segura: Viajar solo nunca mais será sinônimo de estar sozinha.*
