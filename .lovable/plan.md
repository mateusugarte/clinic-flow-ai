
# Sistema de Campanhas — Plano

## Visão Geral

Criar uma área de campanhas dentro da página de Serviços, acessível por um botão "Definir Campanhas". Essa área permite configurar serviços sazonais com período de vigência, promoções e preço promocional.

## O que já existe no banco

A tabela `services` já possui as colunas: `is_seasonal`, `seasonal_start_date`, `seasonal_end_date`, `data_aviso`. Portanto, **não é necessário criar nova tabela** — apenas adicionar colunas para promoção.

## Alterações no Banco de Dados

Adicionar duas colunas à tabela `services`:

| Coluna | Tipo | Default | Descrição |
|---|---|---|---|
| `has_promotion` | boolean | false | Se o serviço sazonal tem promoção ativa |
| `promotional_price` | numeric | null | Preço promocional durante a campanha |

## Funcionalidades da Tela de Campanhas

Ao clicar em **"Definir Campanhas"**, abre uma página/modal com:

1. **Lista de campanhas ativas e futuras** — serviços com `is_seasonal = true`, mostrando nome, período, status (ativa/futura/expirada) e se tem promoção
2. **Criar/editar campanha** com os campos:
   - **Serviço**: dropdown para selecionar um serviço existente OU criar um novo inline
   - **Data de início** e **Data de fim**: date pickers
   - **Tem promoção?**: toggle (switch)
   - **Preço promocional**: campo numérico (visível apenas se promoção ativa)
   - **Descrição da campanha**: texto livre (usa o campo `description` do serviço)
3. **Indicadores visuais**: badge na lista de serviços para serviços sazonais ativos, com contagem regressiva ou status

## Fluxo do Usuário

```text
Serviços (página)
  └─ Botão [Definir Campanhas]
       └─ Dialog/Modal grande
            ├─ Lista de campanhas (cards com status)
            └─ Botão [+ Nova Campanha]
                 └─ Formulário:
                      ├─ Selecionar serviço existente OU criar novo
                      ├─ Data início / Data fim
                      ├─ Switch: Tem promoção?
                      │    └─ Se sim: Preço promocional
                      └─ Botão [Salvar Campanha]
```

## Arquivos Alterados

| Arquivo | Mudança |
|---|---|
| **Migration SQL** | `ALTER TABLE services ADD has_promotion boolean DEFAULT false, ADD promotional_price numeric;` |
| `src/pages/Servicos.tsx` | Botão "Definir Campanhas" no header, dialog de campanhas, lógica de CRUD |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente após migration |

## Detalhes Técnicos

- **Status automático**: Calculado no frontend comparando `seasonal_start_date`/`seasonal_end_date` com a data atual (Ativa, Futura, Expirada)
- **Badge na listagem**: Serviços com campanha ativa mostram um badge "Campanha" ou "Promoção" no card
- **Validação**: Data fim deve ser posterior à data início; preço promocional obrigatório se promoção ativa e deve ser menor que o preço original
- Reutiliza o trigger `calcular_data_aviso` existente para gerar alerta 7 dias antes do início
