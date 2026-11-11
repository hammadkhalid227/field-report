# Field reports

## Run

In `server`, make .env at root and copy the contents of provided `secrets.txt` that you can download from below link.
secrets file link: https://drive.google.com/file/d/1atlUIPWm-F80vUofDoGOjOzP5ghwbjOw/view?usp=sharing

```sh
docker compose up -d
npm install
npx prisma migrate deploy
npm run dev
```

In `mobile`:

```sh
npm install
npm run android
```

On the emulator, set the server address in Settings to `http://10.0.2.2:4000`. On a phone, use your computer's address, such as `http://192.168.18.128:4000`. It can also be changed directly from mobile/src/api/config.ts.

## Test
Demo Video: https://drive.google.com/file/d/1l9wsd8Xp5ih1xvue7pDowUATyBkgtp8i/view?usp=share_link

1. Tap the add button. Write what you saw, add a photo, and save.
2. The report appears on **On this phone**, then on **On the server** after it sends.
3. In Settings, pick Drop, Refuse, Reject, or Hang, then save another report. The phone list shows what happened.
4. Reset this phone deletes reports on the phone only. The server list stays.
