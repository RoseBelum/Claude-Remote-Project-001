# UX Flow — Fase 1: Foundations

## Objectivo
Setup completo da app — autenticação, base de dados, navegação e dados base. No final desta fase a app arranca, o login funciona, e a Tab 4 (Definições) está operacional. É o pré-requisito para todas as outras fases.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Base de dados | Supabase (PostgreSQL + Auth + RLS) |
| Estilos | Tailwind CSS + shadcn/ui |
| Linguagem | TypeScript |
| Deploy | Vercel |

---

## Setup inicial

```bash
npx create-next-app@latest ux-flow --typescript --tailwind --app
cd ux-flow
npx shadcn-ui@latest init
npm install @supabase/supabase-js @supabase/ssr
```

Variáveis de ambiente (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Base de dados (Supabase)

Criar todas as tabelas nesta ordem (respeitar dependências de foreign keys):

```sql
-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  avatar_url text,
  target_horas_mes numeric DEFAULT 168,
  created_at timestamptz DEFAULT now()
);

-- Trigger para criar profile automaticamente no signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, nome)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Business Units
CREATE TABLE bus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- 3. Projectos
CREATE TABLE projectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  bu_id uuid REFERENCES bus NOT NULL,
  area_bu text,
  estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado', 'concluido', 'arquivado')),
  data_inicio date,
  data_fim date,
  cor text,
  created_at timestamptz DEFAULT now()
);

-- 4. Activity Tags
CREATE TABLE activity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#94a3b8'
);

-- 5. Sessões
CREATE TABLE sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles NOT NULL,
  projecto_id uuid REFERENCES projectos NOT NULL,
  tag_id uuid REFERENCES activity_tags,
  inicio timestamptz NOT NULL,
  fim timestamptz,
  horas numeric,
  nota text,
  editado_em timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 6. Kanban estados
CREATE TABLE kanban_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text DEFAULT '#94a3b8',
  ordem integer DEFAULT 0
);

-- 7. Tarefas
CREATE TABLE tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projecto_id uuid REFERENCES projectos NOT NULL,
  titulo text NOT NULL,
  descricao text,
  assignee_id uuid REFERENCES profiles,
  estado_id uuid REFERENCES kanban_estados,
  prioridade text DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
  data_inicio date,
  data_fim date,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

### Row Level Security

```sql
-- Profiles: cada um vê o seu, todos os autenticados vêem todos (para assignees)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos vêem profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editar próprio profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- BUs, Projectos, Tags, Kanban: todos lêem, todos escrevem (equipa pequena, sem admins por agora)
ALTER TABLE bus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access bus" ON bus TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE projectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access projectos" ON projectos TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access tags" ON activity_tags TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE kanban_estados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access kanban_estados" ON kanban_estados TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access tarefas" ON tarefas TO authenticated USING (true) WITH CHECK (true);

-- Sessões: cada user gere as suas; leitura de equipa via função
ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ver próprias sessões" ON sessoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Criar próprias sessões" ON sessoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Editar próprias sessões" ON sessoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Apagar próprias sessões" ON sessoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Função para dashboard de equipa (bypassa RLS)
CREATE OR REPLACE FUNCTION get_team_sessions(p_inicio date, p_fim date)
RETURNS TABLE (
  id uuid, user_id uuid, projecto_id uuid, tag_id uuid,
  inicio timestamptz, fim timestamptz, horas numeric, nota text,
  user_nome text, projecto_nome text, bu_nome text, tag_nome text, area_bu text
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    s.id, s.user_id, s.projecto_id, s.tag_id,
    s.inicio, s.fim, s.horas, s.nota,
    p.nome, pr.nome, b.nome, t.nome, pr.area_bu
  FROM sessoes s
  JOIN profiles p ON p.id = s.user_id
  JOIN projectos pr ON pr.id = s.projecto_id
  JOIN bus b ON b.id = pr.bu_id
  LEFT JOIN activity_tags t ON t.id = s.tag_id
  WHERE s.inicio::date BETWEEN p_inicio AND p_fim;
$$;
```

### Seed de dados iniciais

```sql
-- Business Units
INSERT INTO bus (nome, cor) VALUES
  ('VIA_VERDE', '#10b981'),
  ('VVTE', '#6366f1'),
  ('BIO', '#f59e0b'),
  ('BRISA', '#3b82f6'),
  ('UCB', '#8b5cf6'),
  ('CONTROLAUTO', '#ef4444'),
  ('CONTROLAUTO_ITV', '#f97316'),
  ('COLIBRI', '#14b8a6'),
  ('ATOBE', '#ec4899');

-- Activity Tags
INSERT INTO activity_tags (nome, cor) VALUES
  ('DEFINE', '#3b82f6'),
  ('SHRINKAGE', '#f59e0b'),
  ('DISCOVERY', '#10b981'),
  ('UCB', '#8b5cf6'),
  ('FORMAÇÃO', '#6366f1'),
  ('AUSÊNCIA/FÉRIAS', '#94a3b8'),
  ('AUSÊNCIA/DOENÇA', '#94a3b8'),
  ('AUSÊNCIA/FORMAÇÃO', '#94a3b8'),
  ('REUNIÃO EQUIPA', '#ec4899'),
  ('VOC', '#14b8a6'),
  ('AMPLIFY', '#f97316'),
  ('PEDIDOS AD HOC', '#64748b');

-- Kanban estados
INSERT INTO kanban_estados (nome, cor, ordem) VALUES
  ('Backlog', '#94a3b8', 0),
  ('Em progresso', '#3b82f6', 1),
  ('Em revisão', '#f59e0b', 2),
  ('Concluído', '#10b981', 3);
```

---

## Autenticação

### Middleware (`middleware.ts` na raiz)
Protege todas as rotas excepto `/login`. Redireciona para `/login` se não autenticado, para `/` se já autenticado e tentar aceder ao `/login`.

```typescript
// Usar @supabase/ssr createServerClient
// Verificar sessão em todas as rotas excepto /login, /api/auth
// Refresh automático do token
```

### Página de login (`app/login/page.tsx`)
- Form simples: email + password
- Botão "Entrar"
- Usar `supabase.auth.signInWithPassword()`
- Sem registo público — contas criadas manualmente no Supabase Dashboard
- Mostrar erro se credenciais inválidas
- Redirect para `/` após login bem-sucedido

---

## Layout e Navegação

### Layout raiz (`app/layout.tsx`)
- Providers: Supabase Auth, React Query (ou SWR)
- Font: Inter (ou system-ui)
- Sem estilos globais excessivos — Tailwind suficiente

### Navbar (`components/navbar.tsx`)
**Desktop:**
- Logo/nome "UX Flow" à esquerda
- 4 tabs ao centro: Time Tracker | Task Board | Timeline | Definições
- Avatar do user + nome + botão logout à direita

**Mobile:**
- Header com logo + avatar
- Bottom tab bar com 4 ícones + labels curtas

Tabs activas com indicador visual (underline ou background). Usar Next.js `usePathname()` para detectar rota activa.

### Rotas
```
/                → redirect para /tracker
/tracker         → Tab 1 Time Tracker
/board           → Tab 2 Task Board
/timeline        → Tab 3 Timeline & Dashboard
/settings        → Tab 4 Definições
/login           → página de login
```

---

## Tab 4 — Definições

Esta tab é desenvolvida nesta fase por ser pré-requisito (precisas de projectos e BUs para as outras tabs).

### Layout
Sidebar com secções (ou tabs verticais em mobile):
- Projectos
- Business Units
- Activity Tags
- Kanban
- Equipa
- O meu perfil

### Secção: Projectos (`/settings/projects`)

**Tabela de projectos:**
- Colunas: Nome, BU (badge colorido), Área, Estado (badge), Data início, Data fim, Acções
- Filtro por estado (activo / arquivado)
- Botão "Novo projecto" → abre modal

**Modal de projecto (criar/editar):**
- Nome* (text input)
- BU* (select com cor da BU)
- Área BU (text input, opcional) — ex: Mktg, Inovação, B2B, Produto
- Estado (select: activo / pausado / concluido / arquivado)
- Data início (date picker, opcional)
- Data fim (date picker, opcional)

**Acções por linha:**
- Editar (abre modal com dados preenchidos)
- Arquivar (muda estado para 'arquivado', não apaga)
- Apagar (só se não tiver sessões ou tarefas associadas — mostrar erro caso contrário)

### Secção: Business Units (`/settings/bus`)

- Lista de BUs: nome + círculo de cor + nº de projectos associados
- Botão "Nova BU" → inline form ou modal
- Editar nome e cor (color picker simples — input type="color" chega)
- Não permitir apagar se tiver projectos — mostrar aviso

### Secção: Activity Tags (`/settings/tags`)

- Lista de tags: nome + círculo de cor
- Adicionar / editar nome e cor
- Apagar com aviso se existirem sessões com essa tag (mostrar contagem)

### Secção: Kanban (`/settings/kanban`)

- Lista de estados com drag para reordenar (@dnd-kit)
- Cada estado: nome + cor + handle de drag
- Adicionar novo estado (inline)
- Editar nome e cor
- Apagar com aviso se existirem tarefas nesse estado

### Secção: Equipa (`/settings/team`)

- Lista de membros (todos os profiles)
- Cada linha: avatar + nome + target horas/mês
- Editar target por pessoa (inline ou modal simples)
- Não é possível criar/apagar membros aqui (gestão feita no Supabase Auth)

### Secção: O meu perfil (`/settings/profile`)

- Editar nome
- Upload de avatar (Supabase Storage)
- Editar target pessoal de horas/mês
- Botão "Guardar"

---

## Tipos TypeScript

Criar `types/index.ts` com interfaces para todas as entidades:

```typescript
export interface Profile {
  id: string
  nome: string
  avatar_url: string | null
  target_horas_mes: number
  created_at: string
}

export interface BU {
  id: string
  nome: string
  cor: string
  created_at: string
}

export interface Projecto {
  id: string
  nome: string
  bu_id: string
  bu?: BU
  area_bu: string | null
  estado: 'activo' | 'pausado' | 'concluido' | 'arquivado'
  data_inicio: string | null
  data_fim: string | null
  cor: string | null
  created_at: string
}

export interface ActivityTag {
  id: string
  nome: string
  cor: string
}

export interface Sessao {
  id: string
  user_id: string
  projecto_id: string
  projecto?: Projecto
  tag_id: string | null
  tag?: ActivityTag
  inicio: string
  fim: string | null
  horas: number | null
  nota: string | null
  editado_em: string | null
  created_at: string
}

export interface KanbanEstado {
  id: string
  nome: string
  cor: string
  ordem: number
}

export interface Tarefa {
  id: string
  projecto_id: string
  projecto?: Projecto
  titulo: string
  descricao: string | null
  assignee_id: string | null
  assignee?: Profile
  estado_id: string | null
  estado?: KanbanEstado
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  data_inicio: string | null
  data_fim: string | null
  ordem: number
  created_at: string
}
```

---

## Critérios de conclusão da Fase 1

- [ ] `npm run dev` arranca sem erros
- [ ] Login com email/password funciona
- [ ] Logout funciona
- [ ] Middleware redireciona correctamente rotas protegidas
- [ ] Navbar mostra as 4 tabs; navegação entre rotas funciona
- [ ] Bottom tab bar funciona em mobile
- [ ] Tab 4 Definições: CRUD completo de Projectos
- [ ] Tab 4 Definições: CRUD completo de BUs
- [ ] Tab 4 Definições: CRUD completo de Activity Tags
- [ ] Tab 4 Definições: reordenação de estados do Kanban
- [ ] Tab 4 Definições: edição de target de equipa
- [ ] Tab 4 Definições: edição de perfil próprio
- [ ] Seed de dados iniciais aplicado (BUs, tags, kanban estados)
- [ ] RLS activo e a funcionar correctamente
