# VIVAH.ê — PROD Readiness Gate 1

Esta branch é a linha segura de transformação HML → PROD.

## Regras
- A HML homologada permanece preservada.
- Nenhum fallback de demonstração pode retornar sucesso em PROD.
- Dados críticos devem persistir via Core/API → PostgreSQL.
- Segredos nunca entram no Git.
- PROD deve falhar de forma explícita quando banco/configuração obrigatória estiver ausente.
- Autenticação/autorização e perfis PF/PJ/OS são obrigatórios antes da abertura pública.
- Infraestrutura V1 deve priorizar tiers gratuitos e portabilidade.

## Gate 1
1. Separar APP_ENV hml/prod.
2. Fail-fast de configuração em PROD.
3. CORS por allowlist.
4. Persistir cadastro/cobertura/capacidade/ofertas/agenda/regras comerciais no PostgreSQL.
5. Eliminar localStorage como fonte de verdade de dados comerciais.
6. Criar migrations reproduzíveis.
7. Adicionar health/readiness e tratamento consistente de erros.
8. Preparar autenticação e RBAC.
9. Testes de build/API antes de qualquer merge em main.
10. Documentar deploy, rollback, backup e migração.

## Não incluído neste gate
PSP real, WhatsApp externo, SMS pago, KYC pago e publicação nas lojas. Esses entram após o Core PROD estar validado.
