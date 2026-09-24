# VIVAH.ê — Arquitetura integrada Parceiro PJ + OS (HML)

## Objetivo
Construir a jornada Parceiro PJ sem duplicar o ecossistema já existente. Cliente PF, Parceiro PJ, Web e VIVAH.ê OS compartilham Core/API, dados e eventos.

## Fluxo-alvo de homologação
1. Parceiro inicia cadastro PJ.
2. Core cria `accounts` tipo PJ + `partner_profiles` em PENDING.
3. Parceiro informa dados empresariais, contato, endereço/região e responsável legal.
4. Parceiro configura capacidade, regiões atendidas, disponibilidade e regras comerciais.
5. Parceiro cadastra oferta/pacote, componentes, preço/faixa e mídia.
6. OS recebe o parceiro em fila de análise e permite UNDER_REVIEW / APPROVED / REJECTED.
7. Oferta aprovada torna-se elegível ao motor de Orçamento Inteligente do Cliente.
8. Cliente encontra oferta compatível e o ciclo segue para contratação, financeiro e evento.
9. Audit log e outbox registram mudanças relevantes para integração e mensageria.

## Canais
- Web/APP Cliente PF: descoberta, orçamento, contratação e acompanhamento.
- APP/Web Parceiro PJ: onboarding, catálogo/ofertas, capacidade, agenda, pedidos e financeiro.
- VIVAH.ê OS: backoffice central de parceiros, clientes, ofertas, pedidos, eventos, financeiro, atendimento, auditoria e dashboards.
- Web pública: aquisição/SEO e ferramentas gratuitas; contratação direcionada ao APP.

## Princípios técnicos
- Uma fonte de verdade para entidades de negócio.
- Core/API comum; não criar bancos isolados por canal.
- Alterações críticas geram auditoria e eventos de outbox.
- HML preserva o Cliente existente; Parceiro/OS entram de forma incremental.
- Publicação na `main` somente após validação da jornada na branch `build/parceiro-pj-hml-v1`.

## Próximos incrementos da branch
- UI navegável de onboarding Parceiro PJ.
- Endpoints e persistência para perfil comercial/capacidade/regiões.
- Endpoints e persistência para ofertas/pacotes/componentes/preços.
- Painel OS para análise do parceiro e visualização das ofertas.
- Conexão das ofertas aprovadas ao Orçamento Inteligente.
- Testes de build, API e jornada ponta a ponta antes do merge/deploy.
