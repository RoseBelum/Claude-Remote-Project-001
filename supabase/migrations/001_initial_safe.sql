-- ============================================================
-- UX Flow — Schema (versão idempotente, segura para re-executar)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text NOT NULL,
  avatar_url text,
  target_horas_mes numeric DEFAULT 168,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, nome)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE IF NOT EXISTS bus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projectos (
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

CREATE TABLE IF NOT EXISTS activity_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  cor text DEFAULT '#94a3b8'
);

CREATE TABLE IF NOT EXISTS sessoes (
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

CREATE TABLE IF NOT EXISTS kanban_estados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cor text DEFAULT '#94a3b8',
  ordem integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tarefas (
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

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos vêem profiles" ON profiles;
CREATE POLICY "Todos vêem profiles" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Editar próprio profile" ON profiles;
CREATE POLICY "Editar próprio profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

ALTER TABLE bus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access bus" ON bus;
CREATE POLICY "Full access bus" ON bus TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE projectos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access projectos" ON projectos;
CREATE POLICY "Full access projectos" ON projectos TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access tags" ON activity_tags;
CREATE POLICY "Full access tags" ON activity_tags TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE kanban_estados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access kanban_estados" ON kanban_estados;
CREATE POLICY "Full access kanban_estados" ON kanban_estados TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access tarefas" ON tarefas;
CREATE POLICY "Full access tarefas" ON tarefas TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE sessoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver próprias sessões" ON sessoes;
CREATE POLICY "Ver próprias sessões" ON sessoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Criar próprias sessões" ON sessoes;
CREATE POLICY "Criar próprias sessões" ON sessoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Editar próprias sessões" ON sessoes;
CREATE POLICY "Editar próprias sessões" ON sessoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Apagar próprias sessões" ON sessoes;
CREATE POLICY "Apagar próprias sessões" ON sessoes FOR DELETE TO authenticated USING (auth.uid() = user_id);

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

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name = 'avatars/' || auth.uid() || '.' || (regexp_match(name, '\.([^.]+)$'))[1]);

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar owner update" ON storage.objects;
CREATE POLICY "Avatar owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- Seed (só insere se não existir)
INSERT INTO bus (nome, cor) VALUES
  ('VIA_VERDE', '#10b981'), ('VVTE', '#6366f1'), ('BIO', '#f59e0b'),
  ('BRISA', '#3b82f6'), ('UCB', '#8b5cf6'), ('CONTROLAUTO', '#ef4444'),
  ('CONTROLAUTO_ITV', '#f97316'), ('COLIBRI', '#14b8a6'), ('ATOBE', '#ec4899')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO activity_tags (nome, cor) VALUES
  ('DEFINE', '#3b82f6'), ('SHRINKAGE', '#f59e0b'), ('DISCOVERY', '#10b981'),
  ('UCB', '#8b5cf6'), ('FORMAÇÃO', '#6366f1'), ('AUSÊNCIA/FÉRIAS', '#94a3b8'),
  ('AUSÊNCIA/DOENÇA', '#94a3b8'), ('AUSÊNCIA/FORMAÇÃO', '#94a3b8'),
  ('REUNIÃO EQUIPA', '#ec4899'), ('VOC', '#14b8a6'), ('AMPLIFY', '#f97316'),
  ('PEDIDOS AD HOC', '#64748b')
ON CONFLICT (nome) DO NOTHING;

INSERT INTO kanban_estados (nome, cor, ordem) VALUES
  ('Backlog', '#94a3b8', 0), ('Em progresso', '#3b82f6', 1),
  ('Em revisão', '#f59e0b', 2), ('Concluído', '#10b981', 3)
ON CONFLICT DO NOTHING;
