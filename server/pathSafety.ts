import path from 'node:path';

type ResolvePathOptions = {
  decodeUrl?: boolean;
};

function normalizeUntrustedPath(rawPath: string, decodeUrl: boolean): string | null {
  if (typeof rawPath !== 'string') return null;

  let decodedPath = rawPath;
  if (decodeUrl) {
    try {
      decodedPath = decodeURIComponent(rawPath);
    } catch {
      return null;
    }
  }

  if (!decodedPath || decodedPath.includes('\0')) return null;
  if (
    path.posix.isAbsolute(decodedPath)
    || path.win32.isAbsolute(decodedPath)
    || /^[a-zA-Z]:/.test(decodedPath)
  ) {
    return null;
  }
  if (decodedPath.split(/[\\/]+/).includes('..')) return null;

  return decodedPath.replace(/[\\/]+/g, path.sep);
}

export function resolvePathInside(
  rootDir: string,
  rawPath: string,
  options: ResolvePathOptions = {},
): string | null {
  const normalizedPath = normalizeUntrustedPath(rawPath, options.decodeUrl === true);
  if (!normalizedPath) return null;

  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, normalizedPath);
  const relativePath = path.relative(resolvedRoot, resolvedPath);

  if (
    relativePath === '..'
    || relativePath.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativePath)
  ) {
    return null;
  }

  return resolvedPath;
}
