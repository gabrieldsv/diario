import React, { useState, useEffect } from 'react';
import { Book, PlusCircle, Calendar, Search, Tags, Bookmark, Edit, Trash2, Plus } from 'lucide-react';
import { supabase } from './lib/supabase';

interface DiaryBook {
  id: string;
  name: string;
  description: string;
}

interface Tag {
  id: string;
  name: string;
}

interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: Tag[];
  books: DiaryBook[];
}

function App() {
  const [books, setBooks] = useState<DiaryBook[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [newEntry, setNewEntry] = useState({ title: '', content: '' });
  const [isWriting, setIsWriting] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [newBook, setNewBook] = useState({ name: '', description: '' });

  // Carregar dados iniciais
  useEffect(() => {
    loadBooks();
    loadTags();
    loadEntries();
  }, []);

  // Funções de carregamento
  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao carregar livros:', error);
      return;
    }
    
    setBooks(data || []);
  };

  const loadTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Erro ao carregar tags:', error);
      return;
    }
    
    setTags(data || []);
  };

  const loadEntries = async () => {
    const { data: entriesData, error: entriesError } = await supabase
      .from('entries')
      .select(`
        *,
        entry_books(book_id),
        entry_tags(tag_id),
        books:entry_books(books(*)),
        tags:entry_tags(tags(*))
      `)
      .order('created_at', { ascending: false });

    if (entriesError) {
      console.error('Erro ao carregar entradas:', entriesError);
      return;
    }

    const formattedEntries = (entriesData || []).map(entry => ({
      id: entry.id,
      date: new Date(entry.created_at).toLocaleDateString('pt-BR'),
      title: entry.title,
      content: entry.content,
      books: entry.books.map((b: any) => b.books),
      tags: entry.tags.map((t: any) => t.tags)
    }));

    setEntries(formattedEntries);
  };

  // Gerenciamento de livros
  const addBook = async () => {
    if (!newBook.name.trim()) return;

    const { error } = await supabase
      .from('books')
      .insert([newBook]);

    if (error) {
      console.error('Erro ao adicionar livro:', error);
      return;
    }

    await loadBooks();
    setNewBook({ name: '', description: '' });
    setIsAddingBook(false);
  };

  const deleteBook = async (bookId: string) => {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId);

    if (error) {
      console.error('Erro ao deletar livro:', error);
      return;
    }

    await loadBooks();
    await loadEntries();
  };

  // Gerenciamento de tags
  const addTag = async () => {
    if (!newTag.trim()) return;

    const { error } = await supabase
      .from('tags')
      .insert([{ name: newTag }]);

    if (error) {
      console.error('Erro ao adicionar tag:', error);
      return;
    }

    await loadTags();
    setNewTag('');
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Gerenciamento de entradas
  const handleSave = async () => {
    if (!newEntry.title || !newEntry.content || selectedBooks.length === 0) return;

    const entryData = {
      title: newEntry.title,
      content: newEntry.content
    };

    if (editingEntry) {
      // Atualizar entrada existente
      const { error: updateError } = await supabase
        .from('entries')
        .update(entryData)
        .eq('id', editingEntry);

      if (updateError) {
        console.error('Erro ao atualizar entrada:', updateError);
        return;
      }

      // Atualizar relações
      await supabase
        .from('entry_books')
        .delete()
        .eq('entry_id', editingEntry);

      await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', editingEntry);

    } else {
      // Criar nova entrada
      const { data: newEntryData, error: insertError } = await supabase
        .from('entries')
        .insert([entryData])
        .select()
        .single();

      if (insertError || !newEntryData) {
        console.error('Erro ao criar entrada:', insertError);
        return;
      }

      // Inserir relações
      const bookRelations = selectedBooks.map(bookId => ({
        entry_id: newEntryData.id,
        book_id: bookId
      }));

      const tagRelations = selectedTags.map(tagId => ({
        entry_id: newEntryData.id,
        tag_id: tagId
      }));

      if (bookRelations.length > 0) {
        await supabase.from('entry_books').insert(bookRelations);
      }

      if (tagRelations.length > 0) {
        await supabase.from('entry_tags').insert(tagRelations);
      }
    }

    await loadEntries();
    setNewEntry({ title: '', content: '' });
    setSelectedBooks([]);
    setSelectedTags([]);
    setEditingEntry(null);
    setIsWriting(false);
  };

  const editEntry = (entry: DiaryEntry) => {
    setNewEntry({
      title: entry.title,
      content: entry.content
    });
    setSelectedBooks(entry.books.map(b => b.id));
    setSelectedTags(entry.tags.map(t => t.id));
    setEditingEntry(entry.id);
    setIsWriting(true);
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('Erro ao deletar entrada:', error);
      return;
    }

    await loadEntries();
  };

  // Filtros
  const filteredEntries = entries.filter(entry => {
    const matchesBook = selectedBookId === 'all' || 
      entry.books.some(book => book.id === selectedBookId);
    
    const matchesSearch = searchTerm === '' ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesBook && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">Meus Diários</h1>
          </div>
          <button
            onClick={() => {
              setIsWriting(true);
              setEditingEntry(null);
              setNewEntry({ title: '', content: '' });
              setSelectedBooks([]);
              setSelectedTags([]);
            }}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            <span>Nova Entrada</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Gerenciamento de Livros */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Meus Livros</h2>
            <button
              onClick={() => setIsAddingBook(true)}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
            >
              <Plus className="h-5 w-5" />
              <span>Novo Livro</span>
            </button>
          </div>

          {isAddingBook ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Nome do livro"
                value={newBook.name}
                onChange={(e) => setNewBook({ ...newBook, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="Descrição (opcional)"
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddingBook(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={addBook}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {books.map(book => (
                <div key={book.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{book.name}</h3>
                      {book.description && (
                        <p className="text-sm text-gray-500">{book.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteBook(book.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isWriting ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingEntry ? 'Editar Entrada' : 'Nova Entrada'}
            </h2>
            
            {/* Seleção de Livros */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selecione os Livros</h3>
              <div className="flex flex-wrap gap-2">
                {books.map(book => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBooks(prev =>
                      prev.includes(book.id)
                        ? prev.filter(id => id !== book.id)
                        : [...prev, book.id]
                    )}
                    className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1
                      ${selectedBooks.includes(book.id)
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                      } border hover:bg-purple-50 transition-colors`}
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>{book.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              placeholder="Título da entrada"
              value={newEntry.title}
              onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              className="w-full mb-4 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <textarea
              placeholder="Escreva seus pensamentos aqui..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              className="w-full h-48 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
            />

            {/* Sistema de Tags */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1
                      ${selectedTags.includes(tag.id)
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                      } border hover:bg-purple-50 transition-colors`}
                  >
                    <span>{tag.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Nova tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                >
                  <Tags className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setIsWriting(false);
                  setEditingEntry(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!newEntry.title || !newEntry.content || selectedBooks.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingEntry ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Filtros */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBookId('all')}
                  className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1
                    ${selectedBookId === 'all'
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                    } border hover:bg-purple-50 transition-colors`}
                >
                  Todos os Livros
                </button>
                {books.map(book => (
                  <button
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    className={`px-3 py-1 rounded-full text-sm flex items-center space-x-1
                      ${selectedBookId === book.id
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                      } border hover:bg-purple-50 transition-colors`}
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>{book.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Minhas Entradas</h2>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar entradas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{entry.date}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => editEntry(entry)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{entry.title}</h3>
                  <p className="text-gray-600 line-clamp-3 mb-3">{entry.content}</p>
                  
                  {/* Tags da entrada */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {entry.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Livros da entrada */}
                  <div className="flex flex-wrap gap-1">
                    {entry.books.map(book => (
                      <span
                        key={book.id}
                        className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs flex items-center"
                      >
                        <Bookmark className="h-3 w-3 mr-1" />
                        {book.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredEntries.length === 0 && (
              <div className="text-center py-12">
                <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma entrada encontrada. Comece a escrever!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;