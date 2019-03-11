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

const rs_options = {
    ...options,
    port: 3443,
    hostname: 'rs.acme.com',
    method: 'GET'
};

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
    const password = req.body.password;
    if(req.client.authorized && username === cert.subject.CN) {

        const payload = JSON.stringify({
            grant_type: "password",
            username: username,
            password: password,
            client_id: "test_client",
            client_secret: "secret"
        });
        const req_options = { ...auth_options,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length
            }
        };
        const request = https.request(req_options, (auth_res) => {
            auth_res.on('data', (data) => {
                const response = JSON.parse(data);
                const req_options = {
                    ...rs_options,
                    path: `/${username}/files`,
                    headers: {
                        'Authorization': `Bearer ${response.access_token}`
                    }
                };
                console.log(req_options);
                const request = https.request(req_options, (rs_res) => {
                    rs_res.on('data', (data) => {

                        res.send(JSON.parse(data));
                    });
                });
                request.end();
                request.on('error', (e) => {
                    console.error(e);
                });

            });
        });
        request.write(payload);
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

