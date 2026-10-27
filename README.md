# NEXUSCALES: site com backend

Site (HTML/CSS/JS) servido por um servidor Node.js (Express) com:
- `POST /api/leads`: recebe o formulário "Pedir reunião" (validação, limite de pedidos, campo-armadilha anti-robôs)
- `GET /admin/leads`: lista os pedidos recebidos (precisa do cabeçalho `Authorization: Bearer <ADMIN_TOKEN>`)
- `GET /healthz`: verificação de saúde para o Render

## Correr no computador
```
npm install
ADMIN_TOKEN=teste npm start
```
Abra http://localhost:3000

## Deploy no Render
1. Crie um repositório no GitHub e envie esta pasta (`git init`, `git add .`, `git commit`, `git push`).
2. No Render: **New > Blueprint**, escolha o repositório. O `render.yaml` já configura tudo.
   (Alternativa: **New > Web Service**, Build `npm install`, Start `npm start`.)
3. Em **Environment**, confirme `ADMIN_TOKEN` (gerado automaticamente) e, se quiser, preencha `LEAD_WEBHOOK_URL`.
4. Depois do deploy, teste o formulário e veja os pedidos:
   `curl -H "Authorization: Bearer SEU_TOKEN" https://SEU-SERVICO.onrender.com/admin/leads`
5. Domínio próprio: **Settings > Custom Domains**.

## Onde ficam os pedidos
- O plano gratuito do Render **apaga os ficheiros** a cada novo deploy ou reinício e **adormece** após um período sem visitas.
- Para não perder pedidos, use **uma** destas opções:
  - `LEAD_WEBHOOK_URL`: URL público (n8n, Make, Zapier...) que recebe cada pedido em JSON
    (`id`, `at`, `name`, `shop`, `phone`, `note`). Um n8n que só corre no seu computador não é alcançável pelo Render.
  - Disco persistente do Render (plano pago): monte-o numa pasta (ex.: `/var/data`) e defina `DATA_DIR=/var/data`.

## Personalizar
- Textos e secções: `public/index.html`
- Cores e tipografia: `public/style.css` (variáveis no topo)
- WhatsApp: troque `258856271154` no `index.html`
