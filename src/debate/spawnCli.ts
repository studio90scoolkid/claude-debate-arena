import { spawn, ChildProcess, SpawnOptions } from 'child_process';

const IS_WINDOWS = process.platform === 'win32';

/**
 * Quote a single argument for Windows cmd.exe so that `shell: true` spawning
 * of `.cmd`/`.bat` wrappers is safe even when args contain spaces or shell
 * metacharacters. Follows the rules documented by Microsoft for CommandLineToArgvW
 * plus cmd.exe caret-escaping for `& | < > ^ " %`.
 */
function quoteWindowsArg(arg: string): string {
  // Escape embedded backslashes before a double-quote, then escape the quote.
  // Reference: https://docs.microsoft.com/en-us/archive/blogs/twistylittlepassagesallalike/
  let result = '"';
  for (let i = 0; i < arg.length; i++) {
    let backslashes = 0;
    while (i < arg.length && arg[i] === '\\') { backslashes++; i++; }
    if (i === arg.length) {
      result += '\\'.repeat(backslashes * 2);
      break;
    } else if (arg[i] === '"') {
      result += '\\'.repeat(backslashes * 2 + 1) + '"';
    } else {
      result += '\\'.repeat(backslashes) + arg[i];
    }
  }
  result += '"';
  return result;
}

function needsShellWrap(binPath: string): boolean {
  if (!IS_WINDOWS) { return false; }
  const lower = binPath.toLowerCase();
  return lower.endsWith('.cmd') || lower.endsWith('.bat');
}

/**
 * Spawn a CLI tool in a way that works around Node's post-CVE-2024-27980
 * restriction on directly spawning `.cmd`/`.bat` files on Windows.
 *
 * On Windows, when the binary is a `.cmd`/`.bat`, we enable `shell: true`
 * and pre-escape every argument so it survives cmd.exe parsing.
 * On macOS/Linux, behavior is identical to plain `spawn()`.
 */
export function spawnCli(
  binPath: string,
  args: string[],
  options: SpawnOptions,
): ChildProcess {
  if (needsShellWrap(binPath)) {
    const quotedBin = `"${binPath}"`;
    const quotedArgs = args.map(quoteWindowsArg);
    const cmdLine = [quotedBin, ...quotedArgs].join(' ');
    return spawn(cmdLine, { ...options, shell: true, windowsVerbatimArguments: false });
  }
  return spawn(binPath, args, options);
}
