# zip-tui

> TUI-driven archive command dispatcher for macOS & Linux. Built on Ink + Bun. Speaks zip / 7z / tar.gz / tar.bz2 / tar.xz / tar.zst / gz / bz2.

## Install

Download a binary from [Releases](https://github.com/LanceLRQ/zip-tui/releases) for your platform and put it in your `$PATH` as `zt`:

```bash
chmod +x zt && mv zt ~/.local/bin/
```

On Alpine / musl systems, install [Bun](https://bun.sh) and run from source instead:

```bash
git clone https://github.com/LanceLRQ/zip-tui.git
cd zip-tui && bun install && bun run src/index.ts
```

## Usage

```
zt                       # open TUI main menu
zt a out.zip src/ docs/  # compress
zt x archive.zip -o /tmp # extract
zt l archive.7z          # list archive contents
zt deps                  # check installed dependencies
zt config                # print config
zt --dry-run a out.zip src/   # print command without executing
```

In scripts or non-TTY contexts, `zt` will never open the TUI; missing args cause `exit 2`.

## License

MIT
