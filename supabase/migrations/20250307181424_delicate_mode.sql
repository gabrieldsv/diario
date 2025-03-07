/*
  # Diary Application Schema

  1. New Tables
    - `books`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text)
      - `created_at` (timestamp)
    - `entries`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamp)
    - `entry_books` (junction table)
      - `entry_id` (uuid, foreign key)
      - `book_id` (uuid, foreign key)
    - `entry_tags` (junction table)
      - `entry_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own books"
  ON books
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Entries table
CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entries"
  ON entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Entry-Books junction table
CREATE TABLE IF NOT EXISTS entry_books (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, book_id)
);

ALTER TABLE entry_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entry_books"
  ON entry_books
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Entry-Tags junction table
CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id uuid REFERENCES entries(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entry_tags"
  ON entry_tags
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);