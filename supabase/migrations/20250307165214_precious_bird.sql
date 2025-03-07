/*
  # Sistema de Diários

  1. Novas Tabelas
    - `books`
      - `id` (uuid, chave primária)
      - `name` (texto, não nulo)
      - `description` (texto)
      - `user_id` (uuid, referência ao usuário)
      - `created_at` (timestamp)
    
    - `tags`
      - `id` (uuid, chave primária)
      - `name` (texto, não nulo)
      - `user_id` (uuid, referência ao usuário)
      - `created_at` (timestamp)
    
    - `entries`
      - `id` (uuid, chave primária)
      - `title` (texto, não nulo)
      - `content` (texto, não nulo)
      - `user_id` (uuid, referência ao usuário)
      - `created_at` (timestamp)
    
    - `entry_books` (relação muitos-para-muitos entre entries e books)
      - `entry_id` (uuid, referência a entries)
      - `book_id` (uuid, referência a books)
    
    - `entry_tags` (relação muitos-para-muitos entre entries e tags)
      - `entry_id` (uuid, referência a entries)
      - `tag_id` (uuid, referência a tags)

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para usuários autenticados
*/

-- Criar tabela de livros
CREATE TABLE books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de tags
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, user_id)
);

-- Criar tabela de entradas
CREATE TABLE entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de relação entre entradas e livros
CREATE TABLE entry_books (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, book_id)
);

-- Criar tabela de relação entre entradas e tags
CREATE TABLE entry_tags (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

-- Habilitar RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem gerenciar seus próprios livros"
ON books FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar suas próprias tags"
ON tags FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar suas próprias entradas"
ON entries FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar suas próprias relações entry_books"
ON entry_books FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entries
    WHERE entries.id = entry_books.entry_id
    AND entries.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem gerenciar suas próprias relações entry_tags"
ON entry_tags FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM entries
    WHERE entries.id = entry_tags.entry_id
    AND entries.user_id = auth.uid()
  )
);