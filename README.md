# www_server
A simple OAuth2-compliant authentication server, built as part of the Building Networked Systems Security (EP2520) course @ KTH. 

## Testing
In order to test, you will need a public/private pair of RSA keys. The keys for this project are encrypted using black box. 
Follow their instructions to add yourself to the keychain, and contact a current admin in order re-incrypt the file so that you can decrypt them. 


If you just want to test with your own local keys, then generate a private key and save it in a folder called `secrets` in the project dir. Using openssl:
```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -outform PEM -out public.pem
```
Then, add `KEY_DIR=secrets` to a `.env` file, so that the app loads your keys. 

Use the private key to create and sign your own certificate, and name it `www.acme.com.crt`.

Add `www.acme.com` to your hosts file, and point it to `127.0.1.3`. 

In order to successfully test the server, you will need to run the authorization and resource server as well. 






