const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const login = require('./login');

const app = express();
const ip = '127.0.1.3';
const http_port = 3000;
const https_port = 3443;

const KEY_DIR = process.env.KEY_DIR || 'keys';
const CRT = process.env.CRT_NAME || 'www.acme.com.crt';
const CA_CRT = process.env.CA_CRT_NAME || 'ca.crt';
const HOSTNAME = process.env.HOSTNAME || 'www.acme.com';

const options = {
    key: fs.readFileSync(`${__dirname}/../${KEY_DIR}/www.acme.com.pem`),
    cert: fs.readFileSync(`${__dirname}/../${KEY_DIR}/${CRT}`),
    requestCert: true,
    rejectUnauthorized: false,
    ca: [ fs.readFileSync(`${__dirname}/../${KEY_DIR}/${CA_CRT}`) ]
};

const auth_options = {
    ...options,
    port: 3443,
    hostname: 'auth.acme.com',
    path: '/auth',
    method: 'POST'
}

// HTTPS Only
// Will only work if we listen on HTTP
const requireHTTPS = (req, res, next) => {
  if (!req.secure) {
      console.log(`redirect to https://${HOSTNAME}:${https_port}${req.url}`);
      return res.redirect(`https://${HOSTNAME}:${https_port}${req.url}`);
  }
  next();
}

app.use(requireHTTPS);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.post('/login', (req, res) => {
	const cert = req.connection.getPeerCertificate();
    const username = req.body.username;
    if(req.client.authorized && username === cert.subject.CN) {
        console.log("Requesting....");

        const request = https.request(auth_options, (res) => {
            console.log(res.statusCode);
            res.on('data', (data) => {
                process.stdout.write(data);
                console.log(JSON.parse(data));
            });

        });
        request.end();
        request.on('error', (e) => {
            console.error(e);

        });
    }
    else {
        res.send('Access Denied!');
        console.log(cert.subject.CN);
        console.log(username);
    }

});

app.get('/', (req, res) => {
	const cert = req.connection.getPeerCertificate();
    if(req.client.authorized) {
        res.send(login.login(cert.subject.CN));
    }
    else {
        res.send(login.totp());
    }
});

app.listen(http_port, ip, () => console.log(`HTTP on ${ip}:${http_port}`));
https.createServer(options, app).listen(https_port, ip, () => console.log(`HTTPS on ${ip}:${https_port}`));

