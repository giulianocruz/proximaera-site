# Publicação da Página Fecha Negócio V2 — procedimento controlado

Status em 11/11/2026: implementação premium integrada à `main` no commit `b3f9d95fd167a62b804cfb1936eca211d9a1bfbc`. Isso **não comprova** publicação na VPS.

## Escopo desta publicação

Somente nove arquivos: as seis ilustrações `assets/premium/fecha-*-v2.webp`, `assets/premium/fecha-v2.css`, `fecha-negocio/preview.js` e `fecha-negocio/index.html`.

A home, o Admin, formulários e arquivos externos a essa lista devem permanecer intactos. A landing utiliza provisoriamente o WhatsApp **+55 14 99819-3831**. Os valores comerciais são Free R$ 0, Profissional R$ 79,90 e Premium R$ 367.

## Antes de iniciar

1. Fazer acesso autorizado à VPS e confirmar a raiz da aplicação (`/opt/proximaera/site` segundo documentação existente).
2. Verificar que a produção está acessível do próprio servidor e que é possível ler os arquivos atuais.
3. Obter a versão atual de `ops/deploy-fecha-premium-v2.sh` **do GitHub oficial**. Nunca executar script recebido por mensagem, de outra origem ou por link que não seja verificável.
4. Conferir se há edições de outro agente em andamento. Não publicar simultaneamente.
5. Não ativar anúncios ainda.

## Passo A — somente leitura

```bash
cd /caminho/autorizado/para/proximaera-site
bash -n ops/deploy-fecha-premium-v2.sh
bash ops/deploy-fecha-premium-v2.sh --check
```

O preflight baixa um commit fixado, verifica formato dos WebP, identifica arquivos idênticos e prepara **em diretório temporário** a aplicação de alterações. Se a versão publicada difere da base original, usa `git merge-file -p` para tentar preservar personalizações; **qualquer conflito impede o deploy**. `--check` nunca escreve na pasta da produção.

Exigir a mensagem `Preflight completo, VPS inalterada.` antes de avançar. Se houver `CONFLITO_DE_PRODUCAO` ou `CONFLITO`, parar e revisar a diferença; não forçar merge, não usar `--ours`/`--theirs`, não enviar o repositório inteiro.

## Passo B — publicação após preflight aprovado

```bash
sudo bash ops/deploy-fecha-premium-v2.sh --apply
```

O script faz novo preflight, salva um `originals.tar.gz` em `/opt/proximaera/backups/fecha-v2-<timestamp>/`, registra arquivos criados e escreve as artes/CSS/JS antes do HTML, usando troca de nome atômica por arquivo. Se houver falha durante o processo, tenta restaurar o backup automaticamente.

**Atenção:** não é transação atômica de toda a página. Evitar tráfego pago e alterações concorrentes durante a operação.

## Passo C — homologação da produção

Validar com acesso a navegador e ao domínio, sem enviar leads reais:

- `https://proximaera.com.br/fecha-negocio/` responde 200, sem console errors.
- Os seis caminhos `/assets/premium/fecha-*-v2.webp` retornam 200 e mostram a arte correta.
- A folha `/assets/premium/fecha-v2.css` e o `preview.js` têm conteúdo esperado.
- Desktop 1366 px e celular 390 px: sem overflow horizontal nem imagens cortadas.
- Modelos Beleza, Serviços e Consultoria alternam; exemplos completos abrem com UTMs preservados.
- Botões reais abrem `wa.me/5514998193831` (somente verificar URL, sem disparar mensagens).
- Free R$ 0, Profissional R$ 79,90 e Premium R$ 367; prévia antes do pagamento.
- Consentimento de marketing continua condicionando GA4/Meta; não registrar conversão fictícia.
- Home e demais rotas não foram alteradas.

## Recuperação em caso de regressão

Encontrar a pasta de backup informada no fim do deploy. Conferir o conteúdo antes de restaurar:

```bash
sudo tar -tzf /opt/proximaera/backups/fecha-v2-<timestamp>/originals.tar.gz
```

Após confirmar a pasta exata e interromper publicações concorrentes, restaurar os arquivos existentes e remover **somente os caminhos registrados** em `new-files.txt`. Executar a reversão com procedimento supervisionado, garantindo que não se removam alterações novas de outro processo.

## Critério de conclusão

Somente marcar “em produção” após o deploy retornar `DEPLOY OK` **e** a homologação pública passar. Merge no GitHub e CI verde não significam publicação na VPS.
