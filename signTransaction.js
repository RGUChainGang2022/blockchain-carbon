const dhive = require("@hiveio/dhive");

const privateKey = "5JZBKM1rZD5xSRZ479aZ4wZzghoS8sPUU3wAyJ7stG6NPbjGGf7";

const privateKeyParsed = dhive.PrivateKey.fromString(privateKey);

console.log(privateKeyParsed.sign(dhive.cryptoUtils.sha256(JSON.stringify({"hi": "lol"}))).toString());