import React, { useState, useEffect } from 'react';
import { Book, PlusCircle, Calendar, Search, Tags, Bookmark, Edit, Trash2, Plus, Mail, Lock, User } from 'lucide-react';
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

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-8">
          <Book className="h-12 w-12 text-purple-600 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Welcome to My Diary</h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to continue' : 'Create an account to get started'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-300"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-purple-600 hover:text-purple-700 text-sm"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBooks();
        loadTags();
        loadEntries();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error loading books:', error);
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
      console.error('Error loading tags:', error);
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
      console.error('Error loading entries:', entriesError);
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

  const addBook = async () => {
    if (!newBook.name.trim() || !user) return;

    const { error } = await supabase
      .from('books')
      .insert([{ ...newBook, user_id: user.id }]);

    if (error) {
      console.error('Error adding book:', error);
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
      console.error('Error deleting book:', error);
      return;
    }

    await loadBooks();
    await loadEntries();
  };

  const addTag = async () => {
    if (!newTag.trim() || !user) return;

    const { error } = await supabase
      .from('tags')
      .insert([{ name: newTag, user_id: user.id }]);

    if (error) {
      console.error('Error adding tag:', error);
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

  const handleSave = async () => {
    if (!newEntry.title || !newEntry.content || selectedBooks.length === 0 || !user) return;

    const entryData = {
      title: newEntry.title,
      content: newEntry.content,
      user_id: user.id
    };

    if (editingEntry) {
      const { error: updateError } = await supabase
        .from('entries')
        .update(entryData)
        .eq('id', editingEntry);

      if (updateError) {
        console.error('Error updating entry:', updateError);
        return;
      }

      await supabase
        .from('entry_books')
        .delete()
        .eq('entry_id', editingEntry);

      await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', editingEntry);

    } else {
      const { data: newEntryData, error: insertError } = await supabase
        .from('entries')
        .insert([entryData])
        .select()
        .single();

      if (insertError || !newEntryData) {
        console.error('Error creating entry:', insertError);
        return;
      }

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
      console.error('Error deleting entry:', error);
      return;
    }

    await loadEntries();
  };

  const filteredEntries = entries.filter(entry => {
    const matchesBook = selectedBookId === 'all' || 
      entry.books.some(book => book.id === selectedBookId);
    
    const matchesSearch = searchTerm === '' ||
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(tag => tag.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesBook && matchesSearch;
  });

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-semibold text-gray-900">My Diary</h1>
          </div>
          <div className="flex items-center space-x-4">
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
              <span>New Entry</span>
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-gray-600 hover:text-gray-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Books Management */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Books</h2>
            <button
              onClick={() => setIsAddingBook(true)}
              className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
            >
              <Plus className="h-5 w-5" />
              <span>New Book</span>
            </button>
          </div>

          {isAddingBook ? (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Book name"
                value={newBook.name}
                onChange={(e) => setNewBook({ ...newBook, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsAddingBook(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addBook}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Add
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
              {editingEntry ? 'Edit Entry' : 'New Entry'}
            </h2>
            
            {/* Book Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Select Books</h3>
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
              placeholder="Entry title"
              value={newEntry.title}
              onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              className="w-full mb-4 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            
            <textarea
              placeholder="Write your thoughts here..."
              value={newEntry.content}
              onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              className="w-full h-48 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
            />

            {/* Tags */}
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
                  placeholder="New tag..."
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
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!newEntry.title || !newEntry.content || selectedBooks.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingEntry ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Filters */}
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
                  All Books
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
              <h2 className="text-lg font-semibold text-gray-900">My Entries</h2>
              <div className="relative">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search entries..."
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
                  
                  {/* Entry Tags */}
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
                  
                  {/* Entry Books */}
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
                <p className="text-gray-500">No entries found. Start writing!</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;