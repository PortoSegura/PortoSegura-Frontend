# Guia de Build - Porto Segura (Frontend)

Este documento descreve os passos necessários para configurar, executar e gerar o build do frontend da aplicação **Porto Segura**.

## Pré-requisitos
- **Node.js** (recomendado versão 20.x ou superior)
- **npm** (gerenciador de pacotes padrão do Node)

## 1. Instalação das Dependências
Na raiz da pasta do frontend, execute o seguinte comando para instalar todas as bibliotecas e ferramentas necessárias listadas no `package.json`:

```bash
npm install
```

## 2. Executando em Ambiente de Desenvolvimento
Para iniciar o servidor de desenvolvimento local, execute:

```bash
npm run dev
```
Isso iniciará a aplicação. O terminal exibirá a URL exata (geralmente `http://localhost:5173`). O Vite suporta Hot Module Replacement (HMR) nativamente para uma experiência de desenvolvimento ágil.

## 3. Build para Produção
Para gerar os arquivos otimizados e prontos para produção, execute o comando de build:

```bash
npm run build
```
Os arquivos estáticos da SPA serão gerados dentro do diretório `dist/`. Esses arquivos podem ser hospedados em qualquer servidor web estático (como Netlify, Vercel, AWS S3, etc). O deploy atual já está configurado e disponível na Netlify.

## 4. Visualizando o Build de Produção Localmente
Caso queira testar os arquivos gerados no diretório `dist/` antes de realizar o deploy, você pode usar o comando de preview do Vite:

```bash
npm run preview
```

## 5. Scripts Adicionais e Qualidade de Código
O projeto conta com ferramentas de formatação e linting:
- **Linting:** Para executar o ESLint e verificar inconsistências no código:
  ```bash
  npm run lint
  ```
- **Formatação:** Para formatar os arquivos utilizando o Prettier:
  ```bash
  npm run format
  ```
