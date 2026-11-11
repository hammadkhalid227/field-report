import { getApiBaseUrl } from './config';
import type { ServerReport } from './types';

const readTimeoutMs = 15000;

function withTimeout<T>(work: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('The server took too long.'));
    }, ms);

    work.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function fetchServerReports(baseUrl = getApiBaseUrl()) {
  let response: Response;

  try {
    response = await withTimeout(fetch(`${baseUrl}/reports`), readTimeoutMs);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'The server took too long.'
    ) {
      throw error;
    }
    throw new Error('The server could not be reached.');
  }

  if (!response.ok) {
    throw new Error('The server could not be read.');
  }

  const body = (await response.json()) as { reports: ServerReport[] };
  return body.reports;
}

export async function fetchServerReport(id: string, baseUrl = getApiBaseUrl()) {
  let response: Response;

  try {
    response = await withTimeout(
      fetch(`${baseUrl}/reports/${id}`),
      readTimeoutMs,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'The server took too long.'
    ) {
      throw error;
    }
    throw new Error('The server could not be reached.');
  }

  if (response.status === 404) {
    throw new Error('That report is not on the server.');
  }

  if (!response.ok) {
    throw new Error('The server could not be read.');
  }

  return (await response.json()) as ServerReport;
}
