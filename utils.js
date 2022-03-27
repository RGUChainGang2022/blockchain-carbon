const PrivateKey = require("@hiveio/hive-js/lib/auth/ecc/src/key_private");
const dhive = require("@hiveio/dhive");
const crypto = require("crypto");
const config = require("./config.json");
const FlatDB = require('flat-db');

// configure path to storage dir
FlatDB.configure({
  dir: './storage',
});
// since now, everything will be saved under ./storage

// create Movie collection with schema
const Blocks = new FlatDB.Collection('movies', {
  block: {},
  witness: "",
  signature: "",
  number: 0,
});



// Generate a new set of hive private keys
const generateMasterKey = () => {
  const masterKey = crypto.randomBytes(32);
  return PrivateKey.fromBuffer(masterKey);
};

const fromWif = (wif) => {
  return PrivateKey.fromWif(wif);
};

function addBlockToChain(json = null) {
  if (json === null) {
    return [false, "ERROR_NO_TRANSACTION"];
  }

  let previousBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";

  const count = Blocks.count();

  if (count > 0) {
    const previousBlock = Blocks.find({number: count - 1}).run();

    // create a sha-256 hash of the previous block
    const sha256Hash = crypto.createHash("sha256");

    // hash the string
    // and set the output format
    previousBlockHash = sha256Hash.update(JSON.stringify(previousBlock)).digest("hex");
  }

  if (json.data && json.signature) {
    try {
      // Use dhive to recover the public key from the signature
      const actualKey = dhive.Signature.fromString(json.signature).recover(dhive.cryptoUtils.sha256(JSON.stringify(json.data)));

      if (actualKey.toString() !== config.network_key_public) {
        return [false, "ERROR_INVALID_SIGNATURE"];
      }
    } catch (e) {
      return [false, "ERROR_INVALID_SIGNATURE"];
    }

    const block = {
      block: {
        block_number: Blocks.count(),
        previous_block: previousBlockHash,
        timestamp: json.timestamp,
        transactions: [
          {data: json.data, signature: json.signature}
        ],
      },
      witness: config.node_identity
    };

    const toSign = JSON.stringify(block.block);
    // Add signature to block (from this node)
    const privateKeyParsed = dhive.PrivateKey.fromString(config.node_key);
    block.signature = privateKeyParsed.sign(dhive.cryptoUtils.sha256(toSign)).toString();
    block.number = Blocks.count();

    // Add block to chain
    Blocks.add(block);

    return [true, "OK"];
  } else {
    return [false, "ERROR_MISSING_FIELDS"];
  }
}

function signatureMatches(signature, publicKeyWif, data) {
  try {
    const actualKey = dhive.Signature.fromString(signature).recover(dhive.cryptoUtils.sha256(data));

    console.log(actualKey.toString(), publicKeyWif, data);

    return actualKey.toString() === publicKeyWif;
  } catch (e) {
    return false;
  }
}

module.exports = {generateMasterKey, fromWif, Blocks, addBlockToChain, signatureMatches};