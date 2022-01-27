import fs from 'fs';
import path from 'path';
import JSONStream from 'JSONStream';

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

export function formatJsonResponse(data: any) {
  if (!data) {
    return {
      success: true,
      total: 0,
      data: null,
    };
  }
  if (Array.isArray(data)) {
    return {
      success: true,
      total: data.length,
      data,
    };
  }
  return {
    success: true,
    total: 1,
    data,
  };
}

export function formatError(error: any) {
  return {
    success: false,
    message: error?.message || JSON.stringify(error),
  };
}
