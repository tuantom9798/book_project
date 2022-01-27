import express from 'express';
import JSONStream from 'JSONStream';
import es from 'event-stream';
import fs from 'fs';
import { promisify } from 'util';
import {
  formatError,
  formatJsonResponse,
  getBookFiles,
  getBookReadStreams,
} from './utils';
import { Book } from './models';

const rename = promisify(fs.rename);
const rw = require('rw-stream');

const app = express();
app.use(express.json());

const port = process.env.PORT || 3000;

app.post('/books', async (req, res) => {});

app.get('/books', async (req, res) => {
  const name = `${req.query.name}`.toLowerCase();
  const total = Number(req.query.total || 10);
  const streams = await getBookReadStreams();
  const books: Book[] = [];

  const promises = streams.map((stream) => {
    return new Promise((resolve, reject) => {
      const filterEvt = es
        .filterSync(function (data: any) {
          if (books.length >= total) {
            filterEvt.end();
            return;
          }
          if ((data as Book).Name.toLowerCase().includes(name)) {
            books.push(data);
          }
          return data;
        })
        .once('end', () => {
          pipe.destroy();
          resolve(true);
        })
        .once('error', (err) => {
          reject(new Error(err));
        });
      const pipe = stream.pipe(filterEvt);
    });
  });

  try {
    await Promise.all(promises);
    res.json(formatJsonResponse(books));
  } catch (error) {
    console.log('error', error);
    res.status(500).json(formatError(error));
  }
});

app.put('/books', async (req, res) => {
  const updatedBook: Book = req.body;

  const files = await getBookFiles();
  let updated = false;
  for (const file of files) {
    const promise = new Promise(async (resolve, reject) => {
      const readStream = fs.createReadStream(file, { encoding: 'utf8' });
      const { writeStream } = await rw(file);
      const mapEvt = es
        .mapSync(function (data: any) {
          if (data.Id === updatedBook.Id) {
            updated = true;
            return updatedBook;
          }
          return data;
        })
        .once('end', () => {
          resolve(true);
        })
        .once('error', (err) => {
          reject(err);
        });
      readStream
        .pipe(JSONStream.parse('*'))
        .pipe(mapEvt)
        .pipe(JSONStream.stringify())
        .pipe(writeStream);
    });
    await promise;
    if (updated) {
      break;
    }
  }

  if (updated) {
    return res.json(formatJsonResponse(updatedBook.Id));
  }
  res.status(404).json(formatError(new Error('Book not found')));
});

app.delete('/books', async (req, res) => {});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
