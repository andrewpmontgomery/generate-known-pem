# generate-known-pem

Generate Known PEM

This Node.js script generates RSA key-pairs in PEM format, then selects those
which map to a Chromium extension ID with a specified prefix and/or suffix.

## Quick Start

Run `node generate-known-pem.module.js` to see the options.

For example:

Run `node generate-known-pem.module.js --prefix=mega --n=3` to generate three PEM files starting with "mega".

## FAQ

### Why would you want this?

If you've worked with browser extensions on Chromium-based browsers such as Chrome or Edge,
you will be accustomed to seeing long meaningless IDs like:
- cjpalhdlnbpafiamejdnhcphjbkeiagm - uBlock Origin
- fnplhdldnhaodknidfddmkfdhlhjihpd - Scientific Calculator
- cdnapgfjopgaggbmfgbiinmmbdcglnam - Open Dyslexic

This script allows you to choose the first few characters of the ID, giving you something more friendly like:
- *block*hdlnbpafiamejdnhcphjbkeiagm
- *calc*hdldnhaodknidfddmkfdhlhjihpd
- *opend*gfjopgaggbmfgbiinmmbdcglnam

### Why can I only have letters A to P?

The characters are based on hexadecimal 0-F, but mapped to A-P:
- 0123456789abcdef - before
- abcdefghijklmnop - after

### How does this script work?

The script generates random RSA key-pairs, then derives the Extension ID that each one would create.
If the derived ID matches the sought pattern, it is saved to a .pem file.

### Can I use this in my own code?

Yes; this is written as a Node.js module, so you can just import it.

### How fast is it?

On my PC, timings are as follows:
- 1 known letter: 5 seconds
- 2 known letters: 2 minutes
- 3 known letters: 15 minutes
- 4 known letters: 2 hours
- 5 known letters: 36 hours
- 6 known letters: 1 month

### Why is it so slow?

Generating RSA keys is slow by nature; and there is no way of knowing in advance what the ID will be.

### Can I make it faster?

Yes, by running multiple instances in parallel.

### Would it run faster in .NET / Python / Rust, or with OpenSSL / ssh-keygen, etc.?

Unlikely. The bottleneck is in generating the RSA key-pairs, and most of these tools use
the same underlying operating system calls (e.g. the Win32 CryptGenKey function on Windows).

### Once I've generated a PEM file, how do I then create a CRX file?

See project https://www.npmjs.com/package/crx

### How can I submit this PEM file to the Chrome Web Store / Micosoft Edge Add-On Store?

You can't. These PEM files are only suitable for extensions distributed via Enterprise Policy or sideloaded via an installer.

### How do you distribute an extension via Enterprise Policy?

See my other project https://github.com/andrewpmontgomery/chrome-extension-store

### I have more questions

Raise an issue in Github, or email my GitHub username at gmail .com
