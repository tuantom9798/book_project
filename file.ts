import fs from 'fs';
import path from 'path';
import JSONStream from 'JSONStream';
import es from 'event-stream';
import { Book } from './models';
const rw = require('rw-stream');

const fsPromises = fs.promises;
const booksDir = path.join(__dirname, 'data', 'books');

export async function getBookFiles() {
  try {
    const files = await fsPromises.readdir(booksDir);
    return files.map((file) => path.join(booksDir, file));
  } catch {
    return [];
  }
}

export async function getBookReadStreams() {
  const files = await getBookFiles();
  return files.map((file) => {
    return fs
      .createReadStream(file, { encoding: 'utf8' })
      .pipe(JSONStream.parse('*'));
  });
}

export async function getBookWriteStreams() {
  const files = await getBookFiles();
  return files.map((file) => {
    return fs.createWriteStream(file, { encoding: 'utf8' });
  });
}

export async function updateBook(updatedBook: Book): Promise<boolean> {
  const files = await getBookFiles();
  let updated = false;
  for (const file of files) {
    const promise = new Promise<boolean>(async (resolve, reject) => {
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

    try {
      await promise;
      if (updated) {
        break;
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return updated;
}

export async function getBooks(query: string, total: number): Promise<Book[]> {
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
          const name = `${data.Name}`.toLowerCase();
          const authors = `${data.Authors}`.toLowerCase();
          if (name.includes(query) || authors.includes(query)) {
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
    return Promise.resolve(books);
  } catch (error) {
    return Promise.reject(error);
  }
}