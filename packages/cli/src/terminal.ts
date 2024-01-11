import readline from 'readline';

// low-level terminal interactions
// Copied and adapted from: https://github.com/npkgz/cli-progress/blob/e2347a35a6c0922cfb0a077cf5ed21696fba46da/lib/terminal.js
export class Terminal {
  stream: typeof process.stdin;
  enableRl: boolean;
  linewrap: boolean;
  dy: number;
  constructor(outputStream: typeof process.stdin, enableRl = true) {
    this.stream = outputStream;
    this.enableRl = this.stream.isTTY && enableRl;

    // default: line wrapping enabled
    this.linewrap = true;

    // current, relative y position
    this.dy = 0;
  }

  // save cursor position + settings
  cursorSave() {
    if (!this.enableRl) {
      return;
    }

    // save position
    this.stream.write('\x1B7');
  }

  // restore last cursor position + settings
  cursorRestore() {
    if (!this.enableRl) {
      return;
    }

    // restore cursor
    this.stream.write('\x1B8');
  }

  // show/hide cursor
  cursor(enabled: boolean) {
    if (!this.enableRl) {
      return;
    }

    if (enabled) {
      this.stream.write('\x1B[?25h');
    } else {
      this.stream.write('\x1B[?25l');
    }
  }

  // change cursor positionn
  cursorTo(x = 0, y = 0) {
    if (!this.enableRl) {
      return;
    }

    // move cursor absolute
    readline.cursorTo(this.stream, x, y);
  }

  // change relative cursor position
  cursorRelative(dx = 0, dy = 0) {
    if (!this.enableRl) {
      return;
    }

    // store current position
    this.dy = this.dy + dy;

    // move cursor relative
    readline.moveCursor(this.stream, dx, dy);
  }

  // relative reset
  cursorRelativeReset() {
    if (!this.enableRl) {
      return;
    }

    // move cursor to initial line
    readline.moveCursor(this.stream, 0, -this.dy);

    // first char
    //readline.cursorTo(this.stream, 0, 0);

    // reset counter
    this.dy = 0;
  }

  // clear to the right from cursor
  clearRight() {
    if (!this.enableRl) {
      return;
    }

    readline.clearLine(this.stream, 1);
  }

  // clear the full line
  clearLine() {
    if (!this.enableRl) {
      return;
    }

    readline.clearLine(this.stream, 0);
  }

  // clear everyting beyond the current line
  clearBottom() {
    if (!this.enableRl) {
      return;
    }

    readline.clearScreenDown(this.stream);
  }

  // add new line; increment counter
  newline() {
    this.stream.write('\n');
    this.dy++;
  }

  // write content to output stream
  // @TODO use string-width to strip length
  write(s: string, rawWrite = false) {
    // line wrapping enabled ? trim output
    // this is just a fallback mechanism in case user enabled line-wrapping via options or set it to auto
    if (this.linewrap === true && rawWrite === false) {
      this.stream.write(s.substr(0, this.getWidth()));

      // standard behaviour with disabled linewrapping
    } else {
      this.stream.write(s);
    }
  }

  // control line wrapping
  lineWrapping(enabled: boolean) {
    if (!this.enableRl) {
      return;
    }

    // store state
    this.linewrap = enabled;
    if (enabled) {
      this.stream.write('\x1B[?7h');
    } else {
      this.stream.write('\x1B[?7l');
    }
  }

  // tty environment ?
  isTTY() {
    return this.stream.isTTY === true;
  }

  // get terminal width
  getWidth() {
    // set max width to 80 in tty-mode and 200 in notty-mode
    return (this.stream as any).columns || (this.enableRl ? 80 : 200);
  }
}
