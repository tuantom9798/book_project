import express from 'express';
import { formatError, formatJsonResponse } from './utils';
import { createBook, deleteBook, getBook, getBooks, updateBook } from './file';
import { Book } from './models';

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.post('/books', async (req, res) => {
  const book = req.body as Book;
  book.Id = Math.random().toString(16).slice(2);

  try {
    const created = await createBook(book);

    if (created) {
      return res.status(201).json(formatJsonResponse(book.Id));
    }
    return res.status(400).json(formatError('BOOK_CREATE_FAILURE'));
  } catch (error) {
    return res.status(500).json(formatError(error));
  }
});

app.get('/books', async (req, res) => {
  // book name or author name
  const name = `${req.query.name}`.toLowerCase();
  const total = Number(req.query.total || 10);

  try {
    const books = await getBooks(name, total);
    res.json(formatJsonResponse(books.flatMap((book) => book)));
  } catch (error) {
    console.log('error', error);
    res.status(500).json(formatError(error));
  }
});

app.get('/books/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const book = await getBook(id);
    if (book) {
      return res.json(formatJsonResponse(book));
    }
    return res.status(404).json(formatError(new Error('BOOK_NOT_FOUND')));
  } catch (error) {
    return res.status(500).json(formatError(error));
  }
});

app.put('/books', async (req, res) => {
  const updatedBook: Book = req.body;

  const updated = await updateBook(updatedBook);
  if (updated) {
    return res.json(formatJsonResponse(updatedBook.Id));
  }
  res.status(404).json(formatError(new Error('BOOK_NOT_FOUND')));
});

app.delete('/books/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const deleted = await deleteBook(id);

    if (deleted) {
      return res.json(formatJsonResponse(id));
    }
    return res.status(404).json(formatError(new Error('BOOK_NOT_FOUND')));
  } catch (error) {
    return res.status(500).json(formatError(error));
  }
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
