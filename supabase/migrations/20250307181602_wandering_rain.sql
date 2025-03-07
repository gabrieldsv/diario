/*
  # Initial Schema Setup for Diary Application

  1. New Tables
    - `books`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `description` (text)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp with timezone)
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp with timezone)
    - `entries`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp with timezone)
    - `entry_books` (junction table)
      - `entry_id` (uuid, references entries)
      - `book_id` (uuid, references books)
    - `entry_tags` (junction table)
      - `entry_id` (uuid, references entries)
      - `tag_id` (uuid, references tags)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to:
      - Read their own data
      - Create new records
      - Update their own records
      - Delete their own records
*/

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own books"
  ON books FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own books"
  ON books FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own books"
  ON books FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tags"
  ON tags FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Entries table
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entries"
  ON entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create entries"
  ON entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Junction tables
CREATE TABLE IF NOT EXISTS entry_books (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, book_id)
);

ALTER TABLE entry_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entry_books"
  ON entry_books FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_books.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create entry_books"
  ON entry_books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_books.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry_books"
  ON entry_books FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_books.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own entry_tags"
  ON entry_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_tags.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create entry_tags"
  ON entry_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_tags.entry_id
      AND entries.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own entry_tags"
  ON entry_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_tags.entry_id
      AND entries.user_id = auth.uid()
    )
  );