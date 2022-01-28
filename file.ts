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

export function createBook(book: Book) {
  const fileName = 'books400k-500k.json';
  const filePath = path.join(booksDir, fileName);

  return new Promise((resolve, reject) => {
    try {
      const writeStream = fs.createWriteStream(filePath, {
        flags: 'r+',
        start: fs.statSync(filePath).size - 2,
      });
      writeStream.write(
        JSON.stringify(book, null, 2).replace(/\{/, ',{').replace(/\}$/, '}]') +
          '\n',
        (streamError) => {
          return reject(streamError);
        }
      );
      return resolve(true);
    } catch (error: any) {
      // file not found
      if (error?.code === 'ENOENT') {
        fs.writeFileSync(
          filePath,
          JSON.stringify(Array.from({ ...[book], length: 1 }), null, 2)
        );
        return resolve(true);
      }
      // out of bound to file size range
      if (error instanceof RangeError) {
        const writeStream = fs.createWriteStream(filePath, { flags: 'r+' });
        writeStream.write(JSON.stringify(book, null, 2), (streamError) => {
          return reject(streamError);
        });
        return resolve(true);
      }
      return reject(error);
    }
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

export async function deleteBook(id: string): Promise<boolean> {
  const files = await getBookFiles();
  let deleted = false;
  for (const file of files) {
    const promise = new Promise<boolean>(async (resolve, reject) => {
      const readStream = fs.createReadStream(file, { encoding: 'utf8' });
      const { writeStream } = await rw(file);
      const mapEvt = es
        .mapSync(function (data: any) {
          if (data.Id === id) {
            deleted = true;
            return {};
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
      if (deleted) {
        return true;
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }
  return deleted;
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

export async function getBook(id: string): Promise<Book | null> {
  const files = await getBookFiles();

  return new Promise<Book | null>((resolve, reject) => {
    let book: Book | null = null;
    const filterEvt = es
      .filterSync(function (data: any) {
        if (data.Id === id) {
          book = data;
          filterEvt.end();
        }
        return true;
      })
      .once('end', () => {
        resolve(book);
      })
      .once('error', (err) => {
        reject(err);
      });
    for (const file of files) {
      const readStream = fs.createReadStream(file, { encoding: 'utf8' });
      readStream.pipe(JSONStream.parse('*')).pipe(filterEvt);
    }
  });
}
