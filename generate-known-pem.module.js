"use strict";

/**
 * @desc Generates a key-pair in PEM format which maps to a Chromium extension ID with a specified prefix and/or suffix.
 * This is useful for creating user-friendly (and developer-friendly) IDs. Note that extension IDs can only contain letters a-p.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(new URL(import.meta.url));

process.title = "PEM Generator";

if (process.argv[1] === __filename) {
  // running as stand-alone script, so invoke main function directly
  // parse command-line arguments "--prefix" and "--suffix" and "--regexp" and "--noWrite" and "--n=999"
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^-+/, "").split("=")));
  const prefix = args.prefix ?? "";
  const suffix = args.suffix ?? "";
  const regexp = args.regexp ?? "";
  const n = Number(args.n) || 1;
  const noWrite = "noWrite" in args || "no-write" in args;
  const quiet = !!args.quiet;
  const knownArgs = ["prefix", "suffix", "regexp", "n", "no-write", "noWrite", "quiet"];
  const unknownArgs = Object.keys(args).filter((arg) => !knownArgs.includes(arg));
  if ((!prefix && !suffix && !regexp) || unknownArgs.length !== 0) {
    const shortName = path.basename(__filename);
    console.log("generate-known-pem: A tool for generating RSA key-pairs with memorable letters.");
    console.log("");
    console.log("Usage:");
    console.log(`  node ${shortName}`);
    console.log("");
    console.log("Options:");
    console.log(`  --prefix=abc??fg      Generate PEM with this prefix (? = wildcard)`);
    console.log(`  --suffix=mnop         Generate PEM with this suffix`);
    console.log(`  --regexp='^abc.*fg$'  Generate PEM matching this regexp (must be single-quoted)`);
    console.log(`  --n=99                Repeat n times`);
    console.log(`  --no-write            Print PEM to stdout, do not write file`);
    console.log(`  --quiet               Don't print anything to stdout (unless --no-write specified)`);
    console.log("");
    process.exit(1);
  }
  try {
    const regexp2 = MakeRegExp(prefix, suffix, regexp);
    for (let count = 0; count < n; count++) {
      const { appId, privateKey, publicKey } = GenerateKnownPem(regexp2, quiet);
      if (!noWrite) {
        fs.writeFileSync(appId + ".pem", privateKey);
        if (!quiet) {
          console.log(`Private key saved to ${appId}.pem`);
          console.log(`Public key: ${publicKey}`);
        }
      } else {
        console.log("");
        console.log(privateKey);
        console.log(`Public key: ${publicKey}`);
        console.log("");
        console.log(`AppId: ${appId}`);
        console.log("");
      }
    }
  } catch (err) {
    Fail(err.message);
  }
}

/**
 * Prints an error message in red
 * @param {string} message
 * @returns {void}
 */
function Fail(message) {
  console.error("\x1b[31;1m" + message + "\x1b[0m");
}

/**
 * @param {string} prefix
 * @param {string} suffix
 * @param {string|RegExp} regexp
 * @returns {RegExp}
 */
function MakeRegExp(prefix, suffix, regexp) {
  // ensure at least one argument is provided
  if (!prefix && !suffix && !regexp) {
    throw new Error("Either prefix or suffix or both or regexp must be supplied");
  }
  // ensure that prefix and suffix only have letters a-p or ? for wildcard
  for (const [key, value] of Object.entries({ prefix, suffix })) {
    const badLetters = [...value.matchAll(/[^a-p?]/g)].map((match) => match[0]).join(",");
    if (badLetters) {
      throw new Error(`Invalid argument: ${key} characters out of range [a-p]: [${badLetters}]`);
    }
  }
  if (regexp) {
    // regexp overrides prefix and suffix
    if (regexp instanceof RegExp) {
      return regexp;
    } else {
      // only very basic regexp terms are allowed: ^$-[]()?:| and letters a-p
      if ((/[^^$[\]abcdefghijklmnop()?:|.-]/).test(regexp)) {
        throw new Error("Regexp may only contain characters ^$[]()?:|.- and letters a-p'");
      }
      return new RegExp(regexp);
    }
  } else if (prefix && !suffix) {
    return new RegExp("^" + prefix.replaceAll("?", "."));
  } else if (!prefix && suffix) {
    return new RegExp(suffix.replaceAll("?", ".") + "$");
  } else {
    return new RegExp("^" + prefix.replaceAll("?", ".") + ".*" + suffix.replaceAll("?", ".") + "$");
  }
}

/**
 * @param {RegExp} regexp
 * @param {boolean} quiet
 * @returns {{ appId: string, privateKey: string, publicKey: string }}
 */
function GenerateKnownPem(regexp, quiet) {
  const matcher = (str) => regexp.test(str);
  quiet || console.log(`Start time: ${new Date()}`);
  quiet || console.log(`Generating random keys until we find one matching ${regexp.toString()}`);

  const numCharsToSeek = regexp.toString().replaceAll(/\[[^\]]*\]/g, "a").replaceAll(/[^A-Za-z]/g, "").length;
  if (numCharsToSeek > 5) {
    quiet || console.log("Warning: finding more than five characters (" + numCharsToSeek + ") will take longer than a day");
  }

  const startTime = Date.now();

  for (let loopCount = 1; true; loopCount++) {
    // generate a new random key pair
    const key = crypto.generateKeyPairSync(
      "rsa",
      {
        modulusLength: 2048,
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
        publicKeyEncoding: { type: "spki", format: "der" },
      }
    );
    // calculate the appId from the SHA256 hash of the publicKey
    const appId = crypto
      .createHash("sha256")
      .update(key.publicKey)
      .digest()
      .toString("hex")
      .split("")
      .map((x) => (parseInt(x, 16) + 0x0a).toString(26))
      .join("")
      .slice(0, 32);
    // after a few keys are generated, calculate speed and estimated end time
    if (loopCount === 25) {
      const elapsed = Date.now() - startTime;
      const loopsPerSecond = Math.round((1000000 * loopCount / elapsed)) / 1000;
      quiet || console.log(`Speed: ${loopsPerSecond} keys generated per second`);
      const searchSpace = Math.pow(16, numCharsToSeek);
      quiet || console.log(`Search space: ${searchSpace.toLocaleString("en")} keys`);
      const estimatedMs = (searchSpace / loopsPerSecond) * 1000;
      const estimatedTime = (new Date(Date.now() + estimatedMs));
      quiet || console.log(`Estimated end time: ${estimatedTime}`);
	  quiet || console.log("  Generating...");
    }
    // log to console intermittently
    const isRoundNumber = Number.isInteger(loopCount / 10) && loopCount > 30;
    if (isRoundNumber) {
      const day = (new Date()).toDateString().substring(0, 3);
      const time =  (new Date()).toISOString().substring(11,16);
	  quiet || console.log(`\x1b[F  Generated #${loopCount.toLocaleString("en").padStart(10)} at ${time} ${day}: ${appId}\r`);
    }
    if (matcher(appId)) {
      const timeTaken = (new Date(Date.now() - startTime)).toISOString().substr(11, 8);
      quiet || console.log();
      quiet || console.log(`Time taken: ${timeTaken}`);
      const publicKeyPem = crypto.createPublicKey({ key: key.publicKey, format: "der", type: "spki" }).export({ type: "spki", format: "pem" });
      const publicKey = publicKeyPem.split("\n").slice(1, 8).join("");
      return { appId: appId, privateKey: key.privateKey, publicKey: publicKey };
    }
  }
}

export default GenerateKnownPem;
